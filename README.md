# Proyecto Gamma - Portal de Terreno y Movilidad (FYAG)

App web móvil (PWA) para que los técnicos de Frío y Agroindustria (FYAG) registren sus
servicios en terreno: orden de trabajo, checklist, materiales, fotos, firma del cliente y
envío a la oficina. Reemplaza el registro en papel.

## Documentación (leer en este orden)

| Documento | Para qué sirve |
|---|---|
| [docs/guia-de-estudio.md](docs/guia-de-estudio.md) | Explica cada bloque construido, qué hace cada archivo y preguntas que podría hacer el profesor |
| [docs/tareas.md](docs/tareas.md) | Qué está hecho, qué falta, quién lo hace y en qué archivo se agrega cada tarea |
| [docs/git.md](docs/git.md) | Cómo trabajamos con ramas y Pull Requests |
| [docs/decisiones.md](docs/decisiones.md) | Qué decidimos y simplificamos respecto a los informes, y qué corregir en el informe final |

## Estructura del repositorio

| Carpeta | Qué contiene | Tecnología |
|---|---|---|
| `client/` | Pantallas de la app | React + Vite |
| `server/` | API del sistema | Node.js + Express |
| `database/` | Tablas (`schema.sql`) y datos de prueba (`seed.sql`) | PostgreSQL |
| `erp-mock/` | ERP simulado (pendiente) | Node.js |
| `docs/` | Documentación del equipo | Markdown |

## Requisitos

Git, Node.js (versión LTS), VS Code, PostgreSQL y una cuenta de GitHub.

## Primera vez en un computador

1. **Descargar el repositorio** (la dirección está en el botón verde `Code` de GitHub):

       git clone <direccion-del-repositorio>
       cd proyecto-gamma

2. **Crear la base de datos.** Abrir `SQL Shell (psql)` (se instala con PostgreSQL), entrar con la
   contraseña que se eligió al instalar y ejecutar:

       CREATE DATABASE gamma;

3. **Servidor:**

       cd server
       npm install
       Copy-Item .env.example .env

   Abrir `server/.env` y escribir la contraseña de PostgreSQL en `DB_PASSWORD`. Luego cargar las
   tablas y los datos de prueba:

       npm run db:reset

4. **Pantalla:**

       cd ../client
       npm install

## Ejecutar el proyecto (cada vez que se trabaja)

Se necesitan **dos terminales abiertas a la vez**.

**Terminal 1: servidor**

    cd server
    npm run dev

Debe decir `Servidor escuchando en http://localhost:3000`.

**Terminal 2: pantalla**

    cd client
    npm run dev

Abrir http://localhost:5173 y entrar a "Estado del sistema". Deben verse en verde el servidor
y la base de datos.

## Reglas de trabajo

1. Nadie sube cambios directo a `main`.
2. Una rama por tarea, con el nombre de la historia (ejemplo: `feature/hu-02-mis-trabajos`).
3. Todo cambio lo revisa otra persona mediante Pull Request antes de unirse a `main`.
4. Nunca subir `.env` ni contraseñas.
5. Una tarea está terminada cuando está probada, no cuando está escrita.

Detalle completo en [docs/git.md](docs/git.md).
