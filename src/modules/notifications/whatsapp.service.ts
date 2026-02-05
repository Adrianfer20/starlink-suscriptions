import twilioClient from '../../config/twilio';
import logger from '../../utils/logger';
import env from '../../config/env';

type SendResult = { success: true; sid: string } | { success: false; error: any };

/**
 * Send a WhatsApp template message using Twilio.
 * Prefer `templateSid` (contentSid) with `contentVariables` as a map of placeholder index to value.
 * If `templateSid` is not provided, fall back to the content.template approach.
 */
export const sendTemplateMessage = async (
  to: string,
  templateIdentifier: { templateSid?: string; templateName?: string },
  bodyParams: string[] = [],
  language = 'es'
): Promise<SendResult> => {
  const toPhone = `whatsapp:${to.replace(/^\+/, '')}`;

  // If template SID is provided, use contentSid + contentVariables
  if (templateIdentifier.templateSid) {
    try {
      const contentVariables: Record<string, string> = {};
      bodyParams.forEach((p, i) => (contentVariables[String(i + 1)] = String(p)));

      const msg = await (twilioClient as any).messages.create({
        from: env.twilio.whatsappFrom,
        to: toPhone,
        contentSid: templateIdentifier.templateSid,
        contentVariables: JSON.stringify(contentVariables)
      });

      logger.info('whatsapp template sent (by SID)', { sid: msg.sid, to: toPhone, templateSid: templateIdentifier.templateSid });
      return { success: true, sid: msg.sid };
    } catch (err: any) {
      logger.error('whatsapp send error (by SID)', err);
      return { success: false, error: err.message || err };
    }
  }

  // Fallback: use template name + content.template
  try {
    const parameters = bodyParams.map(p => ({ type: 'text', text: p }));
    const content = [
      {
        type: 'template',
        template: {
          name: templateIdentifier.templateName,
          language: { code: language },
          components: [
            {
              type: 'body',
              parameters
            }
          ]
        }
      }
    ];

    const msg = await (twilioClient as any).messages.create({
      from: env.twilio.whatsappFrom,
      to: toPhone,
      content
    });

    logger.info('whatsapp template sent (by name)', { sid: msg.sid, to: toPhone, template: templateIdentifier.templateName });
    return { success: true, sid: msg.sid };
  } catch (err: any) {
    logger.error('whatsapp send error (by name)', err);
    return { success: false, error: err.message || err };
  }
};
