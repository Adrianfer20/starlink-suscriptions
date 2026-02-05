import { Request, Response } from 'express';
import templates from './template.mapper';
import * as clientService from '../clients/client.service';
import { sendTemplateMessage } from './whatsapp.service';
import * as notificationService from './notification.service';
import logger from '../../utils/logger';
import { validateClientForTemplate } from './validator';

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
