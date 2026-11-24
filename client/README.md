# Cliente de Proyecto Gamma

PWA del técnico: inicio de sesión, órdenes asignadas, detalle de orden, escáner QR, checklist,
materiales, fotos, firma, presupuestos, resumen con envío al ERP, panel de administración y modo
sin conexión.

## Preparación

```powershell
cd client
npm install
Copy-Item .env.example .env
npm run dev
```

`VITE_API_URL` debe apuntar a la API, por defecto `http://localhost:3000/api/v1`.
Abre `http://localhost:5173`. Para que **Estado del sistema** esté en verde, levanta antes el
servidor (`server/`) y el ERP simulado (`erp-mock/`).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run lint` | Revisa el código con ESLint |
| `npm run build` | Genera la versión de producción en `dist/` |
| `npm run preview` | Sirve `dist/` localmente para probar el build |

## Pantallas y rutas

| Ruta | Pantalla | Archivo |
|---|---|---|
| `/login` | Ingreso con RUT y contraseña | `src/pages/Login.jsx` |
| `/` | Inicio y estado de las pantallas | `src/pages/Inicio.jsx` |
| `/estado` | Estado de servidor, base de datos y ERP | `src/pages/Estado.jsx` |
| `/mis-trabajos` | Órdenes asignadas al técnico | `src/pages/MisTrabajos.jsx` |
| `/orden` | Detalle, inicio y fin del servicio | `src/pages/DetalleOrden.jsx` |
| `/checklist` | Checklist y materiales | `src/pages/ChecklistInsumos.jsx` |
| `/evidencias` | Fotos y firma del cliente | `src/pages/EvidenciasFirma.jsx` |
| `/resumen` | Resumen y envío al ERP | `src/pages/Resumen.jsx` |
| `/presupuesto` | Presupuesto en terreno | `src/pages/Presupuesto.jsx` |
| `/escaner` | Escáner QR con ingreso manual | `src/pages/EscanerQR.jsx` |
| `/administracion` | Panel del administrador | `src/pages/Administracion.jsx` |

Las rutas privadas usan `src/components/RutaProtegida.jsx`: si no hay token, redirigen a `/login`.
La sesión, el token y la cola offline viven en `src/api/api.js`.

## Sin conexión

- `src/api/api.js` intercepta los errores de red y guarda las peticiones `POST`/`PUT` pendientes
  en `localStorage`. Al volver la conexión, las reenvía automáticamente.
- Los identificadores (`id_hoja`, `id_consumo`, `id_evidencia`) se generan con
  `crypto.randomUUID()` en el celular. El servidor respeta esos IDs, por lo que un reintento no
  crea duplicados.
- `public/sw.js` guarda la aplicación para abrirla sin red y `public/manifest.webmanifest` permite
  instalarla desde el navegador. El service worker solo se registra en producción.

## Prueba rápida del modo sin conexión

1. Ingresa con `11.111.111-1` / `Gamma2026!`.
2. Abre una orden y agrega un material.
3. En DevTools → Red, marca *Offline* y guarda otro material.
4. Desmarca *Offline*. La cola se vacía sola y los consumos aparecen en **Resumen**.

## Despliegue

La configuración de Vercel está en `vercel.json` (rewrite de todas las rutas a `index.html`).
Desde esta carpeta:

```powershell
vercel
vercel --prod
```

La variable de entorno `VITE_API_URL` en Vercel debe ser la URL pública de la API en Railway.
El procedimiento completo está en [../docs/despliegue.md](../docs/despliegue.md).

## Estilo de código

Los comentarios están prohibidos salvo la línea de autoría al inicio de cada archivo, por ejemplo
`// Desarrollado por: Robert Ramírez`. La raíz del repositorio incluye
`npm run verificar:comentarios` para comprobarlo.
