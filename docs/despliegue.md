# Despliegue: Vercel + Railway

El cliente se publica en **Vercel** y los procesos de Node y PostgreSQL en **Railway**.
No se usa GitHub: todo se despliega desde la carpeta local con CLI.

## 0. Comprobar antes de desplegar

Desde la raíz:

```powershell
npm install
npm run verificar
```

Debe terminar sin errores: comentarios de autoría, sintaxis, 10 pruebas del backend, 4 del ERP,
lint y build del cliente.

## 1. Railway: base de datos, API y ERP

### 1.1 Crear el proyecto

1. Instala la CLI: `npm install -g @railway/cli`.
2. Inicia sesión: `railway login`.
3. En el dashboard de Railway crea un proyecto, por ejemplo `proyecto-gamma`.
4. Agrega una base **PostgreSQL**.
5. Agrega dos servicios vacíos: `gamma-api` y `gamma-erp`.
6. En la raíz del repositorio ejecuta `railway link` y elige ese proyecto y el entorno `production`.

### 1.2 Variables de entorno del servicio `gamma-api`

Configúralas en el dashboard del servicio:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | La variable que Railway expone desde el servicio PostgreSQL |
| `JWT_SECRET` | Una clave larga y aleatoria, distinta de la del ejemplo |
| `ERP_URL` | La URL interna del servicio `gamma-erp` que muestra Railway |
| `UPLOADS_DIR` | `/app/uploads` |
| `DB_SSL` | `true` solo si Railway lo exige para conexiones externas |
| `NODE_ENV` | `production` |

`server/src/db.js` detecta `DATABASE_URL` automáticamente. Si no usas Railway Postgres, puedes
llenar `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD` en su lugar.

### 1.3 Volumen para evidencias

En el servicio `gamma-api`, crea un **Volume** y móntalo en `/app/uploads`. Sin ese volumen las
fotos y firmas se perderían cuando Railway reinicie el contenedor, porque `.gitignore` excluye
`server/uploads/`.

### 1.4 Cargar tablas y datos de prueba

Con `DATABASE_URL` configurada, ejecuta una sola vez:

```powershell
railway run --service gamma-api npm run db:reset
```

Eso ejecuta `database/schema.sql` y `database/seed.sql`.

### 1.5 Subir el código

Desde la raíz del repositorio:

```powershell
railway up ./server --path-as-root --service gamma-api
railway up ./erp-mock --path-as-root --service gamma-erp
```

`--path-as-root` es necesario porque, sin él, Railway toma la raíz del repositorio como base del
archivo. Cada servicio detecta Node automáticamente y usa su script `start`.

### 1.6 Comprobar Railway

```powershell
railway logs --service gamma-api
railway logs --service gamma-erp
```

Pruebas HTTP:

- `https://<gamma-api>.railway.app/api/v1/health`
- `https://<gamma-api>.railway.app/api/v1/health/db`
- `https://<gamma-api>.railway.app/api/v1/health/erp`

Las tres deben responder `status: ok`.

## 2. Vercel: cliente

```powershell
cd client
npm install -g vercel
vercel login
vercel
```

La primera ejecución crea el proyecto y acepta los valores detectados para Vite:

- Build Command: `npm run build`
- Output Directory: `dist`

En **Project Settings → Environment Variables** agrega:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://<gamma-api>.railway.app/api/v1` |

Luego publica:

```powershell
vercel --prod
```

El archivo `client/vercel.json` ya incluye el rewrite a `index.html`, necesario para las rutas de
React Router. El service worker solo se registra en builds de producción, así que la PWA se activa
en esta publicación.

## 3. Verificación posterior

1. Abrir la URL de Vercel y entrar a **Estado del sistema**: servidor, base de datos y ERP en verde.
2. Ingresar con `11.111.111-1` / `Gamma2026!` (técnico) y con `33.333.333-3` / `Gamma2026!`
   (administrador).
3. Seleccionar una orden, iniciar servicio, guardar checklist, agregar material, subir foto,
   dibujar firma, finalizar y enviar al ERP.
4. Revisar el panel de administración y aprobar o rechazar el presupuesto de prueba.
5. Probar el modo sin conexión: en DevTools marcar *Offline*, registrar un consumo y volver a
   conectar; la cola debe vaciarse sola.

## 4. Incidentes y rollback

