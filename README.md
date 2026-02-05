# Starlink API

API REST para gestionar clientes y enviar notificaciones de vencimiento vía WhatsApp (Twilio).
## How to run (local)

1. Copiar `.env.example` a `.env` y completar variables.
## Deploy to GitHub + Railway (recommended)

1. Create a new GitHub repository and push the project:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin git@github.com:<your-org>/<repo>.git
git branch -M main
git push -u origin main
```

2. Important: DO NOT commit `starlink-suscription-firebase-adminsdk-fbsvc-a801754dc8.json` nor any `.env` with secrets. The repo already has `.gitignore` configured to ignore those files.

3. Connect the repository in Railway:
	- In Railway, create a new project → Deploy from GitHub → select this repo and the `main` branch.
	- Set Build Command: `npm run build`
	- Set Start Command: `node dist/server.js`
	- Add environment variables in Railway (FIREBASE_*, TWILIO_*, CRON_SECRET, NOTIF_RETRY_MINUTES). For `FIREBASE_PRIVATE_KEY` paste the key with `\n` escaped newlines or use the individual envs.

4. Verify deployment logs in Railway. For manual cron run use:

```bash
curl "https://<your-railway-url>/cron/billing?secret=<CRON_SECRET>"
```

If you prefer CI-controlled deploys, keep GitHub Actions for CI and let Railway handle deployment (auto-deploy on push to `main`).
Ejemplo de job en Google Cloud Scheduler (invocando URL HTTP):

1. Asegúrate de que `CRON_SECRET` esté almacenado de forma segura (Secret Manager) y que tu job incluya el header `Authorization: Bearer <CRON_SECRET>`.
Notas de seguridad:

- No expongas el `CRON_SECRET` en el repositorio. Usa un Secret Manager y variables de entorno en el entorno de ejecución.  
- El endpoint únicamente lanza el proceso en segundo plano; `processBilling()` usa un lock distribuido en Firestore para evitar ejecuciones concurrentes desde múltiples réplicas.

API Routes
----------

Endpoints disponibles:

- `POST /clients` — Crea un cliente.
	- Body JSON: `{ nombre, apellido, email, telefono, cedula, billingDate }`.
	- Respuesta: `201` + objeto cliente.

Esquema de Cliente (API pública - Español)
---------------------------------------

La API pública acepta y devuelve campos en español para compatibilidad con clientes externos. Internamente la aplicación normaliza los datos a nombres canónicos en inglés. A continuación se muestra el mapeo y un ejemplo.

- Campo público (JSON) : nombre interno (variables)
	- `nombre` : `name`
	- `apellido` : `lastName`
	- `email` : `email`
	- `telefono` : `phone` (formato `+<country><number>`)
	- `cedula` : `idNumber`
	- `billingDate` : `billingDate` (ISO YYYY-MM-DD)
	- `plan` : `plan`
	- `amount` : `amount`

Ejemplo de request (public API, español):

```json
{
	"nombre": "Juan",
	"apellido": "Pérez",
	"email": "juan@example.com",
	"telefono": "+584161005606",
	"cedula": "V12345678",
	"billingDate": "2026-02-01",
	"plan": "starlink-basic",
	"amount": "$50"
}
```

Notas:
- Internamente el servicio normaliza estos campos a claves en inglés (`name`, `phone`, etc.) antes de procesar plantillas Twilio y lógica de negocio.
- Las plantillas de Twilio usan parámetros en un orden específico; el mapeo y la generación de parámetros se gestiona en `src/modules/notifications/template.mapper.ts`.


- `GET /clients` — Lista clientes.
	- Respuesta: `200` + array de clientes.

- `GET /clients/:id` — Obtiene cliente por id.
	- Respuesta: `200` + cliente | `404`.

- `PUT /clients/:id` — Actualiza cliente.
	- Body JSON: campos a actualizar. Si `billingDate` cambia, `status` se recalcula.

- `POST /notifications/send/:clientId?template=<template_key>` — Envía plantilla WhatsApp.
	- Query `template`: clave en `template.mapper`.
	- Respuestas: `200` (ok) | `400/404/500`.

- `POST /cron/billing` — Inicia proceso de facturación/notificaciones (protegido por `CRON_SECRET`).

OpenAPI / Swagger
------------------

Hay un archivo OpenAPI en `docs/openapi.yaml` con la especificación de los endpoints y ejemplos.

Cómo usarlo:

- Ver online: copia el contenido de `docs/openapi.yaml` en https://editor.swagger.io/ para explorar la API interactivamente.
- Ejecutarlo localmente con `swagger-ui` (Docker):

```bash
docker run --rm -p 8080:8080 -v $(pwd)/docs:/usr/share/nginx/html:ro swaggerapi/swagger-ui
# luego abre http://localhost:8080/openapi.yaml en el navegador (o usa la UI para cargar el YAML)
```


# Starlink API

API REST para gestionar clientes y enviar notificaciones de vencimiento vía WhatsApp (Twilio).

Estructura básica y scripts en `package.json`.

Instrucciones rápidas:

1. Copiar `.env.example` a `.env` y completar variables.
2. Instalar dependencias: `npm install`.
3. Desarrollo: `npm run dev`.

Alcance y notas importantes:

- Alcance: Esta API NO realiza procesamientos de pago ni gestiona cobros. Su función es gestionar el registro de clientes, enviar notificaciones (WhatsApp vía Twilio) sobre vencimientos/suspensiones y actualizar el estado del servicio en Firestore (`ACTIVO` / `POR_VENCER` / `SUSPENDIDO`).

Endpoints / pruebas HTTP (Supertest)

Casos típicos a probar con `supertest(app)`:

- Crear cliente exitoso → `POST /clients` devuelve `201` y body con `id`.
- Validación faltante → `POST /clients` sin campos requeridos → `400`.
- Obtener inexistente → `GET /clients/:id` → `404`.
- Actualizar → `PUT /clients/:id` → `200` y `status` recalculado si cambia `billingDate`.
- Envío de notificación → `POST /notifications/send/:clientId?template=...` → `200` o `500` según resultado.

Implementación de pruebas: usa `supertest(app)`; el proyecto ya expone `__setCollection` en los servicios para inyectar colecciones mock y así evitar usar Firestore real durante los tests.

Invocar el scheduler (/cron/billing)

Esta API expone un endpoint protegido para lanzar manualmente el proceso de facturación/notificaciones:

- `POST /cron/billing`
- Autenticación: enviar el secreto en el header `x-cron-secret: <CRON_SECRET>` o `Authorization: Bearer <CRON_SECRET>`.
- El endpoint inicia `processBilling()` en background y devuelve inmediatamente `{ ok: true, message: 'Billing process started' }`.

Ejemplo `curl`:

```bash
curl -X POST https://your-api.example.com/cron/billing \
	-H "x-cron-secret: $CRON_SECRET"
```

Ejemplo de job en Google Cloud Scheduler (invocando URL HTTP):

1. Asegúrate de que `CRON_SECRET` esté almacenado de forma segura (Secret Manager) y que tu job incluya el header `Authorization: Bearer <CRON_SECRET>`.
2. Comando `gcloud` de ejemplo:

```bash
gcloud scheduler jobs create http billing-daily \
	--schedule="5 0 * * *" \
	--uri="https://your-api.example.com/cron/billing" \
	--http-method=POST \
	--oauth-service-account-email=SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com \
	--headers="Authorization: Bearer $CRON_SECRET"
```

Notas de seguridad:

- No expongas el `CRON_SECRET` en el repositorio. Usa un Secret Manager y variables de entorno en el entorno de ejecución.  
- El endpoint únicamente lanza el proceso en segundo plano; `processBilling()` usa un lock distribuido en Firestore para evitar ejecuciones concurrentes desde múltiples réplicas.

