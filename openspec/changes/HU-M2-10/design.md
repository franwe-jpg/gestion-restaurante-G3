# Diseño: HU-M2-10 (reporte de impacto de promociones)

## Backend

```text
menus.router
  GET /reportes/impacto-promociones
        |
        v
menus.service.generar_reporte_impacto_promociones
  -> menus.reporte.validar_periodo / validar_promocion
  -> menus.repository.obtener_promocion
  -> menus.reporte.intervalo_utc
  -> atencion.service.sumar_ventas_de_promocion_por_producto_y_fecha
  -> menus.reporte.armar_reporte
```

- `atencion.repository` agrupa por `producto_id`, fecha local y si la línea usó la promoción. La
  consulta no confirma ni modifica datos.
- `menus.reporte` es puro: agrupa cantidades, cuenta días y calcula promedios y variación.
- `menus.schemas` expone decimales como texto con dos decimales, igual que los demás reportes.
- La fecha local se obtiene con el desplazamiento `-3` sobre `Comanda.fecha_hora`.

## Frontend

- `api.ts` arma la URL con `URLSearchParams`.
- `useReporteImpactoPromociones` carga todas las promociones (incluidas las deshabilitadas) y
  valida los filtros antes de llamar a la API.
- `ReporteImpactoPromocionesTabla` usa `DataTable` y formatea promedios y variación con `es-AR`.
- La página muestra el aviso de sin datos, el nombre de la promoción y las notas de 100 %
  promocional y de estado deshabilitado.

## Decisiones de cálculo

- Los días de promoción se calculan por calendario (`dias_programados`): fechas del período que
  caen dentro de la vigencia y en un día de la semana de la promoción, tengan o no ventas.
- `dias_con_ventas_promocion` se informa por producto como dato de actividad, pero no se usa como
  divisor.
- Si la promoción tiene franja horaria, la exposición se mide en horas: horas programadas contra
  horas restantes del período. Si no, se mide en días.
- La comparación es contra todas las demás ventas del producto en el período.
- La métrica principal es la diferencia absoluta (`durante - fuera`) y el impacto estimado
  (`diferencia * exposición con promoción`).
- La variación porcentual se calcula solo si la base fuera alcanza 1 unidad/día o 0,10
  unidades/hora; si no, queda nula y la UI muestra «—».
- Si la promoción no tuvo ninguna venta, no se emiten líneas aunque haya ventas regulares.

## Supuestos

- S1: «días fuera» = días del período no programados para la promoción.
- S2: «fuera de la promoción» incluye líneas con otra promoción.
- S3: productos sin ventas en el período no generan fila.
- S4: no se implementa PDF.
- S5: el umbral de la variación porcentual es una decisión de legibilidad, no estadística.
