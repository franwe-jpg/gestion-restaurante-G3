export type Tema = 'claro' | 'oscuro';

const CLAVE_TEMA = 'gestion-restaurante.tema';

/** Preferencia guardada o, si no hay, la del sistema. */
export function temaInicial(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado === 'claro' || guardado === 'oscuro') return guardado;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  } catch {
    return 'claro';
  }
}

export function temaActual(): Tema {
  return document.documentElement.classList.contains('dark') ? 'oscuro' : 'claro';
}

/** Aplica el tema al documento y recuerda la elección. */
export function aplicarTema(tema: Tema): void {
  document.documentElement.classList.toggle('dark', tema === 'oscuro');
  try {
    localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    /* Sin acceso a localStorage: el tema vale solo para esta sesión. */
  }
}

/** Aplica el tema guardado antes de montar React, sin persistir la preferencia del sistema. */
export function aplicarTemaInicial(): void {
  document.documentElement.classList.toggle('dark', temaInicial() === 'oscuro');
}
