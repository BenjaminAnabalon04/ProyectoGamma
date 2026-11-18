# Guía de estudio del proyecto

Cada integrante debe poder explicar con sus palabras **qué hace cada bloque y cada archivo** de esta guía.
Para cada bloque hay: qué es, para qué sirve, qué archivos tiene, cómo se comprueba que funciona y
preguntas de práctica. Al final hay un recorrido completo de una petición, un glosario y preguntas que
podría hacer el profesor.

## Cómo está armado el sistema

| Pieza | Tecnología | Analogía |
|---|---|---|
| Pantallas del técnico | React (carpeta `client/`) | El salón: lo que ve y toca el cliente |
| La API | Node.js + Express (carpeta `server/`) | El mesero: recibe pedidos, los revisa y los lleva |
| La base de datos | PostgreSQL (carpeta `database/`) | La bodega donde queda todo guardado |
| ERP simulado | Node.js (carpeta `erp-mock/`, pendiente) | La oficina central |

Regla de oro del diseño (Informe 2): **la pantalla nunca habla directo con la base de datos.** Siempre
pasa por la API, que valida y decide qué se guarda.

---

## Bloque 1. Repositorio y GitHub

**Qué es.** **Git** es un programa que guarda el historial de cambios de los archivos y permite que varias
personas trabajen sin pisarse. **GitHub** es el sitio web donde vive el repositorio compartido.

**Para qué sirve.** Que cinco personas trabajen sobre el mismo proyecto, que cada cambio quede registrado
(quién, cuándo y qué) y que se pueda volver atrás.

**Archivos importantes.**
- `README.md`: la portada del proyecto; explica cómo ejecutarlo.
- `.gitignore`: lista lo que Git **no** debe subir (por ejemplo `node_modules`, que pesa mucho y se
  reconstruye con `npm install`, y `.env`, que tiene contraseñas).
- Carpetas `client/`, `server/`, `database/`, `erp-mock/`, `docs/`: dividen el proyecto por responsabilidades.

**Comandos que se usaron.** `git clone` (descargar el repositorio), `git add` (preparar cambios),
`git commit` (guardarlos con un mensaje), `git push` (subirlos a GitHub). El flujo de ramas está en `docs/git.md`.

**Cómo se comprueba.** En GitHub se ven las carpetas y el README; `git status` en el computador dice que no hay cambios pendientes.

**Practica.** ¿Qué diferencia hay entre Git y GitHub? ¿Qué diferencia hay entre `commit` y `push`? ¿Por qué `.env` no se sube?

---

## Bloque 2. Servidor con Node.js y Express

**Qué es.**
- **Node.js** ejecuta JavaScript fuera del navegador, por ejemplo para armar un servidor.
- **Express** es una librería de Node que facilita crear una **API**: un programa que queda esperando
  peticiones en una dirección y responde.
- **npm** es el instalador de librerías de Node. `package.json` anota qué librerías usa el proyecto y
  qué comandos tiene (`npm run dev`). `node_modules` es la carpeta donde npm descarga las librerías.

**Conceptos.**
- **API REST**: un conjunto de direcciones (rutas) como `/api/v1/health`, cada una con un verbo HTTP
  (`GET` para consultar, `POST` para crear, `PUT` para modificar) que responde datos en formato **JSON**.
- **Puerto**: la "puerta" por donde el servidor escucha. El nuestro usa el 3000.
- **Middleware**: algo que se ejecuta antes de las rutas. Usamos `cors()` y `express.json()`.
- **CORS**: regla de seguridad del navegador. Una página en `localhost:5173` no puede pedirle datos a
  `localhost:3000` si el servidor no lo permite; `cors()` da ese permiso.
- **`/api/v1`**: el prefijo versionado que define el Informe 2.

**Archivos.** `server/index.js` (arranca el servidor y "monta" las rutas), `server/package.json`.

**Cómo se comprueba.** `npm run dev` en `server/` dice `Servidor escuchando en http://localhost:3000`, y
`http://localhost:3000/api/v1/health` muestra `API de Gamma funcionando`.

