import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import clientRoutes from './modules/clients/client.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import cronRoutes from './cron/cron.routes';
import logger from './utils/logger';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/clients', clientRoutes);
app.use('/notifications', notificationRoutes);
app.use('/cron', cronRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error('unhandled error', err);
  res.status(500).json({ message: 'Internal error' });
});

export default app;
