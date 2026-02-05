import admin from 'firebase-admin';
import env from './env';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

function initFirebase() {
  if (admin.apps.length) return admin.app();

  try {
    // 1) If a service account path is provided (preferred), load it
    const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || env.firebase.serviceAccountPath;
    if (saPath) {
      const resolved = path.isAbsolute(saPath) ? saPath : path.resolve(process.cwd(), saPath);
      const raw = fs.readFileSync(resolved, 'utf8');
      const serviceAccount = JSON.parse(raw);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      logger.info('Firebase initialized using service account file', { path: resolved });
      return admin.app();
    }

    // 2) If private key + clientEmail + projectId are provided via env, use them
    if (env.firebase.privateKey && env.firebase.clientEmail && env.firebase.projectId) {
      const privateKey = env.firebase.privateKey.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.firebase.projectId,
          clientEmail: env.firebase.clientEmail,
          privateKey
        })
      });
      logger.info('Firebase initialized using env variables for service account');
      return admin.app();
    }

    // 3) Fallback to default credentials (e.g., GCE/GCF environment)
    admin.initializeApp();
    logger.info('Firebase initialized using default application credentials');
    return admin.app();
  } catch (err: any) {
    logger.error('Failed to initialize Firebase', err);
    throw err;
  }
}

export default initFirebase;
