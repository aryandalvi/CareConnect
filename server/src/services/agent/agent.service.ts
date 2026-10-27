import prisma from '../../db/prisma';
import { bedrockService } from '../aws/bedrock.service';
import { socialMessagingService } from '../aws/social-messaging.service';
import { smsService } from '../aws/sms.service';

export interface HandleInboundMessageParams {
  patientId?: string;
  phoneNumber?: string;
  messageText: string;
  channel: 'WHATSAPP' | 'SMS' | 'WEB_SIMULATOR';
  conversationId?: string;
}

export class AgentService {
  async handleInboundMessage(params: HandleInboundMessageParams) {
    let patient = null;

    if (params.patientId) {
      patient = await prisma.patient.findUnique({ where: { id: params.patientId } });
    } else if (params.phoneNumber) {
      const clean = params.phoneNumber.replace(/\D/g, '').slice(-10);
      patient = await prisma.patient.findFirst({
        where: { phoneNumber: { contains: clean } },
      });
    }

    // If still no patient found, look for first demo patient or create one
    if (!patient) {
      patient = await prisma.patient.findFirst();
    }

    if (!patient) {
      throw new Error('No patient profile found in database. Please run database seed.');
    }

    // Get or create conversation for this patient and channel
    let conversation = null;
    if (params.conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: params.conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.findFirst({
        where: {
          patientId: patient.id,
          channel: params.channel as any,
          status: 'ACTIVE',
        },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          patientId: patient.id,
          channel: params.channel as any,
          status: 'ACTIVE',
        },
        include: { messages: true },
      });
    }

    // Record the inbound patient message
    const inboundMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'PATIENT' as any,
        content: params.messageText,
        channel: params.channel as any,
        status: 'DELIVERED',
      },
    });

    // Build context history for Bedrock
    const pastMessages = conversation.messages.map(m => ({
      role: (m.senderType === 'PATIENT' ? 'user' : 'assistant') as 'user' | 'assistant',
      text: m.content,
    }));
    pastMessages.push({ role: 'user', text: params.messageText });

    const patientContext = {
      id: patient.id,
      name: `${patient.firstName} ${patient.lastName}`,
      phone: patient.phoneNumber,
      email: patient.email,
    };

    // Invoke Bedrock agent with tool execution
    const agentResult = await bedrockService.runConversation(pastMessages, patientContext);

    // Save agent reply to message history with tool metadata
    const agentMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'AGENT' as any,
        content: agentResult.message,
        channel: params.channel as any,
        status: 'DELIVERED',
        metadata: JSON.stringify({
          isDevMode: agentResult.isDevMode,
          tokensUsed: agentResult.tokensUsed,
          toolCalls: agentResult.toolCallsExecuted,
        }),
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // If inbound arrived from WhatsApp or SMS, send reply back through AWS Messaging
    if (params.channel === 'WHATSAPP' && patient.phoneNumber) {
      await socialMessagingService.sendTextMessage(patient.phoneNumber, agentResult.message);
    } else if (params.channel === 'SMS' && patient.phoneNumber) {
      await smsService.sendSMS(patient.phoneNumber, agentResult.message);
    }

    return {
      conversationId: conversation.id,
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      inboundMessage: inboundMsg,
      agentMessage: agentMsg,
      replyText: agentResult.message,
      toolCalls: agentResult.toolCallsExecuted,
      isDevMode: agentResult.isDevMode,
    };
  }
}

export const agentService = new AgentService();
