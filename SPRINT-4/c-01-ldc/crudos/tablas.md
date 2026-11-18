<!-- t_modulos -->
| Módulo | Frontend (TS/TSX) | Backend (Python) | Total |
| --- | ---: | ---: | ---: |
| M1 Productos y Carta (`productos/`) | 3.237 | 1.158 | 4.395 |
| M2 Menús y Promociones (`menus/`) | 3.676 | 1.279 | 4.955 |
| M3 Salón y Mozos (`salon/`) | 2.854 | 785 | 3.639 |
| M4 Atención al Público (`atencion/`) | 3.380 | 1.096 | 4.476 |
| M5 Reservas (`reservas/`) | 2.467 | 671 | 3.138 |
| M6 Pagos (`pagos/`) | 2.112 | 836 | 2.948 |
| Usuarios, inicio de sesión y roles (`usuarios/`, solo backend) | 0 | 274 | 274 |
| Compartido y raíz (`shared/`, `app/*.py`, `src/`) | 6.327 | 503 | 6.830 |
| **Total de producción (Python y TypeScript/TSX)** | **24.053** | **6.602** | **30.655** |
| CSS (`frontend/src/index.css`), fila aparte | 206 | - | 206 |
| Total de producción incluyendo CSS | 24.259 | 6.602 | 30.861 |

<!-- t_lenguaje -->
| Ámbito y lenguaje | Archivos con líneas | En blanco | Comentarios | Código (LDC) | No vacías (comentarios + código) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Producción, frontend: TypeScript/TSX | 333 | 2.474 | 799 | 24.053 | 24.852 |
| Producción, frontend: CSS | 1 | 37 | 8 | 206 | 214 |
| Producción, backend: Python | 66 | 1.920 | 640 | 6.602 | 7.242 |
| **Producción, Python + TypeScript/TSX** | **399** | **4.394** | **1.439** | **30.655** | **32.094** |
| Herramientas, `backend/scripts/`: Python | 4 | 210 | 89 | 1.134 | 1.223 |
| Pruebas, frontend: TypeScript/TSX | 164 | 4.709 | 153 | 21.802 | 21.955 |
| Pruebas, backend: Python | 102 | 7.533 | 894 | 21.123 | 22.017 |

<!-- t_compartido_fe -->
| Carpeta | Contenido | Archivos con líneas | LDC |
| --- | --- | ---: | ---: |
| `shared/components/*.tsx` | páginas y componentes comunes (`ComponentesPage`, `ReportesPage`, `Inicio`, páginas de error, etc.) | 15 | 1.683 |
| `shared/components/ui` | biblioteca de componentes visuales (botón, tabla, diálogo, etc.) | 41 | 1.615 |
| `shared/components/inicio` | página de inicio con plano del local y caja del día (S4-06) | 19 | 1.535 |
| `shared/auth` | inicio de sesión, sesión, guardas de ruta y permisos (HU-TR-01) | 12 | 543 |
| `shared/components/layout` | estructura general: barra superior, menú lateral, menú de sesión | 8 | 480 |
| Raíz de `src/` (`App.tsx`, `main.tsx`, `vite-env.d.ts`) | punto de entrada y configuración de la aplicación | 3 | 161 |
| `shared/hooks` | hooks comunes | 5 | 125 |
| `shared/api` | cliente HTTP común | 2 | 117 |
| `shared/lib` | utilidades | 3 | 52 |
| `shared/types` | tipos comunes | 1 | 16 |
| **Total frontend compartido (TS/TSX)** |  | **109** | **6.327** |

<!-- t_compartido_be -->
| Archivo o carpeta | LDC |
| --- | ---: |
| `backend/app/config.py` | 12 |
| `backend/app/database.py` | 35 |
| `backend/app/main.py` | 98 |
| `backend/app/shared/base_repository.py` | 0 (solo comentarios) |
| `backend/app/shared/contratos` | 54 |
| `backend/app/shared/credenciales.py` | 19 |
| `backend/app/shared/excepciones.py` | 5 |
| `backend/app/shared/models` | 56 |
| `backend/app/shared/paginacion.py` | 18 |
| `backend/app/shared/pdf.py` | 127 |
| `backend/app/shared/permisos.py` | 50 |
| `backend/app/shared/seguridad.py` | 29 |
| **Total backend compartido** | **503** |

