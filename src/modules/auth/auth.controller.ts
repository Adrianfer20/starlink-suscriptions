import { Request, Response } from 'express';
import * as service from './auth.service';
import logger from '../../utils/logger';

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password, role, displayName, phoneNumber } = req.body;
    if (!email || !password || !role) return res.status(400).json({ message: 'Missing required fields' });
    const user = await service.createUser({ email, password, role, displayName, phoneNumber });
    return res.status(201).json(user);
  } catch (err: any) {
    logger.error('create user error', err);
    return res.status(500).json({ message: 'Internal error', error: err.message });
  }
};

export default { registerUser };
