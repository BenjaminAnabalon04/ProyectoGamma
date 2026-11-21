# Tareas: qué está hecho, qué falta y dónde se agrega cada cosa

Actualizar este archivo cuando una tarea quede **probada y unida a `main`** (cambiar `[ ]` por `[x]`).
Las historias (HU) y las pruebas (F-xx, S-xx, I-xx) son las de los Informes 1 y 2.

## Ya está hecho (la base)

- [x] Repositorio en GitHub con estructura de carpetas y README.
- [x] Servidor Express con rutas de prueba (`/api/v1/health` y `/api/v1/health/db`).
- [x] Pantalla React con Vite, mapa de pantallas, rutas y estilos base de alto contraste (HU-09).
- [x] Pantalla "Estado del sistema" que comprueba servidor y base de datos.
- [x] PostgreSQL: 16 tablas (`database/schema.sql`) y datos de prueba ficticios (`database/seed.sql`).
- [x] Conexión del servidor a PostgreSQL (`server/src/db.js`) y comando `npm run db:reset`.
- [x] Patrón de rutas y controladores a copiar (`server/src/routes/health.routes.js` y `controllers/health.controller.js`).
- [x] Función `pedir` para llamar a la API desde la pantalla (`client/src/api/api.js`).
- [x] Páginas vacías de cada pantalla, listas para reemplazar (`client/src/pages/`).

## Datos de prueba (después de `npm run db:reset`)

Contraseña de todos los usuarios: `Gamma2026!`

| Usuario | Rol | RUT para ingresar | Órdenes asignadas |
|---|---|---|---|
| Carlos Mendoza | técnico | 11.111.111-1 | 3 (OT-8842, OT-8843, OT-8844) |
| Roberto Gómez | técnico | 22.222.222-2 | 2 (OT-8845, OT-8846) |
| Marcela Soto | administrador | 33.333.333-3 | - |
| Cuenta ERP | erp | SERVICIO-ERP | - |

## Cómo agregar una tarea nueva

**En el servidor** (por cada tema, copiar el patrón de `health`):

1. Crear `server/src/routes/<tema>.routes.js` (qué direcciones existen).
2. Crear `server/src/controllers/<tema>.controller.js` (qué hace cada una; las consultas SQL van aquí por ahora).
3. En `server/index.js`, descomentar el `require` y el `app.use` de ese tema (ya están escritos como comentarios).
4. Las consultas siempre con parámetros (`$1`, `$2`), nunca uniendo texto con datos del usuario.

**En la pantalla:**

1. Abrir el archivo de la pantalla en `client/src/pages/` y reemplazar su contenido (usar `Estado.jsx` de ejemplo).
2. Para hablar con el servidor, usar `pedir` de `client/src/api/api.js`.
3. Si la pantalla es nueva, agregar su archivo en `pages/` y una línea `<Route>` en `client/src/App.jsx`.
4. Cuando quede lista, cambiar su estado a `listo` en `client/src/pages/Inicio.jsx`.

## Contrato de la API (propuesto)

Es lo que permite que Frontend y Backend trabajen en paralelo sin esperarse. **Es una propuesta**:
si alguien necesita cambiarla, lo avisa en el chat y se actualiza aquí. Todas las rutas empiezan con
`/api/v1` y, salvo el login, reciben el token en el encabezado `Authorization: Bearer <token>`.