**Practica.** ¿Qué es una API? ¿Qué diferencia hay entre `GET` y `POST`? ¿Qué pasa si se apaga el servidor? ¿Para qué sirve CORS?

---

## Bloque 3. Pantalla con React y Vite

**Qué es.**
- **React** arma pantallas con **componentes**: piezas reutilizables escritas como funciones. Cada pantalla
  es un componente.
- **JSX** es la forma de escribir el aspecto de un componente dentro de JavaScript, parecida a HTML.
- **useState** guarda un valor que la pantalla muestra y se redibuja sola cuando cambia.
- **useEffect** ejecuta código cuando el componente aparece (por ejemplo, pedir datos al servidor).
- **Vite** es la herramienta que crea el proyecto React y lo sirve en `localhost:5173` mientras se desarrolla.

**Archivos.** `client/index.html` (la página única donde se carga todo), `client/src/main.jsx` (arranca React),
`client/src/App.jsx` (declara qué pantalla va en cada dirección), `client/package.json`.

**Cómo se comprueba.** `npm run dev` en `client/` y abrir `http://localhost:5173`.

**Nota.** Todavía no es una PWA instalable: eso requiere agregar un archivo de manifiesto y un Service
Worker, y está pendiente (se hará con el modo sin conexión).

**Practica.** ¿Qué es un componente? ¿Para qué sirve `useState`? ¿Qué diferencia hay entre el puerto 5173 y el 3000?

---

## Bloque 4. Conexión pantalla-servidor

**Qué es.** La pantalla le pide datos al servidor con `fetch`, la instrucción del navegador para hacer
peticiones HTTP. El servidor responde JSON y la pantalla lo muestra.

**Qué se probó.** Con el servidor encendido la pantalla mostró un mensaje en verde. Al apagarlo apareció el
aviso de error en rojo: la conexión es real y los errores se manejan.

**Practica.** ¿Qué hace `fetch`? ¿Por qué la pantalla muestra un error si el servidor está apagado?

---

## Bloque 5. Base de datos PostgreSQL

**Qué es.** Una base **relacional** guarda la información en **tablas** (filas y columnas) conectadas entre sí.

**Conceptos.**
- **Clave primaria (PK)**: la columna que identifica cada fila de forma única (por ejemplo `id_orden`).
- **Clave foránea (FK)**: una columna que apunta a la clave primaria de otra tabla y así las conecta
  (por ejemplo `asignacion.id_orden` apunta a `orden_trabajo.id_orden`).
- **Identidad vs UUID**: en las tablas de catálogo (usuario, cliente, equipo...) los ids son números que
  la base asigna sola. En `hoja_servicio`, `evidencia`, `consumo_material` y `presupuesto` el id es un **UUID**
  (un código único largo) porque **lo crea el celular**: así, si un envío se repite por mala señal, el
  sistema reconoce que es el mismo servicio y no lo duplica. Ese mismo id se usa en todo el sistema.
- **CHECK**: una regla que la base hace cumplir (por ejemplo `cantidad > 0`, o que `rol` sea uno de tres valores).

**Las 16 tablas, por grupos.**
- Personas y clientes: `usuario`, `cliente`, `obra`, `equipo`.
- Trabajo: `orden_trabajo`, `asignacion`.
- Checklists: `checklist`, `item_checklist`, `respuesta_checklist`.
- Servicio: `hoja_servicio`, `evidencia`.
- Materiales: `material`, `consumo_material`.
- Presupuestos: `presupuesto`, `detalle_presupuesto`.
- Control: `auditoria`.

**La cadena principal.** `cliente -> orden_trabajo -> asignacion -> hoja_servicio -> (respuestas del checklist, consumos de materiales, evidencias)`.
Un técnico ve solo las órdenes cuya `asignacion` apunta a él.

**Archivos.**
- `database/schema.sql`: crea las tablas (instrucciones `CREATE TABLE`).
- `database/seed.sql`: carga datos de prueba **ficticios** (instrucciones `INSERT`).

