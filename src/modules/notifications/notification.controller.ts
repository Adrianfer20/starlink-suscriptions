import { Request, Response } from 'express';
import templates from './template.mapper';
import * as clientService from '../clients/client.service';
import { sendTemplateMessage } from './whatsapp.service';
import * as notificationService from './notification.service';
import logger from '../../utils/logger';
import { validateClientForTemplate } from './validator';
import env from '../../config/env';

export const sendForClient = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { template } = req.query as { template?: string };
    if (!template) return res.status(400).json({ message: 'template query param required' });

    const tpl = templates[template];
    if (!tpl) return res.status(400).json({ message: 'Unknown template' });

    const client = await clientService.getClientById(clientId);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    // Normalize client to canonical keys and validate
    const { normalizeClientForTemplates } = await import('./client.normalizer');
    const clientNorm = normalizeClientForTemplates(client as Record<string, any>);
    const validation = validateClientForTemplate(template, clientNorm as Record<string, any>);
    if (!validation.ok) return res.status(400).json({ message: 'Missing required client fields', missing: validation.missing });

    const params = tpl.buildParams(clientNorm);
    const to = clientNorm.phone;

    const resSend = await sendTemplateMessage(to, { templateSid: tpl.templateSid, templateName: tpl.templateName }, params, tpl.language);

    await notificationService.logNotification({ clientId, type: template, status: resSend.success ? 'SENT' : 'FAILED', detail: resSend, sentAt: new Date().toISOString(), dateTag: (clientNorm.billingDate || '').slice(0,10) });

    if (!resSend.success) return res.status(500).json({ message: 'Failed to send', detail: resSend.error });
    return res.json({ success: true, sid: resSend.sid });
  } catch (err) {
    logger.error('sendForClient error', err);
    return res.status(500).json({ message: 'Internal error' });
  }
};

// Twilio webhook to receive incoming WhatsApp/SMS messages
export const twilioWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.header('x-twilio-signature') || req.header('X-Twilio-Signature') || '';
    const authToken = env.twilio.authToken;
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const params = req.body || {};

    // Validate signature if auth token provided
    if (authToken) {
      try {
        const twilioLib: any = await import('twilio');
        const valid = twilioLib.validateRequest(authToken, signature, url, params);
        if (!valid) {
          logger.warn('Invalid Twilio signature on webhook', { url, ip: req.ip });
          return res.status(403).send('Invalid signature');
        }
      } catch (err) {
        logger.warn('Twilio validation failed (skipping)', err);
      }
    }

    // Extract common Twilio fields
    const from = params.From || params.from;
    const to = params.To || params.to;
    const bodyText = params.Body || params.body || '';
    const messageSid = params.MessageSid || params.SmsSid || params.MessageSid;

    // Persist inbound message
    try {
      await notificationService.logInboundMessage({ from, to, body: bodyText, sid: messageSid, raw: params, receivedAt: new Date().toISOString() });
    } catch (err) {
      logger.error('Failed to log inbound message', err);
    }

    // Respond 200 OK to Twilio (no TwiML response here). If you want to auto-reply,
    // implement sending via `sendTemplateMessage` or Twilio client.
    return res.status(200).send('OK');
  } catch (err) {
    logger.error('twilioWebhook error', err);
    return res.status(500).send('Internal error');
  }
};

export const listInbound = async (req: Request, res: Response) => {
  try {
    const limitRaw = req.query.limit as string | undefined;
    const limit = limitRaw ? Math.max(1, Math.min(500, Number(limitRaw))) : 50;
    const items = await (await import('./notification.service')).listInboundMessages(limit);
    return res.json({ success: true, count: items.length, items });
  } catch (err) {
    logger.error('listInbound error', err);
    return res.status(500).json({ message: 'Internal error' });
  }
};