| Ruta | Qué hace | Entra | Sale |
|---|---|---|---|
| `POST /auth/login` | Iniciar sesión (HU-01) | `{ rut, password }` | `{ token, usuario: { id_usuario, nombre, rol } }` o error 401 `{ mensaje }` |
| `GET /ordenes` | Mis trabajos (HU-02) | - | Lista de `{ id_orden, id_asignacion, codigo_orden_erp, titulo, tipo_servicio, prioridad, fecha_programada, estado, cliente, equipo }` |
| `POST /servicios` | Iniciar servicio (HU-03) | `{ id_hoja (UUID creado en el celular), id_asignacion }` | `{ id_hoja, id_checklist, estado_servicio, fecha_inicio }` |
| `GET /checklists/:id_checklist` | Plantilla del checklist (HU-04) | - | `{ id_checklist, nombre, items: [{ id_item, pregunta, obligatorio, orden }] }` |
| `PUT /checklists/respuestas/:id_hoja` | Guardar respuestas (HU-04) | `{ respuestas: [{ id_item, resultado, observacion }] }` | `{ guardadas: n }` |
| `GET /materiales?q=texto` | Buscar materiales (HU-05) | - | Lista de `{ id_material, nombre, unidad_medida, stock_referencial }` |
| `POST /materiales/consumos` | Registrar consumo (HU-05) | `{ id_hoja, id_material, cantidad }` (cantidad mayor que 0) | `{ id_consumo }` |
| `POST /evidencias` | Subir foto o firma (HU-05, HU-06) | `{ id_hoja, tipo: 'foto' o 'firma', archivo (imagen en base64), formato, latitud, longitud, nombre_firmante, rut_firmante }` | `{ id_evidencia }` |
| `PUT /servicios/:id_hoja/finalizar` | Finalizar (HU-03) | `{ horometro_servicio, actividades, observaciones_tecnicas, resultado }` | 200, o 400 `{ mensaje, faltantes: [...] }` si falta algo obligatorio |
| `POST /servicios/:id_hoja/enviar` | Enviar al ERP (HU-07) | - | `{ estado_envio_erp }`; si falla, error con `{ mensaje }` y se puede reintentar |

Nota: como las imágenes viajan en base64 dentro del JSON, quien haga `POST /evidencias` debe subir el
límite de `express.json({ limit: '10mb' })` en `server/index.js` (archivo compartido: avisar).

## Backend / API (responsable: ______________  apoyo: ______________)

Archivos: `server/src/routes/`, `server/src/controllers/`, `server/src/middleware/`.

- [x] **B1. Verificación del token (JWT)**: `server/src/middleware/auth.js`. Revisa el token en cada petición protegida y deja los datos del usuario disponibles (401 si es inválido). Bloquea a las demás rutas protegidas. Instalar `jsonwebtoken`; la clave secreta va en `.env` como `JWT_SECRET` (agregar también a `.env.example`).
- [x] **B2. HU-01 Login**: `auth.routes.js` y `auth.controller.js`. Buscar el usuario por RUT, comparar la contraseña con `bcryptjs` (instalar; las contraseñas de prueba ya están guardadas con bcrypt), mensaje genérico si falla, bloqueo de 15 minutos tras 5 intentos (`intentos_fallidos` y `bloqueado_hasta`). Pruebas: F-01, F-02, S-01.
- [x] **B3. HU-02 Mis trabajos**: `ordenes.routes.js` y `ordenes.controller.js`. Solo las órdenes de las asignaciones activas del técnico que hizo la petición. Pruebas: F-03 (Carlos ve 3, Roberto 2), S-04.
- [x] **B4. HU-03 Iniciar y finalizar servicio**: `servicios.routes.js` y `servicios.controller.js`. Crear la hoja con el UUID que manda el celular, elegir el checklist según el tipo de servicio, y bloquear el cierre si falta un ítem obligatorio (RF-12). Pruebas: F-04, F-05.
- [ ] **B5. HU-07 Enviar al ERP**: en `servicios.controller.js`. Reunir la hoja con respuestas, consumos y evidencias, enviarla al ERP simulado (dirección en `.env` como `ERP_URL`), actualizar `estado_envio_erp`, y si falla permitir reintentar sin duplicar (RF-13). Depende de D1. Prueba: F-10.
- [ ] **B6. HU-08 Presupuestos** (solo si hay tiempo): `presupuestos.routes.js`. El técnico no ve precios ni aprueba. Prueba: F-11.

## Datos / Integración (responsable: ______________  apoyo: ______________)

Archivos: `database/`, `erp-mock/`, y las rutas de checklists, materiales y evidencias.

