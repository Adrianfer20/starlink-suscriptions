import app from './app';
import env from './config/env';
import { scheduleBillingCron } from './cron/billing.cron';
import logger from './utils/logger';

const port = env.port || 3000;

app.listen(port, () => {
  logger.info('Server started', { port });
  // Schedule cron job
  scheduleBillingCron();
});