<!-- t_pruebas -->
| Módulo | Frontend (`*.test.ts`, `*.test.tsx`) | Backend (`tests/`) | Total |
| --- | ---: | ---: | ---: |
| M1 Productos y Carta | 3.853 | 3.484 | 7.337 |
| M2 Menús y Promociones | 1.460 | 2.510 | 3.970 |
| M3 Salón y Mozos | 4.214 | 2.575 | 6.789 |
| M4 Atención al Público | 2.539 | 3.893 | 6.432 |
| M5 Reservas | 5.329 | 4.991 | 10.320 |
| M6 Pagos | 1.517 | 1.798 | 3.315 |
| Usuarios, inicio de sesión y roles | 0 | 408 | 408 |
| Compartido y raíz (incluye `frontend/src/test/` y los `conftest.py`) | 2.890 | 1.274 | 4.164 |
| Pruebas de las herramientas (`backend/tests/scripts/`) | - | 190 | 190 |
| **Total de pruebas** | **21.802** | **21.123** | **42.925** |

<!-- t_herramientas_nota -->
`backend/scripts/`: 4 archivos con líneas (`cargar_datos_demo.py`, `crear_encargado.py`, `datos_demo.py`, `historial_demo.py`), 1.134 líneas de código.

<!-- t_est_pf -->
| Módulo | ILF | EIF | EI | EO | EQ | PFSA |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| M1 – Carta | 2 | 0 | 12 | 1 | 2 | 81 |
| M2 – Menús y promociones | 2 | 0 | 9 | 1 | 0 | 61 |
| M3 – Sectores, mesas y mozos | 3 | 0 | 9 | 1 | 3 | 83 |
| M4 – Clientes y comandas | 2 | 0 | 8 | 1 | 2 | 65 |
| M5 – Reservas | 1 | 0 | 5 | 1 | 1 | 39 |
| M6 – Facturación y cobros | 3 | 0 | 5 | 1 | 2 | 63 |
| **TOTAL** | **13** | **0** | **48** | **6** | **10** | **392** |

<!-- t_est_ldc -->
| Capa | Reparto | PFA asignados | LDC/PF | LDC |
| --- | ---: | ---: | ---: | ---: |
| Frontend | 45 % | 183,46 | 47 | 8.622,43 |
| Backend | 45 % | 183,46 | 30 | 5.503,68 |
| Base de datos | 10 % | 40,77 | 15 | 611,52 |
| **TOTAL** | 100 % | **407,68** |  | **14.737,63** |

<!-- t_comparacion -->
| Concepto | LDC estimadas | LDC finales (producción) | Diferencia | Variación |
| --- | ---: | ---: | ---: | ---: |
| Frontend (TypeScript/TSX) frente al 45 % del frontend | 8.622 | 24.053 | +15.431 | +179,0 % |
| Backend (Python) frente al backend + la base de datos estimados | 6.115 | 6.602 | +487 | +8,0 % |
| **Total de producción (Python + TypeScript/TSX)** | 14.738 | 30.655 | +15.917 | +108,0 % |
| Total de producción incluyendo CSS | 14.738 | 30.861 | +16.123 | +109,4 % |

<!-- t_comparacion_be -->
| Desglose informativo del backend | LDC estimadas | LDC finales | Diferencia | Variación |
| --- | ---: | ---: | ---: | ---: |
| Backend sin modelos de datos frente al backend estimado | 5.504 | 6.088 | +584 | +10,6 % |
| Modelos de datos (`models.py`, `shared/models/`) frente a la base de datos estimada | 612 | 514 | -98 | -15,9 % |

<!-- t_reparto -->
| Capa | Reparto supuesto | Reparto real (LDC de producción) |
| --- | ---: | ---: |
| Frontend | 45 % | 78,5 % |
| Backend | 45 % | 21,5 % |
| Base de datos | 10 % | no se mide aparte (los modelos están en el backend; ver nota) |

<!-- t_ldc_pf -->
| Capa | LDC/PF supuestas | LDC/PF reales | Real / supuesto |
| --- | ---: | ---: | ---: |
| Frontend (TypeScript/TSX) | 47 | 131,1 | 2,79x |
| Backend (Python), sobre el 45 % de los PFA | 30 | 36,0 | 1,20x |
| Backend + base de datos, sobre el 55 % de los PFA | 27,3 | 29,4 | 1,08x |
| **Total (sobre 407,68 PFA)** | 36,1 | 75,2 | 2,08x |

