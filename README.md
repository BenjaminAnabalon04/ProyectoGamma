# Proyecto Gamma - Portal de Terreno y Movilidad (FYAG)

App web móvil (PWA) para que los técnicos de FYAG registren servicios en terreno:
orden de trabajo, checklist, materiales, fotos, firma del cliente y envío a la oficina.

## Estructura

| Carpeta | Qué contiene | Tecnología |
|---|---|---|
| `client/` | Pantallas de la app | React |
| `server/` | API | Node.js + Express |
| `database/` | Tablas y datos de prueba | PostgreSQL |
| `erp-mock/` | ERP simulado | Node.js |
| `docs/` | Informes, acuerdos y pruebas | - |

## Requisitos (instalar antes de empezar)

- Git
- Node.js (versión LTS)
- VS Code
- PostgreSQL
- Cuenta de GitHub (pedir invitación al repositorio)

## Cómo descargarlo

    git clone https://github.com/Berettla/proyecto-gamma.git
    cd proyecto-gamma

## Reglas de trabajo

1. Nadie sube cambios directo a `main`.
2. Cada tarea va en su propia rama.
3. Todo cambio lo revisa otra persona (Pull Request) antes de unirse a `main`.
4. Si algo no funciona, se avisa en el chat del equipo.
5. Una tarea está terminada cuando está probada, no cuando está escrita.

## Cómo ejecutar el proyecto

Se necesitan dos terminales abiertas a la vez.

**Primera vez en cada computador** (una sola vez):

    cd server
    npm install
    cd ../client
    npm install

**Terminal 1: servidor (API)**

    cd server
    npm run dev

Debe decir `Servidor escuchando en http://localhost:3000`.
Prueba: abrir http://localhost:3000/api/v1/health en el navegador.

**Terminal 2: pantalla (frontend)**

    cd client
    npm run dev

Abrir http://localhost:5173. Debe verse "API de Gamma funcionando" en verde.
Si sale en rojo, el servidor (terminal 1) está apagado.

Nota: `node_modules` no se sube a GitHub; por eso hace falta `npm install`.