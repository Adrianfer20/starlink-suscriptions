import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

type EnvShape = {
  port: number;
  firebase: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
    serviceAccountPath: string;
  };
  twilio: {
    accountSid: string;
    authToken: string;
    whatsappFrom: string;
  };
  cron: {
    secret: string;
  };
  notifications: {
    retryMinutes: number;
  };
};

const env: EnvShape = {
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
    // Optional path to a service account JSON file. If set, file will be used.
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || ''
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || ''
  },
  cron: {
    secret: process.env.CRON_SECRET || ''
  },
  notifications: {
    retryMinutes: process.env.NOTIF_RETRY_MINUTES ? Number(process.env.NOTIF_RETRY_MINUTES) : 60
  }
};

export default env;
