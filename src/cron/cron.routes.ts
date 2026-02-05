import { Router } from 'express';
import env from '../config/env';
import { processBilling } from './billing.cron';
import logger from '../utils/logger';

// Cron HTTP endpoint
// ------------------
// Este archivo expone un endpoint protegido para que un scheduler externo
// (p. ej. Cloud Scheduler) invoque el proceso de facturación/notificaciones.
//
// Seguridad:
// - Requiere el header `x-cron-secret: <CRON_SECRET>` o `Authorization: Bearer <CRON_SECRET>`.
// - El secreto se lee desde `CRON_SECRET` en las variables de entorno (ver `src/config/env.ts`).
// - El endpoint responde inmediatamente y ejecuta `processBilling()` en background.
// - `processBilling()` implementa un lock distribuido en Firestore para evitar
//   ejecuciones concurrentes en múltiples réplicas.


const router = Router();

function checkSecret(req: any) {
  const header = req.headers['x-cron-secret'] || req.headers['authorization'];
  if (!header) return false;
  const secret = String(header).startsWith('Bearer ') ? String(header).slice(7) : String(header);
  return secret === env.cron.secret && secret !== '';
}

router.post('/billing', async (req, res) => {
  if (!checkSecret(req)) return res.status(401).json({ message: 'Unauthorized' });
  try {
    // run billing process but respond quickly
    processBilling().then(() => logger.info('billing process finished (invoked via HTTP)')).catch(err => logger.error('billing process error (invoked via HTTP)', err));
    return res.json({ ok: true, message: 'Billing process started' });
  } catch (err) {
    logger.error('billing endpoint error', err);
    return res.status(500).json({ ok: false, message: 'Failed to start billing' });
  }
});

export default router;
