# Cómo trabajamos con Git y GitHub

## La idea

- `main` es la versión buena, la que siempre debe funcionar. Nadie trabaja directamente en ella.
- Cada tarea se hace en **su propia rama**: una copia paralela donde cada uno trabaja sin molestar a los demás.
- Cuando la tarea está lista, se pide unirla a `main` con un **Pull Request (PR)**: una solicitud en
  GitHub para que otra persona revise el cambio antes de mezclarlo.

## Ciclo de trabajo de cada integrante

**1. Empezar una tarea**

    git checkout main
    git pull
    git checkout -b feature/hu-01-login-api

- `git pull` trae lo último que hay en GitHub.
- `git checkout -b nombre` crea la rama nueva y se cambia a ella.
- Nombre de la rama: `feature/` + historia + descripción corta.

**2. Trabajar y guardar cambios** (varias veces al día, en pequeño)

    git status
    git add .
    git commit -m "HU-01: endpoint de login"

- `git status` muestra qué archivos cambiaron. Mirarlo siempre antes de guardar.
- `git add .` prepara los cambios. `git commit` los guarda con un mensaje.

**3. Subir la rama a GitHub**

    git push -u origin feature/hu-01-login-api

La primera vez lleva `-u origin nombre-de-rama`. Las siguientes veces basta con `git push`.

**4. Abrir el Pull Request** (en GitHub): botón "Compare & pull request", título con la historia
(`HU-01: login del técnico`), descripción de qué se hizo y cómo probarlo, elegir revisor y
"Create pull request".

**5. Revisión y unión.** El revisor prueba que funcione y que cumpla lo que dice la historia. Si está
bien, pulsa "Merge pull request" y borra la rama.

**6. Actualizar el computador** (todos, después de cada unión)

    git checkout main
    git pull

## Cómo evitamos pisarnos

1. Cada responsable trabaja en su propia carpeta o archivos.
2. Los archivos compartidos (`package.json`, `README.md`, `server/index.js`, `client/src/App.jsx`) se
   avisan en el chat antes de modificarlos.
3. Mientras se trabaja en una rama, traer lo nuevo con frecuencia: `git pull origin main`.
4. PR pequeños y frecuentes: mejor uno por día que uno enorme al final.
5. **Solo Datos/Integración edita `database/schema.sql`.** Si alguien necesita un cambio en una
   tabla, lo pide en el chat; después todos ejecutan `npm run db:reset` en `server/`.

## Conflictos

Ocurre cuando dos personas cambian las mismas líneas de un archivo. Aparece así:

    <<<<<<< HEAD
    tu versión
    =======
    la versión del otro
    >>>>>>> main

Se resuelve en VS Code con los botones "Accept Current / Incoming / Both Changes" (hablando con la otra
persona si no está claro), se borran las marcas, y luego:

    git add .
    git commit -m "Resuelvo conflicto con main"
    git push

## Reglas

1. Nadie sube directo a `main`.
2. Una rama por tarea; un PR revisado por otra persona.
3. **Nunca `git push --force`** (puede borrar el trabajo de otros).
4. No subir `.env` ni contraseñas.
5. Si algo no se entiende, se avisa en el chat; no se inventa ni se borra.
