# Estado final de tareas y contrato de la API

Todas las tareas están **probadas y unidas a `main`**. Las historias (HU) y pruebas (F-xx, S-xx,
I-xx) corresponden a los Informes 1 y 2. El detalle de las decisiones está en
[docs/decisiones.md](decisiones.md) y el flujo Git en [docs/git.md](git.md).

## Responsables

| Área | Responsable | Archivos principales |
|---|---|---|
| Backend | Agustín Insunsa | `server/src/routes/`, `server/src/controllers/`, `server/src/middleware/`, `server/src/db.js` |
| Base de datos | Benjamín Anabalón | `database/schema.sql`, `database/seed.sql` |
| ERP simulado | Benjamín Anabalón | `erp-mock/` |
| Frontend 1 | Robert Ramírez | `Login.jsx`, `MisTrabajos.jsx`, `DetalleOrden.jsx`, `EscanerQR.jsx`, `Inicio.jsx`, `Estado.jsx`, `Administracion.jsx`, `index.css` |
| Frontend 2 | Aaron Ponse | `ChecklistInsumos.jsx`, `EvidenciasFirma.jsx`, `Resumen.jsx`, `Presupuesto.jsx` |
| Coordinación | Sergio | `README.md`, `docs/`, `scripts/verificar-comentarios.js` |

## Base construida

- [x] Repositorio con estructura por responsables y README general.
- [x] Servidor Express con `/api/v1/health`, `/api/v1/health/db` y `/api/v1/health/erp`.
- [x] Cliente React + Vite con rutas, estilos de alto contraste y PWA instalable.
- [x] PostgreSQL con 16 tablas (`database/schema.sql`) y datos ficticios (`database/seed.sql`).
- [x] Conexión a PostgreSQL con `DATABASE_URL` o variables `DB_*` (`server/src/db.js`).
- [x] Función `pedir` con token, sesión, cola offline y reintentos (`client/src/api/api.js`).
- [x] Contraseñas con bcrypt, sesión con JWT y bloqueo tras 5 intentos fallidos.

## Backend / API

- [x] **B1.** Middleware `verificarToken` y `verificarRol` en `server/src/middleware/auth.js`.
- [x] **B2. HU-01.** Login y perfil en `auth.routes.js` / `auth.controller.js`. Pruebas F-01, F-02, S-01.
- [x] **B3. HU-02.** Mis trabajos filtrados por el técnico del token, detalle y búsqueda por QR. Prueba F-03.
- [x] **B4. HU-03.** Iniciar y finalizar servicio, con validación de ítems obligatorios. Pruebas F-04, F-05.
- [x] **B5. HU-07.** Envío al ERP con estado `PENDIENTE`/`ENVIADO`/`ERROR` y reintento sin duplicar. Prueba F-10.
- [x] **B6. HU-08.** Presupuestos sin precios para el técnico y aprobación/rechazo para administración. Prueba F-11.
- [x] **B7. HU-11.** Resumen de administración y listado de hojas con `verificarRol('administrador')`.

## Datos e integración

- [x] **D1.** ERP simulado en `erp-mock/`, puerto 4000, idempotente y con `FALLAR=1` para probar reintentos.
- [x] **D2. HU-04.** Plantilla de checklist y guardado de respuestas. Prueba F-06.
- [x] **D3. HU-05.** Búsqueda de materiales y registro de consumos con `id_consumo` idempotente. Prueba F-07.
- [x] **D4. HU-05/HU-06.** Evidencias con `id_evidencia` idempotente, imagen en base64 y archivo en `UPLOADS_DIR`. Pruebas F-08, F-09, S-09.
- [x] **D5.** Dueño del esquema: solo Benjamín edita `schema.sql` y `seed.sql`.
- [x] **D6.** Campos `codigo_hoja_erp` y `fecha_envio_erp`, índices y constraints de integridad.

## Frontend 1

- [x] **F1-1.** Sesión: token guardado y enviado en cada petición.
- [x] **F1-2. HU-01.** `Login.jsx` con RUT, contraseña y mensaje de error. Pruebas F-01, F-02.
- [x] **F1-3. HU-02.** `MisTrabajos.jsx` con sus órdenes y paso al detalle. Prueba F-03.
- [x] **F1-4. HU-03.** `DetalleOrden.jsx` con `crypto.randomUUID()` al iniciar la hoja e inicio/fin. Pruebas F-04, F-05.
- [x] **F1-5. HU-09.** Botones grandes, alto contraste y uso con una mano (`index.css`). Prueba F-14.
- [x] **F1-6. HU-10.** `EscanerQR.jsx` con `BarcodeDetector` e ingreso manual de respaldo.
- [x] **F1-7.** PWA: `manifest.webmanifest`, `sw.js`, iconos y service worker registrado en producción.
- [x] **F1-8.** `Estado.jsx` comprueba servidor, base de datos y ERP.
- [x] **F1-9. HU-11.** `Administracion.jsx` con resumen, hojas y aprobación de presupuestos.

## Frontend 2

- [x] **F2-1. HU-04/HU-05.** `ChecklistInsumos.jsx`: ítems obligatorios, búsqueda y consumos.
- [x] **F2-2. HU-05/HU-06.** `EvidenciasFirma.jsx`: fotos, ubicación y firma en canvas con nombre y RUT. Pruebas F-08, F-09.
- [x] **F2-3. HU-07.** `Resumen.jsx`: revisa todo, envía al ERP y permite reintentar. Prueba F-10.
- [x] **F2-4. HU-08.** `Presupuesto.jsx`: ítems sin precios y estado de revisión. Prueba F-11.

