import { Request, Response } from 'express';
import * as service from './client.service';
import logger from '../../utils/logger';

export const create = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const required = ['nombre','apellido','email','telefono','cedula','billingDate'];
    for (const f of required) if (!body[f]) return res.status(400).json({ message: `Missing ${f}` });

    const client = await service.createClient({ ...body, status: 'ACTIVO' });
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
    return res.json(c);
  } catch (err) {
    logger.error('get client error', err);
    return res.status(500).json({ message: 'Internal error' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await service.updateClient(id, req.body);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    return res.json(updated);
  } catch (err) {
    logger.error('update client error', err);
    return res.status(500).json({ message: 'Internal error' });
  }
};
