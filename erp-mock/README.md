# ERP simulado

Servidor de mentira que hace de "oficina": recibe las hojas de servicio que envía el servidor de Gamma. Puerto 4000.

## Cómo levantarlo

```
cd erp-mock
npm install
node index.js
```

Debe aparecer `ERP simulado escuchando en http://localhost:4000`.

## Rutas

- `GET /erp/estado`: responde `{ status, hojas_recibidas }`. Sirve para comprobar que está vivo.
- `POST /erp/servicios`: recibe una hoja (necesita `id_hoja`) y responde `{ recibido: true, codigo_hoja_erp }`. Si llega la misma hoja de nuevo, responde el mismo código y no la duplica.

## Probar el fallo (para el reintento)

Para que responda error 503 en vez de recibir:

```
$env:FALLAR = "1"
node index.js
```

Para volver al modo normal:

```
Remove-Item Env:FALLAR
node index.js
```

Nota: el ERP guarda las hojas solo en memoria, así que al reiniciarlo se olvida de todas.