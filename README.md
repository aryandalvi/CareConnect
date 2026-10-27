# CareConnect AI — AI-Powered Healthcare Communication Agent

> **AWS Communication Developer Services (CDS) Agentic AI Partner Hackathon**  
> Demonstrating seamless healthcare appointment scheduling, rescheduling, cancellations, and clinical follow-ups across **WhatsApp**, **SMS**, and **Email (SES)** powered by **Amazon Bedrock**.

[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![AWS SDK v3](https://img.shields.io/badge/AWS_SDK-v3-FF9900?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/sdk-for-javascript/)

---

## 🌟 Executive Summary

**CareConnect AI** solves one of healthcare's biggest operational challenges: patient appointment coordination and no-shows. By uniting **AWS End User Messaging Social** (WhatsApp Business), **AWS End User Messaging SMS**, and **Amazon Simple Email Service (SES)** with **Amazon Bedrock**, CareConnect AI enables patients to schedule, reschedule, and manage clinical visits conversationally from the messaging apps they use every day.

The conversational AI assistant interacts with validated backend APIs—**never hallucinating slots or directly mutating database tables**—strictly respecting patient identity verification, communication consent, and doctor working hours while completely preventing double bookings.

---

## 🏗️ Architecture

```
                                  ┌────────────────────────┐
                                  │   Patient / End-User   │
                                  └───────────┬────────────┘
                                              │ (WhatsApp / SMS / Web)
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                AWS CDS Integration Layer                               │
│  ┌───────────────────────────────┐ ┌──────────────────────┐ ┌───────────────────────┐  │
│  │ AWS End User Messaging Social │ │ AWS End User Msg SMS │ │   Amazon SES (Email)  │  │
│  │      (@aws-sdk/client-        │ │  (@aws-sdk/client-   │ │    (@aws-sdk/client-  │  │
│  │       socialmessaging)        │ │ pinpoint-sms-voice)  │ │          ses)         │  │
│  └──────────────┬────────────────┘ └──────────┬───────────┘ └───────────▲───────────┘  │
└─────────────────┼─────────────────────────────┼─────────────────────────┼──────────────┘
                  │                             │                         │
                  ▼ Inbound Webhooks            ▼ Inbound Webhooks        │ Outbound Confirmations
┌─────────────────────────────────────────────────────────────────────────┴──────────────┐
│                               CareConnect Express Backend API                          │
│                                                                                        │
│  ┌───────────────────────┐        ┌─────────────────────────┐   ┌───────────────────┐  │
│  │ Inbound Event Router  │───────▶│ Conversational Agent    │◀──│ Bedrock Runtime   │  │
│  │ (WhatsApp, SMS, SES)  │        │ Engine & Context Memory │   │ (Converse API)    │  │
│  └───────────────────────┘        └───────────┬─────────────┘   └───────────────────┘  │
│                                               │ Validated Tool Execution               │
│                                               ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                               Clinical Tools Layer                               │  │
│  │  • getPatientAppointments  • getAvailableSlots     • bookAppointment             │  │
│  │  • rescheduleAppointment   • cancelAppointment     • sendAppointmentConfirmation │  │
│  │  • sendAppointmentReminder                                                       │  │
│  └────────────────────────────────────┬─────────────────────────────────────────────┘  │
│                                       │                                                │
│                                       ▼                                                │
│                      ┌─────────────────────────────────┐                               │
│                      │   Prisma ORM & PostgreSQL DB    │                               │
│                      │ (Patients, Doctors, Appts, Logs)│                               │
│                      └─────────────────────────────────┘                               │
└───────────────────────────────────────▲────────────────────────────────────────────────┘
                                        │ REST APIs
┌───────────────────────────────────────┴────────────────────────────────────────────────┐
│                           CareConnect Modern SaaS Dashboard                            │
│           (React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons)                 │
│                                                                                        │
│   [Dashboard]  [Appointments]  [Patients]  [AI Sandbox]  [Doctors]  [Logs]  [Settings] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features

### 1. AI Conversational Agent with Validated Tools
Powered by **Amazon Bedrock** (using Claude 3.5 Sonnet / Nova / Haiku via the Bedrock Converse API):
- Maintains patient conversation history and multi-turn context.
- Implements 7 strictly validated backend tools with **Zod** schema enforcement:
  1. `getPatientAppointments`: Lists upcoming and historical visits for verified patients.
  2. `getAvailableSlots`: Queries doctor working hours and returns real open time slots.
  3. `bookAppointment`: Creates a confirmed appointment; prevents double booking.
  4. `rescheduleAppointment`: Safely shifts appointment to a new open slot.
  5. `cancelAppointment`: Cancels appointment with mandatory patient confirmation guardrail.
  6. `sendAppointmentConfirmation`: Dispatches confirmation across WhatsApp and SES Email.
  7. `sendAppointmentReminder`: Triggers immediate clinical reminder notification.
- **Safety & Verification**: Requires patient identification before disclosing personal health visit details; includes emergency escalation guidance (e.g. advising 911 for acute symptoms).

### 2. Multi-Channel AWS CDS Integration
- **AWS End User Messaging Social (WhatsApp)**: Send and receive rich two-way WhatsApp messages using `@aws-sdk/client-socialmessaging`.
- **AWS End User Messaging SMS**: Send transactional reminders via `@aws-sdk/client-pinpoint-sms-voice-v2`.
- **Amazon SES**: Sends responsive HTML confirmation guides, preparation instructions (arrival times, ID requirements, fasting instructions), and cancellation receipts.
- **Dual Mode (Production & Dev Sandbox)**: Real AWS SDK v3 calls are executed when credentials are provided in `.env`. When running without live credentials, a high-fidelity **Development Simulation Mode** captures all tool calls and payloads without crashing or charging carrier fees.

### 3. Cross-Channel Conversation Continuity
Experience a unified lifecycle:
1. Patient receives an automated appointment reminder on **WhatsApp**.
2. Patient replies: *"I have an appointment tomorrow, but I can't make it. Can I reschedule for Friday morning?"*
3. The AI agent retrieves Dr. Rostova's actual schedule, identifies open slots, and proposes times.
4. Patient replies: *"10:30 AM works."*
5. The agent executes `rescheduleAppointment`, updates the database, dispatches a **WhatsApp confirmation**, and sends an updated **Amazon SES clinical preparation email**.
6. The dashboard instantly reflects the updated conversation history, audit trail, and delivery receipts.

### 4. Appointment Management & Double-Booking Prevention
- Fictional clinic doctors across **Family Medicine**, **Cardiology**, **Pediatrics**, and **Dermatology**.
- Calendar slot calculation strictly filters out existing bookings, past dates, and non-working hours.
- Atomic verification prevents concurrent overlapping bookings for the same doctor.

### 5. Automated Reminder System & Consent Enforcement
- Background scheduler checks appointments approaching their 24h/48h reminder window.
- Respects `CommunicationConsent` status (`CONSENTED` vs `REVOKED`) and `preferredChannel` (`WHATSAPP`, `SMS`, `EMAIL`).
- Includes a manual **"Run Due Reminders"** and per-appointment **"Send Test Reminder"** feature in the dashboard.

### 6. Minimal, Professional Healthcare SaaS Dashboard
Built with a white/light theme, slate/sky/teal accents, subtle borders, and readable typography:
- **Dashboard**: High-level clinical KPIs, today's visits, CDS delivery stats, and activity feed.
- **Appointments**: Searchable, filterable table with full CRUD, reschedule, and cancellation modals.
- **Patients**: Directory with contact details, verification data (DOB), and consent toggles.
- **AI Conversations**: Interactive agent sandbox with live message simulator, suggested prompts, and visible tool execution logs.
- **Doctors & Availability**: Physician profiles, working schedules, and a live slot calculator.
- **Notifications**: Cross-channel audit logs with delivery statuses (`Delivered`, `Sent`, `Failed`, `Pending`) and 1-click retry.
- **Settings**: Live AWS connection status monitor, credentials setup instructions, and immutable system audit trail.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite 5 | SPA with fast HMR |
| **Styling** | Tailwind CSS 3.4, Lucide Icons | Accessible, responsive, restrained healthcare palette |
| **Backend** | Node.js, Express, TypeScript, Zod | RESTful architecture with schema validation |
| **Database** | PostgreSQL & SQLite Fallback, Prisma ORM | Relational models, constraints, and audit logging |
| **AI / LLM** | Amazon Bedrock Runtime (`@aws-sdk/client-bedrock-runtime`) | Bedrock Converse API with toolConfig schemas |
| **WhatsApp** | AWS End User Messaging Social (`@aws-sdk/client-socialmessaging`) | Two-way WhatsApp Business Platform integration |
| **SMS** | AWS End User Messaging SMS (`@aws-sdk/client-pinpoint-sms-voice-v2`) | Transactional clinical SMS |
| **Email** | Amazon SES (`@aws-sdk/client-ses`) | Formatted HTML healthcare email templates |

---

## 📦 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later
- *(Optional)* Live AWS Account with Bedrock, End User Messaging Social/SMS, and SES configured.

### Step 1: Clone and Install Dependencies

```bash
cd d:/Projects/hackaton

# Install root orchestrator dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Step 2: Configure Environment Variables

In `server/`:
```bash
cp .env.example .env
```

Default `.env` configuration (ready for zero-setup local development):
```env
PORT=5000
NODE_ENV=development

# Database (SQLite default for instant local setup, or PostgreSQL for production)
DATABASE_URL="file:./dev.db"
# PostgreSQL Example:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/careconnect_ai?schema=public"

# AWS Configuration (Leave blank for Development Simulation Mode, or provide for Live AWS calls)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SESSION_TOKEN=

# Amazon Bedrock
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0

# AWS End User Messaging Social (WhatsApp)
AWS_WHATSAPP_PHONE_NUMBER_ID=
AWS_WHATSAPP_WABA_ID=

# AWS End User Messaging SMS
AWS_SMS_ORIGINATION_IDENTITY=

# Amazon SES
AWS_SES_FROM_EMAIL=appointments@careconnect.health

# Clinic Info
CLINIC_NAME=CareConnect Community Health Clinic
CLINIC_PHONE=+1 (800) 555-0199
CLINIC_TIMEZONE=America/New_York
```

### Step 3: Initialize Database & Seed Sample Clinic Data

```bash
cd server

# Initialize database schema (SQLite dev mode)
npm run prisma:sqlite:push

# Seed with fictional doctors, patients, appointments, and conversation thread
npm run prisma:sqlite:seed
```

*(If running with PostgreSQL, run `npm run prisma:generate && npm run prisma:push && npm run prisma:seed`)*

### Step 4: Run the Application

From the root project directory:
```bash
npm run dev
```

Or run frontend and backend independently:
- **Backend API**: `cd server && npm run dev` (Runs on `http://localhost:5000`)
- **Frontend Dashboard**: `cd client && npm run dev` (Runs on `http://localhost:3000`)

Open your browser to: **[http://localhost:3000](http://localhost:3000)**

---

## 📡 API & Webhook Specifications

### Core REST Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health and live AWS connection status |
| `GET` | `/api/dashboard/metrics` | Dashboard statistics, CDS delivery breakdown, and activity |
| `GET` | `/api/appointments` | Filterable list of appointments (`status`, `doctorId`, `search`) |
| `GET` | `/api/appointments/available-slots` | Available slots by `doctorId` or `specialty` and `date` |
| `POST` | `/api/appointments` | Book appointment (prevents double booking) |
| `POST` | `/api/appointments/:id/reschedule`| Reschedule to a new verified time slot |
| `POST` | `/api/appointments/:id/cancel` | Cancel appointment (requires explicit confirmation) |
| `GET` | `/api/patients` | Searchable patient directory |
| `POST` | `/api/patients/:id/consent` | Update WhatsApp/SMS/Email consent compliance |
| `GET` | `/api/doctors` | List doctors, specialties, and working hours |
| `GET` | `/api/conversations` | Conversation records linked to patients |
| `POST` | `/api/conversations/chat` | Send test message into the Bedrock conversational agent |
| `GET` | `/api/notifications` | Delivery logs for WhatsApp, SMS, and SES emails |
| `POST` | `/api/notifications/:id/retry` | Retry failed notification |
| `POST` | `/api/reminders/process-due` | Process automated due reminders |
| `POST` | `/api/reminders/test/:id` | Send manual test reminder for appointment |

### Inbound AWS Webhooks

- **WhatsApp Inbound Webhook**: `POST /api/webhooks/whatsapp`
  - Compatible with AWS End User Messaging Social & Meta Webhook event format.
  - Automatically parses patient phone number and message body, invokes Bedrock agent tools, and replies.
- **SMS Inbound Webhook**: `POST /api/webhooks/sms`
  - Accepts inbound SMS events from AWS End User Messaging SMS.
- **Delivery Receipts Webhook**: `POST /api/webhooks/delivery-events`
  - Updates notification status to `DELIVERED` or `FAILED` via AWS SNS delivery topics.

---

## 🛡️ Security, Privacy & Compliance

- **No PHI or Diagnostic Data**: Built exclusively for appointment scheduling and logistics. Medical records, diagnoses, and lab results are never stored.
- **Identity Verification**: Requires patient identification (matching phone, email, and date of birth) before exposing visit information.
- **Confirmation Guardrails**: Cancellations cannot be processed without explicit patient confirmation.
- **Consent Enforcement**: Strictly checks patient `consentStatus` before automated reminders are sent.
- **Rate Limiting & Validation**: All incoming requests are validated with **Zod**; public endpoints are rate-limited.
- **Safe Secrets Handling**: AWS credentials are kept on the backend, loaded via environment variables or IAM roles, and never leaked to the client.

---

## ⚖️ Disclaimer

*CareConnect AI is a demonstration prototype developed for the AWS CDS Agentic AI Partner Hackathon. It uses fictional patient and physician data. It is not intended for clinical diagnosis, medical emergencies, or live medical advice.*