## Coordinación

- [x] Lista de tareas con responsable y estado en este archivo.
- [x] Flujo completo probado: login → orden → servicio → checklist → materiales → fotos → firma → resumen → ERP.
- [x] `docs/decisiones.md` actualizado.
- [x] `docs/despliegue.md` con Vercel + Railway por CLI.
- [x] `docs/estandar-proyectos-futuros.md` con la plantilla para repetir el proceso.
- [x] Informe final y ensayo de entrevista: guía en `docs/guia-de-estudio.md`.

## Datos de prueba (después de `npm run db:reset`)

Contraseña de todos: `Gamma2026!`

| Usuario | Rol | RUT para ingresar | Órdenes asignadas |
|---|---|---|---|
| Carlos Mendoza | técnico | `11.111.111-1` | 3 (OT-8842, OT-8843, OT-8844) |
| Roberto Gómez | técnico | `22.222.222-2` | 2 (OT-8845, OT-8846) |
| Marcela Soto | administrador | `33.333.333-3` | - |
| Cuenta de servicio ERP | erp | `SERVICIO-ERP` | - |

## Contrato de la API

Todas las rutas empiezan con `/api/v1`. Salvo `health` y `auth/login`, exigen
`Authorization: Bearer <token>`. Las rutas de administración exigen además rol `administrador`.

| Ruta | Qué hace | Entra | Sale |
|---|---|---|---|
| `GET /health` | Estado del servidor | - | `{ status }` |
| `GET /health/db` | Estado de PostgreSQL | - | `{ status }` |
| `GET /health/erp` | Estado del ERP simulado | - | `{ status }` |
| `POST /auth/login` | Iniciar sesión (HU-01) | `{ rut, password }` | `{ token, usuario }` o 401 `{ mensaje }` |
| `GET /auth/perfil` | Datos del usuario del token | - | `{ usuario }` |
| `GET /ordenes` | Mis trabajos (HU-02) | - | Lista de órdenes asignadas |
| `GET /ordenes/por-qr/:codigo` | Buscar orden por código QR (HU-10) | - | Orden o 404 |
| `GET /ordenes/:id_orden` | Detalle de una orden | - | Orden con cliente y equipo |
| `POST /servicios` | Iniciar servicio (HU-03) | `{ id_hoja, id_asignacion }` | `{ id_hoja, id_checklist, estado_servicio, fecha_inicio }` |
| `GET /servicios/:id_hoja` | Resumen completo (HU-07) | - | Hoja con respuestas, consumos, evidencias y orden |
| `PUT /servicios/:id_hoja/finalizar` | Finalizar (HU-03) | `{ horometro_servicio, actividades, observaciones_tecnicas, resultado }` | 200 o 400 con `faltantes` |
| `POST /servicios/:id_hoja/enviar` | Enviar al ERP (HU-07) | - | `{ codigo_hoja_erp, estado_envio_erp }`; si falla, se puede reintentar |
| `GET /checklists` | Plantilla del checklist (HU-04) | - | `{ id_checklist, items }` |
| `GET /checklists/:id_checklist` | Plantilla por id | - | `{ id_checklist, items }` |
| `PUT /checklists/respuestas/:id_hoja` | Guardar respuestas (HU-04) | `{ respuestas: [{ id_item, resultado, observacion }] }` | `{ guardadas: n }` |
| `GET /materiales?q=texto` | Buscar materiales (HU-05) | - | Lista de `{ id_material, nombre, unidad_medida, stock_referencial }` |
| `POST /materiales/consumos` | Registrar consumo (HU-05) | `{ id_consumo, id_hoja, id_material, cantidad }` | `{ id_consumo }` (idempotente) |
| `GET /materiales/consumos/:id_hoja` | Consumos de una hoja | - | Lista de consumos |
| `POST /evidencias` | Subir foto o firma (HU-05/HU-06) | `{ id_evidencia, id_hoja, tipo, archivo, formato, latitud, longitud, nombre_firmante, rut_firmante }` | `{ id_evidencia }` (idempotente) |
| `GET /evidencias/:id_hoja` | Evidencias de una hoja | - | Lista de evidencias |
| `GET /presupuestos` | Presupuestos del técnico (HU-08) | - | Lista de presupuestos |
| `POST /presupuestos` | Crear presupuesto sin precios (HU-08) | `{ id_orden, lugar_trabajo, descripcion, items }` | `{ id_presupuesto, estado }` |
| `GET /presupuestos/:id_presupuesto` | Detalle de un presupuesto | - | Presupuesto con ítems |
| `PUT /presupuestos/:id_presupuesto/aprobar` | Aprobar (HU-08, admin) | - | Presupuesto aprobado |
| `PUT /presupuestos/:id_presupuesto/rechazar` | Rechazar (HU-08, admin) | - | Presupuesto rechazado |
| `GET /admin/resumen` | Conteos para el panel (HU-11, admin) | - | `{ totales }` |
| `GET /admin/hojas` | Hojas de servicio (HU-11, admin) | - | Lista de hojas |

Las imágenes viajan en base64 dentro de JSON; el servidor admite hasta 10 MB por petición.
Los UUID (`id_hoja`, `id_consumo`, `id_evidencia`) los genera el celular para que un reintento no
duplique registros. La cola offline de `client/src/api/api.js` guarda las operaciones `POST`/`PUT`
en `localStorage` y las envía al reconectar.

## Cómo verificar el estado

Desde la raíz:

    npm run verificar

Ejecuta la comprobación de comentarios, la revisión de sintaxis del backend, 10 pruebas del
servidor, 4 pruebas del ERP, el lint y el build del cliente.
