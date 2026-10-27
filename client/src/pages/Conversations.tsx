import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import {
  Send,
  Bot,
  User,
  Wrench,
  Trash2,
  Sparkles,
  Radio,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../api/client';
import { Conversation, Patient } from '../types';

export const Conversations: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [activeChannel, setActiveChannel] = useState<'WHATSAPP' | 'SMS' | 'WEB_SIMULATOR'>(
    'WHATSAPP'
  );
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [convData, patData] = await Promise.all([
        api.getConversations(),
        api.getPatients(),
      ]);
      setConversations(convData);
      setPatients(patData);

      if (convData.length > 0) {
        const fullConv = await api.getConversationById(convData[0].id);
        setSelectedConversation(fullConv);
        setSelectedPatientId(fullConv.patientId);
        setActiveChannel(fullConv.channel || 'WHATSAPP');
      } else if (patData.length > 0) {
        setSelectedPatientId(patData[0].id);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  const handleSelectConversation = async (convId: string) => {
    try {
      const full = await api.getConversationById(convId);
      setSelectedConversation(full);
      setSelectedPatientId(full.patientId);
      setActiveChannel(full.channel || 'WHATSAPP');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handlePatientChange = async (patientId: string) => {
    setSelectedPatientId(patientId);
    // Find existing conversation for this patient or keep null
    const existing = conversations.find((c) => c.patientId === patientId);
    if (existing) {
      handleSelectConversation(existing.id);
    } else {
      setSelectedConversation(null);
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || sending) return;

    try {
      setSending(true);
      setInputText('');

      const res = await api.sendChatMessage({
        patientId: selectedPatientId,
        conversationId: selectedConversation?.id,
        messageText: textToSend,
        channel: activeChannel,
      });

      // Reload full conversation
      const full = await api.getConversationById(res.conversationId);
      setSelectedConversation(full);

      // Refresh list
      const list = await api.getConversations();
      setConversations(list);
    } catch (err: any) {
      alert(`Chat error: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleClearHistory = async () => {
    if (!selectedConversation?.id) return;
    if (!confirm('Clear message history for this conversation?')) return;

    try {
      await api.clearConversationMessages(selectedConversation.id);
      const full = await api.getConversationById(selectedConversation.id);
      setSelectedConversation(full);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const quickPrompts = [
    "I have an appointment tomorrow, but I can't make it.",
    'Friday morning at 10:30 AM works.',
    'What appointments do I have coming up?',
    'I need to cancel my appointment.',
    'Yes, please confirm cancellation.',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-180px)]">
      {/* LEFT: Conversation Threads & Patient Selector (1 Col) */}
      <Card className="lg:col-span-1 flex flex-col h-full">
        <CardHeader
          title="Patient Threads"
          subtitle="Cross-channel conversation records"
        />
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Simulate As Patient:
          </label>
          <select
            value={selectedPatientId}
            onChange={(e) => handlePatientChange(e.target.value)}
            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} &bull; {p.phoneNumber}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No conversations started yet. Type a message below to start one!
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = selectedConversation?.id === conv.id;
              const lastMsg = conv.messages?.[0]?.content || 'Started conversation';
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`w-full text-left p-3.5 transition-colors ${
                    isSelected ? 'bg-sky-50/80 border-l-4 border-sky-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-800">
                      {conv.patient.firstName} {conv.patient.lastName}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-slate-100 text-slate-600">
                      {conv.channel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">{lastMsg}</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {format(new Date(conv.lastMessageAt), 'MMM d, h:mm a')}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </Card>

      {/* RIGHT: Chat Area & Tool Call Visualizer (3 Cols) */}
      <Card className="lg:col-span-3 flex flex-col h-full">
        {/* Chat Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800">
                  {selectedConversation?.patient
                    ? `${selectedConversation.patient.firstName} ${selectedConversation.patient.lastName}`
                    : 'CareConnect Agent Sandbox'}
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                  Verified Patient Context Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Channel: <strong className="text-slate-700 font-medium">{activeChannel}</strong>{' '}
                &bull; Amazon Bedrock Agent with Tool Invocation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Channel switch */}
            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px]">
              {(['WHATSAPP', 'SMS', 'WEB_SIMULATOR'] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setActiveChannel(ch)}
                  className={`px-2 py-1 rounded font-medium transition-colors ${
                    activeChannel === ch ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {ch === 'WEB_SIMULATOR' ? 'Web' : ch}
                </button>
              ))}
            </div>

            {selectedConversation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                title="Clear History"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" />
              </Button>
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
          {(!selectedConversation || selectedConversation.messages?.length === 0) && (
            <div className="text-center py-12 max-w-md mx-auto space-y-3">
              <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">
                Test the Conversational Healthcare Assistant
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                The agent parses natural language patient messages, checks real doctor availability,
                reschedules appointments, prevents double bookings, and sends confirmation emails via SES.
              </p>
            </div>
          )}

          {selectedConversation?.messages?.map((msg: any) => {
            const isPatient = msg.senderType === 'PATIENT';
            let metadataObj: any = null;
            try {
              if (msg.metadata) metadataObj = JSON.parse(msg.metadata);
            } catch {}

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isPatient ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                    isPatient
                      ? 'bg-sky-600 text-white rounded-br-none'
                      : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-none'
                  }`}
                >
                  {/* Sender label and channel */}
                  <div
                    className={`flex items-center gap-1.5 mb-1 text-[10px] font-semibold tracking-wide ${
                      isPatient ? 'text-sky-200' : 'text-teal-700'
                    }`}
                  >
                    {isPatient ? (
                      <>
                        <User className="w-3 h-3" />
                        <span>PATIENT &bull; {msg.channel}</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-3 h-3" />
                        <span>CARECONNECT AI ASSISTANT</span>
                        {metadataObj?.isDevMode ? (
                          <span className="ml-1 text-[9px] px-1 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                            DEV MODE
                          </span>
                        ) : (
                          <span className="ml-1 text-[9px] px-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                            AWS BEDROCK
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Content with whitespace preserve */}
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  <div
                    className={`text-[9px] mt-1.5 text-right ${
                      isPatient ? 'text-sky-200' : 'text-slate-400'
                    }`}
                  >
                    {format(new Date(msg.createdAt), 'h:mm a')}
                  </div>
                </div>

                {/* Visible Tool Execution Metadata Box */}
                {!isPatient && metadataObj?.toolCalls && metadataObj.toolCalls.length > 0 && (
                  <div className="max-w-[80%] p-3 rounded-xl bg-slate-100/90 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                      <Wrench className="w-3.5 h-3.5 text-sky-600" />
                      <span>Executed Backend Tool Calls ({metadataObj.toolCalls.length}):</span>
                    </div>

                    {metadataObj.toolCalls.map((tool: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <code className="text-[11px] font-bold text-sky-700 font-mono">
                            {tool.toolName}()
                          </code>
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Validated
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono bg-slate-50 p-1.5 rounded">
                          <strong>Input:</strong> {JSON.stringify(tool.input)}
                        </div>
                        <div className="text-[10px] text-slate-600 font-mono bg-slate-50 p-1.5 rounded truncate">
                          <strong>Output:</strong> {JSON.stringify(tool.output)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Chips */}
        <div className="px-5 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Suggested Prompts:
          </span>
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(p)}
              disabled={sending}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 border border-slate-200 transition-colors whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={`Type a patient message as ${
                selectedConversation?.patient?.firstName || 'Patient'
              }...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={sending}
              className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:bg-white text-slate-800"
            />
            <Button
              type="submit"
              size="md"
              isLoading={sending}
              disabled={!inputText.trim()}
              className="rounded-xl px-4"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};
