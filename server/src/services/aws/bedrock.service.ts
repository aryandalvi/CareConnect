import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import { config } from '../../config/env';
import { agentTools } from '../agent/tools';

export interface BedrockAgentResponse {
  message: string;
  toolCallsExecuted: Array<{
    toolName: string;
    input: any;
    output: any;
  }>;
  isDevMode: boolean;
  tokensUsed?: number;
}

const SYSTEM_PROMPT = `You are CareConnect AI, an intelligent, empathetic, and professional healthcare scheduling and follow-up assistant.
You help patients book, reschedule, and cancel clinic appointments, view upcoming visits, and ask questions.

CRITICAL HEALTHCARE OPERATIONAL RULES:
1. Verification: When a patient inquires about existing appointments or wants to modify a booking, ensure you know their identity. Do not expose personal health details to unverified users.
2. Accuracy: NEVER invent or hallucinate available appointment slots. You MUST call the 'getAvailableSlots' tool to retrieve actual doctor availability from the clinic schedule.
3. Cancellations: Always ask for explicit patient confirmation before executing 'cancelAppointment'.
4. Empathy & Clarity: Maintain a warm, reassuring, and concise tone suitable for SMS/WhatsApp messaging.
5. Failsafe: If a tool encounters an error (e.g. double booking or invalid date), politely explain the situation and offer alternate available slots or human clinic assistance.
6. Safety Disclaimer: Make clear that you are an automated assistant and cannot provide emergency medical triage or clinical diagnosis. If the patient has severe symptoms (chest pain, shortness of breath), advise them to dial 911 or visit the nearest Emergency Room.`;

export class BedrockService {
  private client: BedrockRuntimeClient | null = null;

  constructor() {
    if (config.aws.hasCredentials) {
      this.client = new BedrockRuntimeClient({
        region: config.aws.region,
        credentials: {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
          ...(config.aws.sessionToken ? { sessionToken: config.aws.sessionToken } : {}),
        },
      });
    }
  }

  isLive(): boolean {
    return Boolean(this.client && config.aws.hasCredentials);
  }

  async runConversation(
    conversationHistory: Array<{ role: 'user' | 'assistant'; text: string }>,
    patientContext?: {
      id: string;
      name: string;
      phone: string;
      email: string;
    }
  ): Promise<BedrockAgentResponse> {
    if (!this.isLive()) {
      return this.runDevModeConversation(conversationHistory, patientContext);
    }

    try {
      const messages: any[] = conversationHistory.map(m => ({
        role: m.role,
        content: [{ text: m.text }],
      }));

      // Enrich system prompt with patient context if known
      let enrichedSystem = SYSTEM_PROMPT;
      if (patientContext) {
        enrichedSystem += `\n\nCURRENT VERIFIED PATIENT CONTEXT:
Patient ID: ${patientContext.id}
Patient Name: ${patientContext.name}
Phone: ${patientContext.phone}
Email: ${patientContext.email}`;
      }

      const toolsSpec = Object.values(agentTools).map(t => t.bedrockSpec);

      const input: ConverseCommandInput = {
        modelId: config.bedrock.modelId,
        system: [{ text: enrichedSystem }],
        messages,
        toolConfig: {
          tools: toolsSpec as any,
        },
        inferenceConfig: {
          temperature: 0.2,
          maxTokens: 1000,
        },
      };

      const command = new ConverseCommand(input);
      let response = await this.client!.send(command);

      const executedTools: Array<{ toolName: string; input: any; output: any }> = [];

      // Tool use loop (up to 3 turns)
      let turnCount = 0;
      while (response.stopReason === 'tool_use' && turnCount < 4) {
        turnCount++;
        const messageContent = response.output?.message?.content || [];
        const toolUseItems = messageContent.filter(c => c.toolUse);

        // Add assistant message containing tool use to messages array
        messages.push(response.output?.message);

        // Process all requested tools
        const toolResultContents: any[] = [];
        for (const item of toolUseItems) {
          const toolUse = item.toolUse!;
          const toolName = toolUse.name!;
          const toolInput = toolUse.input as any;

          const toolDef = agentTools[toolName];
          let toolResult: any;

          if (toolDef) {
            try {
              // Inject patientId if missing and patientContext available
              if (!toolInput.patientId && patientContext?.id) {
                toolInput.patientId = patientContext.id;
              }
              toolResult = await toolDef.execute(toolInput);
            } catch (err: any) {
              toolResult = { error: err.message };
            }
          } else {
            toolResult = { error: `Tool ${toolName} not found` };
          }

          executedTools.push({
            toolName,
            input: toolInput,
            output: toolResult,
          });

          toolResultContents.push({
            toolResult: {
              toolUseId: toolUse.toolUseId,
              content: [{ json: toolResult }],
            },
          });
        }

        // Add user response with tool outputs
        messages.push({
          role: 'user',
          content: toolResultContents,
        });

        // Run next turn of Bedrock Converse
        const followUpCommand = new ConverseCommand({
          modelId: config.bedrock.modelId,
          system: [{ text: enrichedSystem }],
          messages,
          toolConfig: {
            tools: toolsSpec as any,
          },
          inferenceConfig: {
            temperature: 0.2,
            maxTokens: 1000,
          },
        });

        response = await this.client!.send(followUpCommand);
      }

      // Extract final text response
      const finalContent = response.output?.message?.content || [];
      const textItem = finalContent.find(c => c.text);
      const replyText = textItem?.text || 'I have updated your request with the clinic.';

      return {
        message: replyText,
        toolCallsExecuted: executedTools,
        isDevMode: false,
        tokensUsed: response.usage?.totalTokens || 0,
      };
    } catch (err: any) {
      console.error('[Amazon Bedrock Error, falling back to intelligent handler]:', err.message);
      return this.runDevModeConversation(conversationHistory, patientContext);
    }
  }

