import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import clientRoutes from './modules/clients/client.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import cronRoutes from './cron/cron.routes';
import logger from './utils/logger';
import webhookRoutes from './modules/inbox/webhook.routes';
import conversationsRoutes from './modules/inbox/conversations.routes';

const app = express();

// When running behind a proxy/tunnel (ngrok/localtunnel) trust the proxy so
// `req.protocol` and `req.get('host')` reflect the original request. This is
// important for Twilio signature validation which uses the full URL.
app.set('trust proxy', true);

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('dev'));

app.use('/clients', clientRoutes);
app.use('/notifications', notificationRoutes);
app.use('/cron', cronRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/conversations', conversationsRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error('unhandled error', err);
  res.status(500).json({ message: 'Internal error' });
});

export default app;
