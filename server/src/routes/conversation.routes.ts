import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../src/db/prisma';
import { agentService } from '../services/agent/agent.service';

const router = Router();

const chatMessageSchema = z.object({
  patientId: z.string().optional(),
  conversationId: z.string().optional(),
  phoneNumber: z.string().optional(),
  messageText: z.string().min(1, 'Message text is required'),
  channel: z.enum(['WHATSAPP', 'SMS', 'WEB_SIMULATOR']).default('WEB_SIMULATOR'),
});

// List all active conversations with latest message & patient info
router.get('/', async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      orderBy: { lastMessageAt: 'desc' },
      include: {
        patient: true,
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    res.json({ success: true, data: conversations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get specific conversation with full message thread and tool call metadata
router.get('/:id', async (req, res) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        patient: {
          include: {
            appointments: {
              take: 5,
              orderBy: { dateTime: 'desc' },
              include: { doctor: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    res.json({ success: true, data: conversation });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send message to the conversational agent
router.post('/chat', async (req, res) => {
  try {
    const parsed = chatMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.errors });
    }

    const result = await agentService.handleInboundMessage({
      patientId: parsed.data.patientId,
      conversationId: parsed.data.conversationId,
      phoneNumber: parsed.data.phoneNumber,
      messageText: parsed.data.messageText,
      channel: parsed.data.channel,
    });

    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Chat error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Clear conversation history for testing
router.delete('/:id/messages', async (req, res) => {
  try {
    await prisma.message.deleteMany({
      where: { conversationId: req.params.id },
    });
    res.json({ success: true, message: 'Messages cleared' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
