# Proyecto Gamma — Portal de Terreno y Movilidad (FYAG)

PWA para que los técnicos de Frío y Agroindustria (FYAG) registren servicios en terreno:
órdenes asignadas, checklist, materiales, fotos, firma del cliente, presupuestos, resumen,
envío al ERP, modo sin conexión, escáner QR y panel de administración.

## Documentación (leer en este orden)

| Documento | Para qué sirve |
|---|---|
| [docs/guia-de-estudio.md](docs/guia-de-estudio.md) | Qué hace cada bloque, cada archivo y cómo explicarlo |
| [docs/tareas.md](docs/tareas.md) | Estado final de cada historia, responsables y contrato de la API |
| [docs/git.md](docs/git.md) | Flujo de ramas por persona y merges locales (sin push) |
| [docs/decisiones.md](docs/decisiones.md) | Decisiones y simplificaciones del equipo |
| [docs/despliegue.md](docs/despliegue.md) | Puesta en producción con Vercel + Railway |
| [docs/estandar-proyectos-futuros.md](docs/estandar-proyectos-futuros.md) | Plantilla y checklist para repetir este estándar |

## Equipo y responsabilidades

| Integrante | Rol | Área principal |
|---|---|---|
| Robert Ramírez | Frontend 1 | Sesión, rutas protegidas, mis trabajos, detalle de orden, QR, PWA/offline, administración |
| Aaron Ponse | Frontend 2 | Checklist, materiales, evidencias/firma, resumen/envío, presupuesto |
| Agustín Insunsa | Backend | API, autenticación, controladores, integración ERP y adaptación a Railway |
| Benjamín Anabalón | Base de datos | `schema.sql`, `seed.sql`, ERP simulado y sus pruebas |
| Sergio | Scrum Master | Documentación, decisiones, QA y estándar del equipo |

## Estructura del repositorio

| Carpeta | Contenido | Tecnología |
|---|---|---|
| `client/` | PWA del técnico | React + Vite |
| `server/` | API REST | Node.js + Express + PostgreSQL |
| `database/` | Tablas y datos de prueba | PostgreSQL |
| `erp-mock/` | Oficina central simulada | Node.js + Express |
| `docs/` | Documentación del equipo | Markdown |
| `scripts/` | Verificación de comentarios de autoría | Node.js |

## Requisitos

- Node.js LTS y npm.
- PostgreSQL local (para desarrollo) o una base PostgreSQL en Railway.
- Opcional para producción: cuentas CLI de Vercel y Railway.

## Primera vez en un computador

```powershell
git clone <direccion-del-repositorio>
cd proyecto-gamma
```

**1. Base de datos local**

```powershell
CREATE DATABASE gamma;
```

**2. Servidor**

```powershell
cd server
npm install
Copy-Item .env.example .env
npm run db:reset
npm run dev
```

Edita `server/.env` con tu contraseña de PostgreSQL. Si usas `DATABASE_URL`, déjala con la URL
de tu base y no necesitas completar `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` ni `DB_PASSWORD`.

**3. ERP simulado** (otra terminal)

```powershell
cd erp-mock
npm install
npm run dev
```

**4. Cliente** (otra terminal)

```powershell
cd client
npm install
Copy-Item .env.example .env
npm run dev
```

Abre `http://localhost:5173`, entra a **Estado del sistema** y comprueba que servidor, base de datos
y ERP aparecen en verde.

### Usuarios de prueba

Contraseña para todos: `Gamma2026!`

| Usuario | Rol | RUT |
|---|---|---|
| Carlos Mendoza | técnico | `11.111.111-1` |
| Roberto Gómez | técnico | `22.222.222-2` |
| Marcela Soto | administrador | `33.333.333-3` |
| Cuenta de servicio ERP | erp | `SERVICIO-ERP` |

## Verificación completa

Desde la raíz del repositorio:

```powershell
npm install
npm run verificar
```

Ese comando revisa que no haya comentarios sin autoría, valida la sintaxis de todos los `.js`,
comprueba el contraste y los tamaños táctiles de la interfaz, ejecuta las 14 pruebas del backend,
las 4 del ERP, el lint del cliente y el build de producción.

## Despliegue

Resumen: **cliente en Vercel**, **API + ERP + PostgreSQL en Railway**. El detalle paso a paso está en
[docs/despliegue.md](docs/despliegue.md). No se hace `git push`: ambos despliegues se hacen por CLI
desde el computador local.

## Reglas de trabajo

1. Una rama por responsable y merge local a `main` con `git merge --no-ff`.
2. No se hace `git push` a GitHub en este proyecto.
3. Nadie cambia directamente `main` sin pasar por su rama.
4. Solo Benjamín edita `database/schema.sql` y `database/seed.sql`.
5. Los comentarios en código solo son de autoría (por ejemplo `// Desarrollado por: ...`).
6. Nunca subir `.env`, contraseñas ni evidencias subidas.
7. Una tarea está terminada cuando está probada, no cuando está escrita.

Detalle en [docs/git.md](docs/git.md).
