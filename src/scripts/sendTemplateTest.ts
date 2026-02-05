import { sendTemplateMessage } from '../modules/notifications/whatsapp.service';
import logger from '../utils/logger';

async function run() {
  const to = '+584161005606';
  const templateSid = 'HX5087e5a665544471a058eec56fb37431';
  const language = 'es';
  // Params: name, subscription, billing date, amount
  const bodyParams = ['Edgarlis', 'KIT982M928G43JT', '2026-02-08', '$50'];

  logger.info('Sending test template (by SID)', { to, templateSid });
  const res = await sendTemplateMessage(to, { templateSid }, bodyParams, language);
  logger.info('Send result', res);
}

run().catch(err => {
  logger.error('Test send failed', err);
  process.exit(1);
});
