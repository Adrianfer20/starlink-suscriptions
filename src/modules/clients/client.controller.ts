import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import * as service from './client.service';
import logger from '../../utils/logger';

export const create = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const required = ['nombre','apellido','email','telefono','cedula','billingDate'];
    for (const f of required) if (!body[f]) return res.status(400).json({ message: `Missing ${f}` });
    const r = req as AuthenticatedRequest;
    const payload: any = { ...body, status: 'ACTIVO' };
    // Si la petición proviene de un usuario `client`, asignar ownerUid automáticamente
    if (r.user && r.user.role === 'client') payload.ownerUid = r.user.uid;

    const client = await service.createClient(payload);
    return res.status(201).json(client);
  } catch (err) {
    logger.error('create client error', err);
    return res.status(500).json({ message: 'Internal error' });
  }
};

export const list = async (_req: Request, res: Response) => {
  try {
    const clients = await service.listClients();
    return res.json(clients);
  } catch (err) {
    logger.error('list clients error', err);
    return res.status(500).json({ message: 'Internal error' });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const c = await service.getClientById(id);
    if (!c) return res.status(404).json({ message: 'Not found' });
    // Ownership: if caller is `client`, ensure they own the resource
    const r = req as AuthenticatedRequest;
    if (r.user && r.user.role === 'client') {
      if ((c as any).ownerUid !== r.user.uid) return res.status(403).json({ message: 'Forbidden' });
    }
    return res.json(c);
  } catch (err) {
    logger.error('get client error', err);
    return res.status(500).json({ message: 'Internal error' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Ownership check: fetch current and verify
    const existing = await service.getClientById(id);
    const r = req as AuthenticatedRequest;
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (r.user && r.user.role === 'client') {
      if ((existing as any).ownerUid !== r.user.uid) return res.status(403).json({ message: 'Forbidden' });
    }
    const updated = await service.updateClient(id, req.body);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    return res.json(updated);
  } catch (err) {
    logger.error('update client error', err);
    return res.status(500).json({ message: 'Internal error' });
  }
};
