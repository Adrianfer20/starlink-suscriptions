import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

export const requireRole = (allowedRoles: string | string[]) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthenticated' });
    if (!user.role) return res.status(403).json({ message: 'Role not assigned' });
    if (!roles.includes(user.role)) return res.status(403).json({ message: 'Forbidden' });
    return next();
  };
};

export default requireRole;