- [x] **D1. ERP simulado**: carpeta `erp-mock/` (proyecto Node propio: `npm init`, `npm install express`). Puerto 4000. `POST /erp/servicios` responde `{ recibido: true, codigo_hoja_erp }`. Una variable (por ejemplo `FALLAR=1`) hace que responda error, para probar el reintento. Agregar su guía de uso al README.
- [x] **D2. HU-04 Checklist**: `checklists.routes.js` y `checklists.controller.js`: entregar la plantilla y guardar las respuestas. Prueba: F-06.
- [ ] **D3. HU-05 Materiales**: `materiales.routes.js`: buscar en el catálogo y registrar consumos (cantidad mayor que 0). Prueba: F-07.
- [ ] **D4. HU-05 y HU-06 Evidencias**: `evidencias.routes.js`: recibir la imagen, guardarla en una carpeta `server/uploads/` (agregarla al `.gitignore`: archivo compartido, avisar) y registrar `clave_archivo` en la tabla `evidencia`. Validar tipo y tamaño del archivo (S-09). Pruebas: F-08, F-09.
- [ ] **D5. Dueño del esquema**: solo esta área edita `database/schema.sql` y `seed.sql`. Cambios: pedirlos en el chat; después todos ejecutan `npm run db:reset`.

## Frontend 1 (responsable: ______________  apoyo: ______________)

Archivos: `client/src/pages/Login.jsx`, `MisTrabajos.jsx`, `DetalleOrden.jsx`, `index.css`.

- [ ] **F1-1. Sesión**: guardar el token después del login y pasarlo a `pedir` en las demás pantallas.
- [ ] **F1-2. HU-01 Login** (`Login.jsx`): RUT y contraseña, mensaje si falla. Pruebas: F-01, F-02.
- [ ] **F1-3. HU-02 Mis trabajos** (`MisTrabajos.jsx`): lista de órdenes y paso al detalle. Prueba: F-03.
- [ ] **F1-4. HU-03 Detalle e inicio/fin** (`DetalleOrden.jsx`): crear el UUID de la hoja en el celular (`crypto.randomUUID()`) al iniciar el servicio. Pruebas: F-04, F-05.
- [ ] **F1-5. HU-09 Uso en terreno**: botones de al menos 56 px, contraste alto, uso con una mano (estilos base en `index.css`). Prueba: F-14.

## Frontend 2 (responsable: ______________  apoyo: ______________)

Archivos: `ChecklistInsumos.jsx`, `EvidenciasFirma.jsx`, `Resumen.jsx`, `Presupuesto.jsx`.

- [ ] **F2-1. HU-04 y HU-05 Checklist y materiales** (`ChecklistInsumos.jsx`): mostrar los ítems, marcar los obligatorios, buscar y agregar materiales.
- [ ] **F2-2. HU-05 y HU-06 Fotos y firma** (`EvidenciasFirma.jsx`): tomar o elegir fotos, firma en canvas con nombre y RUT del firmante. Pruebas: F-08, F-09.
- [ ] **F2-3. HU-07 Resumen y envío** (`Resumen.jsx`): revisar todo, enviar, mostrar éxito o error con botón "Reintentar". Prueba: F-10.
- [ ] **F2-4. HU-08 Presupuesto** (`Presupuesto.jsx`): solo si hay tiempo. Prueba: F-11.

## Coordinación e integración (responsable: ______________)

- [ ] Tablero de tareas con una tarjeta por cada tarea de este archivo (cada una con su HU).
- [ ] Probar el flujo completo cada noche (login, mis trabajos, iniciar, checklist, materiales, fotos, firma, envío) y anotar qué falla.
- [ ] Mantener este archivo y `docs/decisiones.md` actualizados.
- [ ] Preparar el informe final y el ensayo de la entrevista.

## Orden recomendado y dependencias

1. **B1 y B2 (login)** desbloquean todo lo protegido. F1-2 puede empezar al mismo tiempo usando el contrato de arriba.
2. B3 y F1-3 (mis trabajos), luego B4 y F1-4 (iniciar y finalizar).
3. D2, D3, D4 con F2-1 y F2-2 en paralelo, una vez que B4 permita crear una hoja.
4. D1 (ERP simulado) en paralelo desde el inicio, porque no depende de nadie.
5. B5 y F2-3 (envío) al final: dependen de todo lo anterior.
6. HU-08, HU-10 y HU-11 solo después de que el flujo completo funcione.
