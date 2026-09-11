# Huellas Amarillas v4 — Yape/Plin + validación manual

Web responsive para PC/celular. No usa pasarela de pago ni cobra comisión.

## Flujo
1. Cliente registra nombre, WhatsApp, dirección, fecha, hora, cantidad y Yape/Plin.
2. Se crea una reserva `pending` y se genera un código `HA-...`.
3. Cliente paga al **954 863 571** por Yape o Plin.
4. La web abre WhatsApp con el código y los datos del pedido para que adjunte el comprobante.
5. Tú entras a `/admin.html` con tu clave privada.
6. Verificas el abono y pulsas **Confirmar pago**.
7. Solo entonces la reserva pasa a `paid` y su cantidad aumenta el contador público.
8. El cliente puede consultar su código en la web y descargar la constancia cuando el pago ya esté confirmado.

## Seguridad
- La web pública **no tiene ningún endpoint ni botón capaz de marcar una reserva como pagada**.
- `/api/admin-update-order` y `/api/admin-orders` exigen `ADMIN_KEY` en el servidor.
- La `SUPABASE_SECRET_KEY` solo vive en Vercel/servidor, nunca en HTML o JavaScript público.
- Usa una `ADMIN_KEY` larga y única (idealmente 24+ caracteres) y no la compartas.

## Entregas
- 19, 20 o 21 de septiembre de 2026.
- 9:00 a. m., 12:00 p. m., 2:00 p. m. o 4:00 p. m.
- Delivery por inDrive, pagado aparte.

## Precio
- Ramo Huellas Amarillas: **S/69.90**.
- La web pública no detalla la composición del ramo.

## Configuración de Supabase
1. Crea un proyecto en Supabase.
2. Ejecuta `supabase_schema.sql` en SQL Editor.
3. Copia Project URL y `service_role` key.

## Despliegue recomendado: Vercel
Configura estas variables de entorno:

```text
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SECRET_KEY=xxxxxxxx
ADMIN_KEY=una_clave_privada_larga_y_unica
```

Luego despliega la carpeta.

## Panel privado
Abre:

```text
https://TU-DOMINIO.com/admin.html
```

Ingresa el valor de `ADMIN_KEY`.

Puedes ver pendientes, pagados, cancelados y todos los pedidos. **Confirmar pago** cambia el estado a `paid`; el contador público suma automáticamente la cantidad de ramos de esa reserva.

## Archivos principales
- `index.html`: web pública.
- `app.js`: reserva, WhatsApp, contador y constancia.
- `admin.html` + `admin.js`: panel privado.
- `supabase_schema.sql`: base de datos.
- `api/create-reservation.js`: crea reserva pendiente.
- `api/campaign-stats.js`: contador de ramos pagados.
- `api/payment-status.js`: consulta segura por código.
- `api/admin-orders.js`: listado privado.
- `api/admin-update-order.js`: confirma/cancela/restaura pagos.

## Prueba antes de lanzar
1. Crea una reserva: el contador NO debe cambiar.
2. Abre `admin.html` y confirma el pago: el contador debe subir según la cantidad reservada.
3. Consulta el código desde la web pública: debe aparecer como pagado y habilitar la constancia.
4. Prueba en celular y PC antes de publicar el enlace.


## Modo beta local (sin Supabase ni Vercel)
Si abres `index.html` directamente desde tu PC, no existe `/api`. La v4 original mostraba `Failed to fetch` por eso.

Esta versión detecta `file://` automáticamente. También puedes forzarlo añadiendo `?beta=1` al URL.
- La reserva se guarda **solo en el navegador actual**.
- No es compartida con otros celulares/PC.
- Para probar el panel en el mismo origen abre `admin.html?beta=1` y usa la clave **demo**.
- El modo beta sirve para probar interfaz y flujo, no para recibir preventas reales.

## Prueba real entre varios dispositivos
Para que un cliente reserve desde su celular y tú lo veas en tu panel, sí necesitas desplegar la carpeta en Vercel y configurar las tres variables indicadas arriba. Luego prueba `https://TU-DOMINIO/api/health`: debe responder JSON con `ok: true`.
