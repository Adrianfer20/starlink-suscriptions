import { Router } from 'express';
import * as controller from './inbox.controller';

const router = Router();

// GET /conversations
router.get('/', controller.listConversations);

// GET /conversations/:conversationId/messages
router.get('/:conversationId/messages', controller.listMessages);

// POST /conversations/:conversationId/messages
router.post('/:conversationId/messages', controller.sendMessage);

export default router;
