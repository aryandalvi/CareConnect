import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { getAWSStatus } from './services/aws/config.service';
import { reminderService } from './services/reminder.service';

// Import route modules
import dashboardRoutes from './routes/dashboard.routes';
import appointmentRoutes from './routes/appointment.routes';
import patientRoutes from './routes/patient.routes';
import doctorRoutes from './routes/doctor.routes';
import conversationRoutes from './routes/conversation.routes';
import notificationRoutes from './routes/notification.routes';
import reminderRoutes from './routes/reminder.routes';
import settingsRoutes from './routes/settings.routes';
import webhookRoutes from './routes/webhook.routes';

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple in-memory rate limiter for public routes
const requestCounts = new Map<string, { count: number; resetTime: number }>();
app.use('/api', (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 300;

  const record = requestCounts.get(ip);
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
  } else {
    record.count++;
    if (record.count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CareConnect AI Backend',
    timestamp: new Date().toISOString(),
    aws: getAWSStatus(),
  });
});

// API Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/webhooks', webhookRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[CareConnect Server Error]:', err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// Start Server
const server = app.listen(config.port, () => {
  const aws = getAWSStatus();
  console.log(`\n======================================================`);
  console.log(`🚀 CareConnect AI Server listening on port ${config.port}`);
  console.log(`🏥 Clinic: ${config.clinic.name}`);
  console.log(`☁️  AWS Bedrock: ${aws.bedrock.status} (${aws.bedrock.modelId})`);
  console.log(`💬 WhatsApp (Social Messaging): ${aws.socialMessaging.status}`);
  console.log(`📱 SMS: ${aws.sms.status}`);
  console.log(`📧 Amazon SES: ${aws.ses.status}`);
  console.log(`======================================================\n`);
});

// Background reminder check every 2 minutes
setInterval(async () => {
  try {
    await reminderService.processDueReminders();
  } catch (err: any) {
    console.error('[Reminder Worker Error]:', err.message);
  }
}, 120000);

export default app;
