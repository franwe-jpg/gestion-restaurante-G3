#!/usr/bin/env bash
# Mueve en el tablero (GitHub Project) las tarjetas de los issues de un PR integrado (S1-10).
#
# Busca los issues de dos formas:
#   1. El ID de la tarea en la rama: feature/S1-10-gitflow-ci -> issue cuyo título empieza con "S1-10 ".
#   2. Los issues citados en el cuerpo del PR con Closes, Fixes, Resolves o Refs.
#
# Variables de entorno:
#   GH_TOKEN        token con permiso sobre el proyecto (scope "project")
#   REPO            repositorio, en formato dueño/nombre
#   PROJECT_OWNER   dueño del proyecto
#   PROJECT_NUMBER  número del proyecto
#   STATUS_NAME     estado al que se mueven las tarjetas (por ejemplo, "En Testing")
#   HEAD_REF        rama del PR
#   PR_BODY         cuerpo del PR
#   DRY_RUN         "1" para mostrar qué haría sin modificar el tablero
set -euo pipefail

: "${REPO:?Falta REPO}" "${PROJECT_OWNER:?Falta PROJECT_OWNER}" "${PROJECT_NUMBER:?Falta PROJECT_NUMBER}"
: "${STATUS_NAME:?Falta STATUS_NAME}" "${HEAD_REF:?Falta HEAD_REF}"

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "::error::Falta el token del tablero (secreto PROJECT_TOKEN). Ver SPRINT-1/S1-10-gitflow-ci.md."
  exit 1
fi

issues=()

if [[ "$HEAD_REF" =~ ^feature/(S[0-9]+-[A-Za-z0-9]+)- ]]; then
  task_id="${BASH_REMATCH[1]}"
  mapfile -t -O "${#issues[@]}" issues < <(
    gh issue list --repo "$REPO" --state all --search "\"$task_id\" in:title" --limit 20 \
      --json number,title --jq ".[] | select(.title | startswith(\"$task_id \")) | .number"
  )
fi

mapfile -t -O "${#issues[@]}" issues < <(
  printf '%s\n' "${PR_BODY:-}" |
    grep -ioE '\b(close[sd]?|fix(e[sd])?|resolve[sd]?|refs?)\b.*' |
    grep -oE '#[0-9]+' | tr -d '#' || true
)

mapfile -t issues < <(printf '%s\n' "${issues[@]}" | grep -E '^[0-9]+$' | sort -un || true)

if [[ ${#issues[@]} -eq 0 ]]; then
  echo "::notice::No se encontró el issue de la rama $HEAD_REF ni issues citados en el PR."
  exit 0
fi

project_id=$(gh project view "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --format json --jq .id)
status_field=$(gh project field-list "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --format json \
  --jq '.fields[] | select(.name == "Status")')
field_id=$(jq -r .id <<<"$status_field")
option_id=$(jq -r --arg s "$STATUS_NAME" '.options[] | select(.name == $s) | .id' <<<"$status_field")

if [[ -z "$option_id" ]]; then
  echo "::error::El tablero no tiene el estado «$STATUS_NAME»."
  exit 1
fi

# shellcheck disable=SC2016 # las variables son de GraphQL, no de bash
item_query='query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) { projectItems(first: 20) { nodes { id project { id } } } }
  }
}'

for number in "${issues[@]}"; do
  if ! item_id=$(gh api graphql -f query="$item_query" -f owner="${REPO%/*}" -f name="${REPO#*/}" \
    -F number="$number" --jq ".data.repository.issue.projectItems.nodes[]
      | select(.project.id == \"$project_id\") | .id" 2>/dev/null); then
    echo "::warning::#$number no es un issue; se omite."
    continue
  fi

  if [[ -z "$item_id" ]]; then
    echo "::warning::El issue #$number no está en el tablero; se omite."
    continue
  fi

  if [[ "${DRY_RUN:-}" == "1" ]]; then
    echo "[prueba] #$number se movería a «$STATUS_NAME» (item $item_id)."
    continue
  fi

  gh project item-edit --id "$item_id" --project-id "$project_id" \
    --field-id "$field_id" --single-select-option-id "$option_id" >/dev/null
  echo "::notice::Issue #$number movido a «$STATUS_NAME»."
done
