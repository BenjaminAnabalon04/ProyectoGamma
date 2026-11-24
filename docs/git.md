# Flujo de Git del equipo

## La idea

- `main` es la versión buena: siempre debe pasar las verificaciones y estar lista para desplegar.
- Cada responsable trabaja en **su propia rama**, creada desde `main`.
- Cuando la tarea está probada, se une a `main` con un **merge local** (`--no-ff`).
- **No se hace `git push`** en este proyecto. El historial remoto es solo de referencia histórica;
  el trabajo se integra y despliega desde este computador.

## Ramas usadas

| Responsable | Rama | Contenido |
|---|---|---|
| Agustín Insunsa | `feature/backend-agustin-insunsa` | API, autenticación y controladores |
| Agustín Insunsa | `feature/despliegue-agustin-insunsa` | `DATABASE_URL` para Railway |
| Benjamín Anabalón | `feature/base-de-datos-benjamin-anabalon` | `schema.sql` y `seed.sql` |
| Benjamín Anabalón | `feature/erp-mock-benjamin-anabalon` | ERP simulado y pruebas |
| Robert Ramírez | `feature/frontend-1-robert-ramirez` | Sesión, rutas, QR, PWA y administración |
| Aaron Ponse | `feature/frontend-2-aaron-ponse` | Checklist, materiales, evidencias, resumen y presupuesto |
| Sergio | `feature/documentacion-sergio` | Documentación, decisiones, QA y estándar |

## Ciclo de trabajo

**1. Empezar una tarea**

    git checkout main
    git checkout -b feature/nombre-responsable

El nombre sigue el patrón `feature/<tema>-<responsable>`.

**2. Trabajar y guardar cambios** (en commits pequeños)

    git status
    git add .
    git -c user.name="Nombre Responsable" -c user.email="correo@example.com" commit -m "feat(tema): qué se hizo"

`git status` se mira siempre antes de guardar. Cada commit queda a nombre de su responsable,
aunque se trabaje en un mismo computador.

**3. Verificar antes de integrar**

    npm run verificar

Pasa solo si no hay comentarios sin autoría, la sintaxis es válida, las pruebas del backend y del
ERP funcionan, y el cliente compila.

**4. Unir a `main`**

    git checkout main
    git merge --no-ff feature/nombre-responsable -m "Merge: tema (Nombre Responsable)"

`--no-ff` conserva el merge en el historial para que se vea qué persona entregó cada bloque.

**5. Repetir la verificación en `main`**

    npm run verificar

## Cómo evitamos pisarnos

1. Cada responsable trabaja en sus propios archivos o en su carpeta.
2. Los archivos compartidos (`README.md`, `server/index.js`, `client/src/App.jsx`, `package.json`
   de la raíz) se avisan antes de modificarlos.
3. Una rama se integra sola, con sus pruebas en verde; no se mezcla trabajo a medias.
4. **Solo Benjamín edita** `database/schema.sql` y `database/seed.sql`. Los cambios se piden y
   después todos ejecutan `npm run db:reset` en `server/`.
5. Los comentarios de código solo son de autoría, por ejemplo `// Desarrollado por: Aaron Ponse`.
   `npm run verificar:comentarios` lo comprueba automáticamente.
6. Nunca se suben `.env`, contraseñas ni archivos de `server/uploads/`.

## Conflictos

Ocurre cuando dos ramas cambian las mismas líneas. El conflicto se ve así:

    <<<<<<< HEAD
    tu versión
    ========
    la versión del otro
    >>>>>>> feature/otra-rama

Se resuelve en el editor (hablando con la otra persona si no está claro), se borran las marcas y
luego:

    git add .
    git commit -m "Resuelvo conflicto entre ramas"
    npm run verificar

## Reglas

1. Nadie commitea directamente en `main` sin pasar por su rama.
2. Una rama por responsable/tema y un merge local revisado.
3. **No hacer `git push`** ni `git push --force`.
4. Toda tarea se marca terminada solo cuando está probada y unida a `main`.
5. Si algo no se entiende, se avisa en el equipo; no se inventa ni se borra.