<!-- t_modulo_pf -->
| Módulo | PFSA (documento) | PFA (PFSA x 1,04) | LDC de producción (frontend + backend del módulo) | LDC por PFA |
| --- | ---: | ---: | ---: | ---: |
| M1 Productos y Carta | 81 | 84,24 | 4.395 | 52,2 |
| M2 Menús y Promociones | 61 | 63,44 | 4.955 | 78,1 |
| M3 Salón y Mozos | 83 | 86,32 | 3.639 | 42,2 |
| M4 Atención al Público | 65 | 67,60 | 4.476 | 66,2 |
| M5 Reservas | 39 | 40,56 | 3.138 | 77,4 |
| M6 Pagos | 63 | 65,52 | 2.948 | 45,0 |

<!-- t_alcance -->
| Alcance no incluido en la estimación | Frontend (TS/TSX) | Backend (Python) | Total | Evidencia |
| --- | ---: | ---: | ---: | --- |
| Inicio de sesión y roles (HU-TR-01) | 1.009 | 631 | 1.640 | issue #172; PR #246 y #249 |
| Página de inicio con plano del local y caja del día (S4-06) | 1.478 | 74 | 1.552 | issue #213; PR #233 |
| Correcciones estéticas del frontend: estilo común, modo oscuro, menú de sesión, rediseño (S4-08) | 2.458 | 0 | 2.458 | issue #251; 12 commits directos en `develop`, sin PR |
| Mozo en la comanda, selector y reasignación (S4-04) | 966 | 92 | 1.058 | issue #225; PR #244 y #250 |
| Selectores en la comanda y enlaces entre pantallas (S4-03) | 420 | 0 | 420 | issue #224; PR #232 |
| Producto listo en cocina (HU-M4-12) | 129 | 70 | 199 | issue #242; PR #248 |
| Promociones aplicadas en la comanda y la factura (S4-02) | 0 | 102 | 102 | issue #223; PR #235 |
| Panel de credenciales de prueba en el inicio de sesión | 174 | 0 | 174 | commit directo `86bb44f` |
| **Total del alcance no incluido** | **6.634** | **969** | **7.603** | más 132 de CSS (todas en S4-08) |

<!-- t_reportes -->
| Reporte | PR | Frontend (TS/TSX) | Backend (Python) | Total |
| --- | ---: | ---: | ---: | ---: |
| HU-M1-15 productos más vendidos | #220 | 325 | 393 | 718 |
| HU-M2-10 impacto de promociones | #237 | 364 | 333 | 697 |
| HU-M3-13 mesas atendidas y ventas por mozo | #234 | 297 | 165 | 462 |
| HU-M4-11 comandas y ticket promedio | #247 | 228 | 146 | 374 |
| HU-M5-07 reservas y ausentismo | #229 | 200 | 142 | 342 |
| HU-M6-08 recaudación y deuda pendiente | #241 | 262 | 160 | 422 |
| **Total de los seis reportes** |  | **1.676** | **1.339** | **3.015** |

<!-- t_descomposicion -->
| Origen de las LDC de producción | Frontend (TS/TSX) | Backend (Python) | Total |
| --- | ---: | ---: | ---: |
| Esqueleto integrado el 21/10 (PR #154 frontend, PR #153 backend), antes de la estimación | 3.841 | 84 | 3.925 |
| Alcance no incluido en la estimación (tabla anterior) | 6.634 | 969 | 7.603 |
| Resto, por diferencia (las HU estimadas, sus ajustes y los reportes) | 13.578 | 5.549 | 19.127 |
| **Total de producción medido** | **24.053** | **6.602** | **30.655** |

<!-- t_resto_vs_est -->
| Comparación solo del «resto» | LDC estimadas | LDC del resto | Diferencia | Variación |
| --- | ---: | ---: | ---: | ---: |
| Frontend: resto frente a la estimación del frontend | 8.622 | 13.578 | +4.956 | +57,5 % |
| Backend: resto frente a la estimación del backend + base de datos | 6.115 | 5.549 | -566 | -9,3 % |
| Total: resto frente a la estimación total | 14.738 | 19.127 | +4.389 | +29,8 % |

