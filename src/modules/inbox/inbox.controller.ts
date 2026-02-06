import { Request, Response } from 'express';
import * as service from './inbox.service';
import env from '../../config/env';
import logger from '../../utils/logger';

// Webhook for incoming WhatsApp messages from Twilio
export const twilioWhatsappWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.header('x-twilio-signature') || req.header('X-Twilio-Signature') || '';
    const authToken = env.twilio.authToken;
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const params = req.body || {};
    // Validate Twilio signature only in production (helps Postman/local testing)
    if (authToken && process.env.NODE_ENV === 'production') {
      try {
        // Debug logs to help diagnose signature mismatches in production
        logger.info('Twilio webhook validation debug', {
          signature,
          url,
          host: req.get('host'),
          protocol: req.protocol,
          contentType: req.get('content-type'),
          paramsKeys: Object.keys(params || {}),
          ip: req.ip,
        });

        const twilioLib: any = await import('twilio');
        const valid = twilioLib.validateRequest(authToken, signature, url, params);

        logger.info('Twilio signature validation result', { valid });

        if (!valid) {
          logger.warn('Invalid Twilio signature on whatsapp webhook', { url, ip: req.ip, signature });
          return res.status(403).send('Invalid signature');
        }
      } catch (err) {
        logger.warn('Twilio validation failed (skipping)', err);
      }
    }

    // Respond immediately to avoid timeouts; process persistence in background
    res.status(200).send('OK');

    const from = params.From || params.from;
    const to = params.To || params.to;
    const bodyText = params.Body || params.body || '';
    const messageSid = params.MessageSid || params.SmsSid || params.MessageSid || null;

    (async () => {
      try {
        await service.persistInbound({ from, to, body: bodyText, sid: messageSid, raw: params, timestamp: new Date().toISOString() });
      } catch (err) {
        logger.error('persistInbound failed', err);
      }
    })();

    return;
  } catch (err) {
    logger.error('twilioWhatsappWebhook error', err);
    return res.status(500).send('Internal error');
  }
};

export const listConversations = async (req: Request, res: Response) => {
  try {
    const items = await service.listConversations();
    return res.json({ success: true, count: items.length, items });
  } catch (err) {
    logger.error('listConversations error', err);
    return res.status(500).json({ message: 'Internal error' });
  }
};

export const listMessages = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    if (!conversationId) return res.status(400).json({ message: 'conversationId required' });
    const items = await service.listMessages(conversationId);
    return res.json({ success: true, count: items.length, items });
  } catch (err) {
    logger.error('listMessages error', err);
    return res.status(500).json({ message: 'Internal error' });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body || {};
    if (!conversationId) return res.status(400).json({ message: 'conversationId required' });
    if (!message) return res.status(400).json({ message: 'message body required' });

    const result = await service.sendMessage(conversationId, message);
    if (!result.success) return res.status(500).json({ message: 'Failed to send', detail: result.error });
    return res.json({ success: true, sid: result.sid });
  } catch (err) {
    logger.error('sendMessage error', err);
    return res.status(500).json({ message: 'Internal error' });
  }
};