**Contraseñas.** Nunca se guardan en texto plano: `seed.sql` usa la función `crypt` de la extensión `pgcrypto`
para guardar un **hash bcrypt** (un resultado que no se puede revertir y que lleva una "sal" aleatoria).

**Importante.** Cada persona tiene su propia PostgreSQL. Lo que se comparte por GitHub son los **scripts**, no los datos.

**Cómo se comprueba.** En `psql`: `\dt` lista 16 tablas, y una consulta muestra 3 órdenes de Carlos Mendoza y 2 de Roberto Gómez.

**Practica.** ¿Qué es una clave foránea? ¿Por qué `hoja_servicio` usa UUID? ¿Por qué la base no guarda la contraseña tal cual?

---

## Bloque 6. Servidor conectado a PostgreSQL

**Qué es.** El servidor usa la librería `pg` para hacer consultas SQL a PostgreSQL.

**Conceptos.**
- **Pool** (`server/src/db.js`): mantiene conexiones abiertas a la base y las reutiliza.
- **`.env` y `dotenv`**: el archivo `server/.env` guarda la configuración secreta de cada computador
  (contraseña de la base). `dotenv` lo lee al arrancar. `.env` no se sube a GitHub; `.env.example` es la plantilla que sí se sube.
- **`async` / `await`**: forma de esperar una respuesta lenta (como la de la base) sin congelar el servidor.
- **`try` / `catch`**: si algo falla, se captura el error. Al cliente se le da un mensaje general y el
  detalle técnico queda solo en la terminal del servidor (Informe 2, sección 3.5.8).
- **Consultas parametrizadas**: las consultas con datos del usuario se escriben con `$1`, `$2` y los datos
  van aparte. Evita la **inyección SQL** (el ataque de la prueba S-01).
- **Capas `routes` y `controllers`**: `routes` define qué direcciones existen; `controllers` hace lo que
  corresponde en cada una. El Informe 2 define además `services` (reglas del negocio) y `repositories`
  (acceso a la base); por ahora las consultas están dentro del controlador (ver `docs/decisiones.md`).

**Archivos.**
- `server/src/db.js`: la conexión.
- `server/src/routes/health.routes.js` y `server/src/controllers/health.controller.js`: el **modelo a copiar** para cualquier tema nuevo.
- `server/scripts/db-reset.js`: ejecuta `schema.sql` y `seed.sql`. Se usa con `npm run db:reset`.
- `server/.env.example`: plantilla de configuración.

**Cómo se comprueba.** `http://localhost:3000/api/v1/health/db` responde `ordenes_en_base: 6`. Con una contraseña
incorrecta responde un mensaje de error general.

**Practica.** ¿Por qué la contraseña va en `.env`? ¿Qué es la inyección SQL y cómo se evita? ¿Qué hace `npm run db:reset`?

---

## Bloque 7. Estructura de la pantalla

**Qué es.**
- **React Router** (`App.jsx`): decide qué pantalla se muestra según la dirección del navegador.
- **`client/src/pages/`**: una pantalla por archivo. Las que no están construidas usan el componente
  `PantallaPendiente` y se reemplazan al desarrollarlas.
- **`client/src/api/api.js`**: la función `pedir`, el único lugar por donde la pantalla le habla al servidor.
  Ya está preparada para enviar el token de sesión (`Authorization: Bearer ...`) cuando exista el login.
- **`client/src/index.css`**: estilos base pensados para terreno (HU-09): botones de al menos 56 px y colores de alto contraste.

**Cómo se comprueba.** En `http://localhost:5173` se ve el mapa de pantallas; "Estado del sistema" muestra servidor y base de datos en verde.

**Practica.** ¿Para qué existe `pedir` en vez de escribir `fetch` en cada pantalla? ¿Cómo se agrega una pantalla nueva?

---

## Recorrido de una petición completa

Ejemplo: la pantalla "Estado del sistema" consulta la base de datos.

