import { Router } from 'express';
import * as controller from './inbox.controller';

const router = Router();

// POST /webhooks/twilio/whatsapp
router.post('/twilio/whatsapp', controller.twilioWhatsappWebhook);

export default router;