- Ver logs: `railway logs --service gamma-api`.
- Repetir deploy de Railway: `railway up ./server --path-as-root --service gamma-api`.
- Volver a una publicación anterior de Vercel: `vercel rollback`.
- Si el ERP falla, el envío queda en `ERROR` y el técnico puede reintentar desde **Resumen**:
  el `id_hoja` evita duplicados.

## 5. Regla importante

No hagas `git push`. Si otro computador necesita el código, compártelo por otro medio acordado
con el equipo y vuelve a ejecutar `npm run verificar` antes de desplegar.

## 6. Despliegue realizado (24 de noviembre de 2026)

Datos reales de esta publicación:

| Elemento | Valor |
|---|---|
| Proyecto Railway | `proyecto-gamma` (`d8eb6df3-e197-4696-9467-813e5193ba41`) |
| PostgreSQL | `Postgres`, base `railway` |
| API | `gamma-api` → https://gamma-api-production.up.railway.app |
| ERP simulado | `gamma-erp` → https://gamma-erp-production.up.railway.app |
| Cliente Vercel | `proyecto-gamma-client` → https://proyecto-gamma-client.vercel.app |
| Usuario Vercel | `robertramirez-cmd` |
| Usuario Railway | `insano` |

Comandos ejecutados, en este orden:

    npm install -g vercel @railway/cli
    vercel login
    railway login --browserless
    railway init --name proyecto-gamma --json
    railway add --database postgres --json
    railway add --service gamma-api --json
    railway add --service gamma-erp --json
    railway domain --service gamma-api --json
    railway domain --service gamma-erp --json
    railway variable set 'DATABASE_URL=${{ Postgres.DATABASE_URL }}' --service gamma-api --skip-deploys
    railway variable set JWT_SECRET --stdin --service gamma-api --skip-deploys
    railway variable set 'ERP_URL=https://${{ gamma-erp.RAILWAY_PUBLIC_DOMAIN }}' --service gamma-api --skip-deploys
    railway variable set UPLOADS_DIR=/app/uploads --service gamma-api --skip-deploys
    railway variable set DB_SSL=false --service gamma-api --skip-deploys
    railway variable set NODE_ENV=production --service gamma-api --skip-deploys
    railway service link gamma-api
    railway volume add --mount-path /app/uploads --json
    railway up ./server --path-as-root --service gamma-api --detach
    railway up ./erp-mock --path-as-root --service gamma-erp --detach

Para cargar las tablas se copiaron `schema.sql` y `seed.sql` a `server/database/` (solo durante
el despliegue), se registró una clave SSH con `railway ssh keys add` y se ejecutó dentro del
contenedor:

    railway ssh --service gamma-api -- node scripts/db-reset.js

El cliente se publicó con:

    vercel deploy --prod --yes --project proyecto-gamma-client --create-if-missing \
      --build-env VITE_API_URL=https://gamma-api-production.up.railway.app/api/v1
    vercel env add VITE_API_URL production --value https://gamma-api-production.up.railway.app/api/v1 --yes
    vercel project protection disable proyecto-gamma-client --sso

La protección SSO se desactivó para que la PWA sea pública. La verificación HTTP posterior dio
200 en el cliente, `/health`, `/health/erp` y `/erp/estado`.

La carga de tablas se hizo con un proxy TCP temporal de PostgreSQL
(`junction.proxy.rlwy.net:58902`) porque la URL de Railway apunta al hostname interno
`postgres.railway.internal`, que no se resuelve fuera de Railway. El proxy y el dominio público de
PostgreSQL se eliminaron justo después de cargar `schema.sql` y `seed.sql`; `/health/db` sigue en
verde porque el API usa la red interna.

Verificación final del flujo completo en producción:

    login técnico => Carlos Mendoza / tecnico
    órdenes asignadas => 3 (OT-8842)
    servicio iniciado => EN_EJECUCION, checklist 1
    checklist => 6 respuestas guardadas
    consumo => id idempotente creado
    evidencia => archivo PNG guardado en el volumen
    finalizado => FINALIZADO
    envío al ERP => ENVIADO / HS-ERP-1001
    detalle => 6 respuestas, 1 consumo, 1 evidencia, estado ENVIADO
    resumen administración => 6 órdenes, 5 asignaciones, 1 servicio finalizado, 0 errores de envío

También se comprobó que el bundle de Vercel contiene la URL `gamma-api-production.up.railway.app`
y que `/manifest.webmanifest`, `/sw.js`, `/icon-192.svg`, `/icon-512.svg` y `/favicon.svg` responden
200 con su tipo MIME correcto.
