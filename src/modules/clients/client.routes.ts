import { Router } from 'express';
import * as controller from './client.controller';
import { validateClient } from '../../middleware';

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

router.post('/', validateClient, controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.put('/:id', validateClient, controller.update);

export default router;
