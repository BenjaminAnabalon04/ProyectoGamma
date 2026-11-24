# Decisiones del equipo

Este archivo deja constancia de lo que decidimos y de las simplificaciones frente a los informes
escritos antes de que el código existiera. Si el informe final dice algo distinto, prevalece lo que
está aquí y lo que se puede ejecutar en el repositorio.

## 1. Alcance

Se decidió terminar **todo el flujo pendiente más los extras**, no solo la base:

- HU-01 a HU-08, HU-10 (QR) y HU-11 (panel de administración).
- PWA instalable, cola offline, idempotencia y reintentos.
- Pruebas automáticas del backend y del ERP simulado.
- Documentación final y estándar para proyectos futuros.

## 2. Personas y ramas

Una rama por responsable, con merge local a `main` y sin `git push`:

| Responsable | Rama |
|---|---|
| Agustín Insunsa | `feature/backend-agustin-insunsa`, `feature/despliegue-agustin-insunsa` |
| Benjamín Anabalón | `feature/base-de-datos-benjamin-anabalon`, `feature/erp-mock-benjamin-anabalon` |
| Robert Ramírez | `feature/frontend-1-robert-ramirez` |
| Aaron Ponse | `feature/frontend-2-aaron-ponse` |
| Sergio | `feature/documentacion-sergio` |

Cada merge se hizo con `--no-ff` para que el historial muestre claramente el trabajo de cada persona.

## 3. Tecnologías

- **React + Vite** en el cliente: es lo que ya estaba creado y permite agrupar el build estático.
- **Node.js + Express** en la API: mismo lenguaje que el front y contrato REST simple.
- **PostgreSQL**: los datos son relacionales (clientes, órdenes, asignaciones, respuestas, stock).
- **JWT + bcryptjs**: sesión firmada y contraseñas guardadas como hash con sal.
- **ERP simulado**: un servicio Express propio en vez de depender de un sistema externo real.

## 4. Simplificaciones conscientes

| Tema | Decisión | Motivo |
|---|---|---|
| Capas `services` / `repositories` | Las consultas SQL quedaron en los controladores | El equipo es nuevo y Reduce archivos sin perder validación ni parametrización |
| ERP | Servicio en memoria con `FALLAR=1` | Permite probar reintentos sin un sistema real |
| Evidencias | Imagen en base64 dentro de JSON y archivo en `server/uploads/` | Evita configurar almacenamiento de objetos en el alcance actual |
| Offline | Cola en `localStorage` para operaciones `POST`/`PUT` | Suficiente para registrar en terreno y sincronizar al volver la red |
| Administración | Panel con resumen, hojas y aprobación de presupuestos | Cubre HU-11 sin agregar un framework nuevo |
| QR | `BarcodeDetector` con ingreso manual de respaldo | No todos los navegadores móviles tienen Detector disponible |

## 5. Idempotencia

El celular genera los UUID de `hoja_servicio`, `consumo_material` y `evidencia`. El servidor los
respeta y, si el mismo identifier llega otra vez, devuelve el registro existente en vez de crear uno
nuevo. El ERP simulado también devuelve el mismo `codigo_hoja_erp` para un `id_hoja` repetido.
Así, un reintento por pérdida de señal no duplica información.

## 6. Seguridad

- Todas las rutas salvo `/health` y `/auth/login` exigen `Authorization: Bearer <token>`.
- Las rutas de administración exigen además `rol === 'administrador'`.
- El técnico solo ve sus propias asignaciones, hojas, consumos, evidencias y presupuestos.
- Las consultas usan parámetros `$1`, `$2`; ningún dato del usuario se concatena al SQL.
- El mensaje de login es genérico para no revelar si el RUT existe.
- Tras 5 intentos fallidos la cuenta se bloquea 15 minutos.

## 7. Estilo de código

No se permiten comentarios explicativos. El único comentario aceptado es la línea de autoría al
inicio de cada archivo de código, por ejemplo:

```js
// Desarrollado por: Agustín Insunsa
```

El script `npm run verificar:comentarios` falla si aparece cualquier otro comentario.

## 8. Despliegue

Se eligió **Vercel + Railway** porque respeta la regla de no subir a GitHub:

- Vercel despliega `client/` desde la carpeta local con `vercel --prod`.
- Railway despliega `server/` y `erp-mock/` con `railway up ./<carpeta> --path-as-root`.
- Railway Postgres entrega `DATABASE_URL`; el servidor la detecta automáticamente.
- Las evidencias deben apuntar a un volumen persistente de Railway mediante `UPLOADS_DIR`.

Render se descartó porque su CLI está pensada principalmente para disparar deploys de servicios ya
conectados a un repositorio Git, lo que choca con nuestra decisión de no hacer push.

## 9. Lo que hay que corregir en el informe final

- Ya no está pendiente: login, JWT, órdenes, servicios, checklists, materiales, evidencias, ERP,
  pantallas reales, PWA, modo sin conexión, QR ni panel de administración.
- El informe debe decir que el despliegue es Vercel + Railway y que el flujo Git es local, sin push.
- La cola offline es local al dispositivo: no reemplaza a una sincronización entre usuarios.
- El ERP simulado guarda las hojas en memoria: al reiniciarlo pierde el historial.

## 10. Estado final

Todas las historias y tareas del repositorio están marcadas como terminadas en
[docs/tareas.md](tareas.md), y `npm run verificar` pasa sin errores.
