import { Router } from 'express';
import * as controller from './inbox.controller';
import { authenticate, requireRole } from '../../middleware';

const router = Router();

// GET /conversations
router.get('/', authenticate, requireRole('admin'), controller.listConversations);

// GET /conversations/:conversationId/messages
router.get('/:conversationId/messages', authenticate, requireRole('admin'), controller.listMessages);

// POST /conversations/:conversationId/messages
router.post('/:conversationId/messages', authenticate, requireRole('admin'), controller.sendMessage);

export default router;
