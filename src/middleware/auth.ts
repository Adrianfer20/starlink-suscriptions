import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import flags from '../config/featureFlags';

// Intentamos cargar la inicialización local de Firebase si existe
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../../config/firebase');
} catch (e) {
  // noop
}

export interface AuthenticatedRequest extends Request {
  user?: { uid: string; role?: string; [key: string]: any };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Feature flag: when disabled, bypass auth checks (useful for gradual rollout)
  if (!flags.FEATURE_AUTH_ROLES) {
    req.user = { uid: process.env.DEV_ACCOUNT_UID || 'dev', role: process.env.DEV_ACCOUNT_ROLE || 'admin' } as any;
    return next();
  }
  try {
    const header = req.header('Authorization') || req.header('authorization');
    if (!header) return res.status(401).json({ message: 'No token provided' });

    const parts = header.split(' ');
    const token = parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : header;
    if (!token) return res.status(401).json({ message: 'Invalid authorization header' });

    // Facilitar tests: en `NODE_ENV=test` aceptar tokens que empiecen por `test-<role>[-<uid>]`
    if (process.env.NODE_ENV === 'test' && token.startsWith('test-')) {
      const parts = token.split('-');
      const role = parts[1] || undefined;
      // Allow uids that contain dashes by joining remaining parts
      const uid = parts.length > 2 ? parts.slice(2).join('-') : 'testuid';
      req.user = { uid, role } as any;
      return next();
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const role = (decoded as any).role || ((decoded as any).admin ? 'admin' : (decoded as any).client ? 'client' : undefined);

    const userObj: any = { ...(decoded as any) };
    userObj.role = role;
    userObj.uid = (decoded as any).uid;
    req.user = userObj;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized', error: (err as Error).message });
  }
};

export default authenticate;
