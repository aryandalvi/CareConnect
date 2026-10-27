import { Router, Request, Response } from 'express';
import { agentService } from '../services/agent/agent.service';
import prisma from '../db/prisma';
import { config } from '../config/env';

const router = Router();

// AWS End User Messaging Social (WhatsApp webhook)
router.post('/whatsapp', async (req: Request, res: Response) => {
  try {
    // Optional webhook verification token
    const token = req.headers['x-webhook-token'] || req.query['hub.verify_token'];
    if (config.auth.webhookSecret && token && token !== config.auth.webhookSecret) {
      return res.status(401).json({ error: 'Unauthorized webhook' });
    }

    // Meta Webhook verification handshake
    if (req.query['hub.mode'] === 'subscribe') {
      const challenge = req.query['hub.challenge'];
      return res.status(200).send(challenge);
    }

    const body = req.body;
    console.log('[Inbound WhatsApp Webhook received]:', JSON.stringify(body, null, 2));

    // Handle Meta / AWS Social Messaging standard payload structure
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (messages && messages.length > 0) {
      const incoming = messages[0];
      const fromPhone = incoming.from; // e.g. "15551234567"
      const text = incoming.text?.body || '';

      if (text) {
        // Idempotency check: see if we already processed this message ID
        const existing = await prisma.message.findFirst({
          where: { externalMessageId: incoming.id },
        });

        if (!existing) {
          await agentService.handleInboundMessage({
            phoneNumber: fromPhone,
            messageText: text,
            channel: 'WHATSAPP',
          });
        }
      }
    }

    // Also support simplified payload for direct testing / curl
    if (body.from && body.text) {
      await agentService.handleInboundMessage({
        phoneNumber: body.from,
        messageText: body.text,
        channel: 'WHATSAPP',
      });
    }

    res.status(200).json({ status: 'PROCESSED' });
  } catch (err: any) {
    console.error('WhatsApp Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AWS End User Messaging SMS inbound webhook
router.post('/sms', async (req: Request, res: Response) => {
  try {
    const { originationNumber, destinationNumber, messageBody, messageId } = req.body;
    console.log('[Inbound SMS received]:', req.body);

    if (messageBody && originationNumber) {
      if (messageId) {
        const existing = await prisma.message.findFirst({
          where: { externalMessageId: messageId },
        });
        if (existing) {
          return res.status(200).json({ status: 'ALREADY_PROCESSED' });
        }
      }

      await agentService.handleInboundMessage({
        phoneNumber: originationNumber,
        messageText: messageBody,
        channel: 'SMS',
      });
    }

    res.status(200).json({ status: 'PROCESSED' });
  } catch (err: any) {
    console.error('SMS Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AWS SNS Delivery Status webhook (for SES and Social Messaging delivery events)
router.post('/delivery-events', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    // Update notification status if externalMessageId matches
    const messageId = body.MessageId || body.messageId || body.notification?.messageId;
    const eventType = body.eventType || body.event || 'DELIVERED';

    if (messageId) {
      await prisma.notification.updateMany({
        where: { externalMessageId: messageId },
        data: {
          status: eventType.includes('FAIL') || eventType.includes('BOUNCE') ? 'FAILED' : 'DELIVERED',
        },
      });
    }

    res.status(200).json({ status: 'ACKNOWLEDGED' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