  // Development simulation agent executing the exact same tools and conversational logic
  private async runDevModeConversation(
    history: Array<{ role: 'user' | 'assistant'; text: string }>,
    patientContext?: { id: string; name: string; phone: string; email: string }
  ): Promise<BedrockAgentResponse> {
    const lastUserMessage = history.filter(h => h.role === 'user').pop()?.text || '';
    const lower = lastUserMessage.toLowerCase();
    const executedTools: Array<{ toolName: string; input: any; output: any }> = [];

    const patientId = patientContext?.id || '';

    // 1. Reschedule request
    if (lower.includes('reschedule') || lower.includes("can't make it") || lower.includes('change time') || lower.includes('cannot make it')) {
      // Get patient appointments first
      let aptResult: any = { appointments: [] };
      if (patientId) {
        aptResult = await agentTools.getPatientAppointments.execute({ patientId });
        executedTools.push({
          toolName: 'getPatientAppointments',
          input: { patientId },
          output: aptResult,
        });
      }

      // Check upcoming appointment
      const upcoming = aptResult.appointments?.[0];

      // Provide tomorrow or Friday slots
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const targetDate = tomorrow.toISOString().split('T')[0];

      const slotsResult = await agentTools.getAvailableSlots.execute({
        date: targetDate,
        specialty: upcoming?.specialty,
      });

      executedTools.push({
        toolName: 'getAvailableSlots',
        input: { date: targetDate, specialty: upcoming?.specialty },
        output: slotsResult,
      });

      const slotTimes = slotsResult.slots?.slice(0, 3).map((s: any) => s.timeFormatted).join(', ') || '10:00 AM, 2:30 PM';

      return {
        message: `I can certainly help you reschedule${upcoming ? ` your appointment with Dr. ${upcoming.doctorName}` : ''}. We have openings on ${targetDate} at ${slotTimes}. Would one of those work for you, or would you prefer a different date?`,
        toolCallsExecuted: executedTools,
        isDevMode: true,
      };
    }

    // 2. Select slot to confirm reschedule or booking
    if (lower.match(/\b(10:?00|10:?30|11:?00|2:?00|2:?30|3:?00|am|pm|friday|morning|afternoon|works|book that)\b/i) && (history.length > 1)) {
      // Find open appointment to reschedule or book
      const apts = patientId ? await agentTools.getPatientAppointments.execute({ patientId }) : null;
      const targetApt = apts?.appointments?.find((a: any) => a.status !== 'CANCELLED');

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 2);
      targetDate.setHours(10, 30, 0, 0);

      if (targetApt) {
        const res = await agentTools.rescheduleAppointment.execute({
          appointmentId: targetApt.id,
          newDateTime: targetDate.toISOString(),
          reason: 'Patient requested time change via chat',
        });

        executedTools.push({
          toolName: 'rescheduleAppointment',
          input: { appointmentId: targetApt.id, newDateTime: targetDate.toISOString() },
          output: res,
        });

        return {
          message: `Great! Your appointment with Dr. ${targetApt.doctorName} has been rescheduled to ${res.newDateTimeFormatted || 'Friday at 10:30 AM'}. I've sent updated confirmations to your WhatsApp and email.`,
          toolCallsExecuted: executedTools,
          isDevMode: true,
        };
      } else {
        // Book new appointment
        const slotsResult = await agentTools.getAvailableSlots.execute({
          date: targetDate.toISOString().split('T')[0],
        });
        const firstSlot = slotsResult.slots?.[0];

        if (firstSlot && patientId) {
          const bookRes = await agentTools.bookAppointment.execute({
            patientId,
            doctorId: firstSlot.doctorId,
            specialty: firstSlot.specialty,
            dateTime: firstSlot.startTime,
            reason: 'Routine Consultation',
          });

          executedTools.push({
            toolName: 'bookAppointment',
            input: { patientId, doctorId: firstSlot.doctorId, dateTime: firstSlot.startTime },
            output: bookRes,
          });

          return {
            message: `Your appointment with Dr. ${firstSlot.doctorName} (${firstSlot.specialty}) has been booked for ${firstSlot.timeFormatted}. A confirmation has been dispatched to your email and phone!`,
            toolCallsExecuted: executedTools,
            isDevMode: true,
          };
        }
      }
    }

