import { Router } from 'express';
import * as controller from './notification.controller';

const router = Router();

// Notifications routes
// --------------------
// POST /notifications/send/:clientId?template=<template_key>
//   - Envía una plantilla de WhatsApp (Twilio) al cliente especificado.
//   - Params:
//       - `clientId` (path): id del cliente en Firestore.
//       - `template` (query): clave de plantilla definida en `template.mapper` (ej: `subscription_reminder_3days`).
//   - Flujo:
//       1. Valida que la plantilla exista.
//       2. Lee el cliente desde Firestore.
//       3. Valida que el cliente tenga los campos requeridos para la plantilla.
//       4. Llama a `sendTemplateMessage` y registra el intento en `notifications`.
//   - Respuestas:
//       - 200 { success: true, sid } en caso de envío exitoso.
//       - 400/404/500 según correspondan (validación, inexistencia, fallo en envío).

router.post('/send/:clientId', controller.sendForClient);

// Twilio webhook endpoint to receive incoming messages (WhatsApp/SMS)
router.post('/webhook/twilio', controller.twilioWebhook);
// List inbound messages received from Twilio
router.get('/inbound', controller.listInbound);

export default router;