1. El navegador abre `http://localhost:5173/estado` y React muestra `pages/Estado.jsx`.
2. `Estado.jsx` llama a `pedir('/health/db')` (`api/api.js`).
3. `pedir` hace un `fetch` a `http://localhost:3000/api/v1/health/db`.
4. Express recibe la petición en `server/index.js`, que la envía a `routes/health.routes.js`.
5. Esa ruta llama a `controllers/health.controller.js`, función `estadoBaseDeDatos`.
6. El controlador usa `db.js` para ejecutar `SELECT COUNT(*) FROM orden_trabajo` en PostgreSQL.
7. PostgreSQL responde; el controlador arma un JSON `{ status, mensaje, ordenes_en_base }`.
8. El navegador recibe el JSON y `Estado.jsx` lo muestra en verde.

El flujo real del técnico (login, órdenes, servicio, envío) sigue exactamente este mismo camino,
con más rutas y controladores.

## Glosario

| Término | Significado |
|---|---|
| JSON | Formato de texto para intercambiar datos, como `{ "nombre": "Carlos" }` |
| Endpoint / ruta | Una dirección de la API, como `/api/v1/ordenes` |
| HTTP 200 / 201 | Todo bien / creado correctamente |
| HTTP 400 | La petición está mal (datos inválidos) |
| HTTP 401 | No autenticado (sin sesión válida) |
| HTTP 403 | Sin permiso para ese recurso |
| HTTP 404 | No existe |
| HTTP 500 | Falla interna del servidor |
| JWT (pendiente) | "Pase" firmado que el servidor entrega al iniciar sesión y que la pantalla envía en cada petición |
| bcrypt | Método para guardar contraseñas como hash con sal, sin poder revertirlas |
| Idempotencia (pendiente) | Repetir un envío no crea duplicados, gracias al UUID de la hoja |
| PWA | Página web que se usa como app en el celular |

## Lo que todavía NO está implementado

Login y JWT, rutas de órdenes, servicios, checklists, materiales y evidencias, ERP simulado, pantallas reales,
PWA instalable, modo sin conexión, escáner QR y panel de administración. El detalle está en `docs/tareas.md`.

## Preguntas que podría hacer el profesor

1. **¿Por qué React y Node.js?** Ambos usan JavaScript, lo que reduce las tecnologías que el equipo debe dominar (justificación del Informe 1).
2. **¿Qué es una API REST?** Un conjunto de rutas con verbos HTTP que reciben y entregan datos en JSON. Aquí, la API es el intermediario entre la pantalla y la base de datos.
3. **¿Por qué la pantalla no se conecta directo a la base de datos?** Por seguridad: la API valida la identidad, los permisos y los datos antes de guardar (Informe 2, sección 3.4.4).
4. **¿Qué es CORS y por qué lo configuraron?** Una restricción del navegador sobre pedir datos a otro origen; se permite explícitamente en el servidor.
5. **¿Por qué la contraseña de la base va en `.env`?** Para mantener los secretos fuera del código y del repositorio (Informe 2, sección 3.5.6).
6. **¿Cómo se guardan las contraseñas de los usuarios?** Como hash bcrypt con sal, nunca en texto plano.
7. **¿Qué es una consulta parametrizada?** Una consulta donde los datos del usuario van separados del texto SQL; evita la inyección SQL.
8. **¿Por qué la hoja de servicio usa un UUID creado en el celular?** Para que un reenvío no duplique datos y para identificar el mismo servicio en todo el sistema.
9. **¿Por qué PostgreSQL?** Los datos son estructurados y con relaciones (clientes, órdenes, materiales, firmas), y así lo definió el Informe 1. El diseño no relacional del Informe 2 fue un ejercicio de diseño del informe y no forma parte de lo implementado.
10. **¿Qué simplificaron y por qué?** Ver `docs/decisiones.md`: se priorizó un flujo completo funcionando antes que las funciones de valor agregado.
11. **¿Qué es una clave foránea?** Una columna que apunta a la clave primaria de otra tabla y las conecta; por ejemplo, `asignacion.id_orden`.
12. **¿Qué parte de este sistema NO está terminada?** Lo listado arriba y en `docs/tareas.md`; es importante decirlo con honestidad.
