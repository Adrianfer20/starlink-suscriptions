import { Request, Response, NextFunction } from 'express';
import { normalizeClientForTemplates } from '../modules/notifications/client.normalizer';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\+\d{7,15}$/;
const isoDateRe = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(s: any) {
  if (typeof s !== 'string') return false;
  if (!isoDateRe.test(s)) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

export default function validateClient(req: Request, res: Response, next: NextFunction) {
  const method = req.method;
  const body = req.body || {};

  // Normalize to accept multiple field names (name / nombre, phone / telefono, etc.)
  const normalized = normalizeClientForTemplates(body as Record<string, any>);

  // For POST require all logical fields (after normalization).
  // Use canonical English keys for validation, but return missing fields in Spanish (public API names).
  if (method === 'POST') {
    const requiredEnglish = ['name', 'lastName', 'email', 'phone', 'idNumber', 'billingDate'];
    const publicMap: Record<string, string> = {
      name: 'nombre',
      lastName: 'apellido',
      email: 'email',
      phone: 'telefono',
      idNumber: 'cedula',
      billingDate: 'billingDate',
    };
    const missing: string[] = [];
    for (const f of requiredEnglish) {
      if (!normalized[f]) missing.push(publicMap[f] || f);
    }
    if (missing.length) return res.status(400).json({ message: 'Faltan campos requeridos', missing });
  }

  // Validate formats using normalized fields so both `email` and other variants are covered
  if (normalized.email && !emailRe.test(normalized.email)) return res.status(400).json({ message: 'Email inválido' });
  if (normalized.phone && !phoneRe.test(normalized.phone)) return res.status(400).json({ message: 'Formato de teléfono inválido. Use +<country><number>' });
  if (normalized.billingDate && !isValidDateString(normalized.billingDate)) return res.status(400).json({ message: 'billingDate inválido. Use YYYY-MM-DD' });

  // replace body with normalized values for downstream handlers
  req.body = { ...body, ...normalized };

  next();
}
