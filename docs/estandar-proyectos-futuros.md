# Estándar para proyectos futuros

Este documento es la plantilla que el equipo debe repetir en el próximo proyecto. Resume lo que
funcionó en Gamma y evita tener que reconstruir las reglas desde cero.

## 1. Estructura desde el primer día

    proyecto/
    ├── client/        Interfaz (React + Vite u otro framework)
    ├── server/        API (Node + Express u otro backend)
    ├── database/      Esquema y datos de prueba, con un único dueño
    ├── erp-mock/      Servicio externo simulado si el real no está disponible
    ├── docs/          Guías, decisiones, despliegue y estado de tareas
    ├── scripts/       Verificaciones automáticas del equipo
    ├── README.md      Puerta de entrada: qué es, cómo arrancar y cómo desplegar
    └── package.json   Scripts de verificación de todo el proyecto

Cada carpeta lleva su propio `README.md` y su `package.json` cuando corresponde.

## 2. Personas y ramas

- Una rama por responsable: `feature/<tema>-<responsable>`.
- Un dueño por área y un dueño del esquema de base de datos.
- Los commits se hacen con el nombre del responsable, aunque se trabaje en un mismo computador:

      git -c user.name="Nombre Apellido" -c user.email="correo@example.com" commit -m "feat(tema): cambio"

- Integración local con `git merge --no-ff` y mensaje `Merge: tema (Nombre)`.
- Definir desde el inicio si se usa `git push`. En Gamma se decidió **no usarlo** y el despliegue
  se hizo por CLI. Si el proyecto siguiente necesita varias computadoras, acordar el remoto antes.

## 3. Contrato de API primero

Antes de que frontend y backend trabajen en paralelo, escribir en `docs/tareas.md`:

- lista de rutas con método, entrada y salida;
- autenticación y roles de cada ruta;
- códigos de error y forma del mensaje;
- ejemplos de JSON.

El contrato se actualiza en el mismo commit que cambia la ruta, nunca después.

## 4. Reglas de código

1. **Cero comentarios explicativos.** Solo se permite la línea de autoría al inicio de cada archivo:

       // Desarrollado por: Nombre Apellido

2. Verificarlo con un script en `scripts/verificar-comentarios.js` que recorra las extensiones del
   proyecto y falle si encuentra cualquier otro comentario.
3. Consultas SQL siempre parametrizadas (`$1`, `$2`), nunca concatenar datos del usuario.
4. Contraseñas con hash (bcrypt) y sesión con token firmado (JWT) desde la primera historia.
5. Un middleware de roles (`verificarRol`) antes de cualquier pantalla de administración.
6. Nunca subir `.env`, credenciales ni archivos generados por los usuarios (`uploads/`).

## 5. Idempotencia y sin conexión

Si la app se usa en terreno o con señal intermitente:

- el cliente genera los UUID con `crypto.randomUUID()` y los envía en el cuerpo;
- el servidor respeta el UUID y devuelve el registro existente si llega repetido;
- la cola offline se guarda en `localStorage` y se drena al reconectar;
- el servicio externo (ERP) también es idempotente y permite forzar un fallo para probar reintentos.

Probar siempre el caso de reintento: enviar dos veces el mismo ID debe producir un solo registro.

## 6. Verificación antes de integrar

Un solo comando en la raíz:

    npm run verificar

Debe incluir, como mínimo:

1. comprobación de comentarios de autoría;
2. revisión de sintaxis de los archivos JavaScript;
3. pruebas automáticas del backend;
4. pruebas automáticas del servicio simulado;
5. lint del cliente;
6. build de producción del cliente.

Una tarea se marca `[x]` solo si este comando pasa **después** del merge.

## 7. Documentación obligatoria

| Archivo | Contenido |
|---|---|
| `README.md` | Qué hace el proyecto, quién hace qué, arranque local, pruebas y despliegue |
| `docs/guia-de-estudio.md` | Qué hace cada archivo y cómo explicarlo |
| `docs/tareas.md` | Estado final, responsables y contrato de la API |
| `docs/decisiones.md` | Qué se simplificó y por qué |
| `docs/despliegue.md` | Pasos exactos de publicación y verificación |
| `docs/git.md` | Flujo de ramas y reglas del equipo |
| `docs/estandar-proyectos-futuros.md` | Esta plantilla |

## 8. Despliegue

- Definir el hosting antes de programar, no al final.
- Si no se va a hacer push, elegir herramientas que desplieguen desde la carpeta local (en Gamma:
  `vercel --prod` y `railway up ./carpeta --path-as-root`).
- La base de datos en la nube entrega una URL de conexión; el backend debe leerla desde una
  variable de entorno (`DATABASE_URL`) y activar SSL cuando haga falta.
- Los archivos subidos por usuarios necesitan un volumen persistente, no el disco del contenedor.
- Después de desplegar, repetir el recorrido completo: login, flujo principal, panel y offline.

## 9. Definition of done

Una historia está terminada cuando:

- [ ] el código está en su rama con commits a nombre del responsable;
- [ ] `npm run verificar` pasa;
- [ ] se hizo el merge local a `main` y se volvió a verificar;
- [ ] la tarea está marcada `[x]` con su responsable en `docs/tareas.md`;
- [ ] la documentación afectada quedó actualizada.

## 10. Errores que no repetir

- Dejar pantallas "pendientes" sin reemplazar: al final quedan comentarios y rutas muertas.
- Escribir los README en inglés por defecto cuando el equipo trabaja en español.
- Cambiar `schema.sql` desde varias ramas sin un dueño único.
- Publicar sin configurar la URL de la API en el cliente.
- Dar por terminado un flujo porque "compila", sin probarlo con el ERP y sin conexión.
