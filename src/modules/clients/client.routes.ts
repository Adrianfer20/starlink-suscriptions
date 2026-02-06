import { Router } from 'express';
import * as controller from './client.controller';
import { validateClient, authenticate, requireRole } from '../../middleware';

const router = Router();

// Clients routes
// ----------------
// POST /clients
//   - Crea un nuevo cliente.
//   - Body requerido: `nombre`,`apellido`,`email`,`telefono`,`cedula`,`billingDate` (YYYY-MM-DD).
//   - Respuesta: 201 + objeto cliente creado (incluye `id`, `status`, `createdAt`).
//
// GET /clients
//   - Lista todos los clientes.
//   - Respuesta: 200 + array de clientes.
//
// GET /clients/:id
//   - Obtiene un cliente por `id`.
//   - Respuesta: 200 + cliente | 404 si no existe.
//
// PUT /clients/:id
//   - Actualiza campos de cliente. Si `billingDate` cambia, el `status` se recalcula.
//   - Body: campos a actualizar.
//   - Respuesta: 200 + cliente actualizado | 404 si no existe.

// Fase piloto: rutas protegidas
// Crear cliente: sólo `admin` (ajustar si se desea permitir self-registration)
router.post('/', authenticate, requireRole('admin'), validateClient, controller.create);
// Listado completo: sólo `admin`
router.get('/', authenticate, requireRole('admin'), controller.list);
// Obtener por id: `admin` o `client`
router.get('/:id', authenticate, requireRole(['admin', 'client']), controller.getById);
// Actualizar: `admin` o `client`
router.put('/:id', authenticate, requireRole(['admin', 'client']), validateClient, controller.update);

export default router;