    // 3. Cancel request
    if (lower.includes('cancel') || lower.includes('call off')) {
      if (lower.includes('yes') || lower.includes('confirm') || lower.includes('please cancel')) {
        // Execute cancellation
        const apts = patientId ? await agentTools.getPatientAppointments.execute({ patientId }) : null;
        const toCancel = apts?.appointments?.find((a: any) => a.status !== 'CANCELLED');

        if (toCancel) {
          const cancelRes = await agentTools.cancelAppointment.execute({
            appointmentId: toCancel.id,
            reason: 'Patient requested cancellation',
            confirmed: true,
          });

          executedTools.push({
            toolName: 'cancelAppointment',
            input: { appointmentId: toCancel.id, confirmed: true },
            output: cancelRes,
          });

          return {
            message: `Your appointment with Dr. ${toCancel.doctorName} on ${toCancel.dateTimeFormatted} has been cancelled. We've sent a cancellation confirmation notice to your email. You can reach out whenever you wish to rebook!`,
            toolCallsExecuted: executedTools,
            isDevMode: true,
          };
        }
      }

      return {
        message: 'Are you sure you would like to cancel your appointment? Please reply "Yes, confirm cancellation" to finalize, or let me know if you would prefer to reschedule instead.',
        toolCallsExecuted: [],
        isDevMode: true,
      };
    }

    // 4. View appointments
    if (lower.includes('my appointment') || lower.includes('when is') || lower.includes('upcoming') || lower.includes('schedule')) {
      if (patientId) {
        const aptResult = await agentTools.getPatientAppointments.execute({ patientId });
        executedTools.push({
          toolName: 'getPatientAppointments',
          input: { patientId },
          output: aptResult,
        });

        const active = aptResult.appointments?.filter((a: any) => a.status !== 'CANCELLED') || [];
        if (active.length > 0) {
          const aptList = active.map((a: any) => `• Dr. ${a.doctorName} (${a.specialty}) on ${a.dateTimeFormatted} [Status: ${a.status}]`).join('\n');
          return {
            message: `Here are your upcoming appointments:\n\n${aptList}\n\nWould you like to confirm, reschedule, or ask any preparation questions?`,
            toolCallsExecuted: executedTools,
            isDevMode: true,
          };
        } else {
          return {
            message: 'You currently have no upcoming scheduled appointments. Would you like me to check available doctor openings to book one?',
            toolCallsExecuted: executedTools,
            isDevMode: true,
          };
        }
      }
    }

    // 5. General greeting or query
    return {
      message: `Hello! I am CareConnect AI, your clinic scheduling assistant. I can help you check upcoming appointments, book open time slots, reschedule visits, or cancel appointments. How can I assist you today?`,
      toolCallsExecuted: [],
      isDevMode: true,
    };
  }
}

export const bedrockService = new BedrockService();
