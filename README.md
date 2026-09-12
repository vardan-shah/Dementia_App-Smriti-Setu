# Smriti Setu

Smriti Setu is a deployable advanced prototype of an elder-first, caregiver-assisted, offline-first cognitive support platform for elderly dementia users, initially focused on North Eastern India.

## Architecture

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, PWA, IndexedDB (Dexie.js), Zustand, TanStack Query, Zod.
- **Backend**: Node.js, TypeScript, Fastify, REST API, Zod.
- **Database**: Supabase, PostgreSQL.

## Environment Variables

### Frontend (`apps/frontend/.env`)
- `VITE_SUPABASE_URL`: Your Supabase URL.
- `VITE_SUPABASE_ANON_KEY`: Your Supabase public anonymous key.
- `VITE_API_URL`: URL to the Fastify backend (e.g. `http://localhost:3000`).

### Backend (`apps/backend/.env`)
- `PORT`: Server port (default 3000).
- `SUPABASE_URL`: Your Supabase URL.
- `SUPABASE_SERVICE_ROLE`: Your Supabase secret service-role key.
- `FRONTEND_URL`: URL of the frontend (for CORS).
- `GROQ_API_KEY`: (Optional) Groq LLM token for caregiver insights.
- `GEMINI_API_KEY`: (Optional) Gemini LLM token for caregiver insights.

## Local Development Commands
Install dependencies: `npm install` inside both `apps/frontend` and `apps/backend`.

### Backend Local Dev
```bash
cd apps/backend
npm run dev
```

### Frontend Local Dev
```bash
cd apps/frontend
npm run dev
```

## Production Validation & Build

### Backend Production Validation
To explicitly validate backend production secrets without starting the server:
```bash
cd apps/backend
NODE_ENV=production SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... FRONTEND_URL=... npm run build
```
For production execution: `npm run build && npm run start`.

### Frontend Production Validation
To validate frontend variables and generate PWA assets:
```bash
cd apps/frontend
NODE_ENV=production VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... VITE_API_URL=... npm run build
```

### Database Migrations
All Supabase migrations are located in `supabase/migrations`. Apply them in sequential order to setup tables, RLS policies, and triggers. Use the Supabase CLI: `supabase db push`.

## Deployment
- The backend compiles into a standard Node.js server. Provide environment variables via your host platform.
- The frontend compiles into static HTML/JS/CSS assets ready to be served globally.

## Offline Behavior
The frontend is a Progressive Web App (PWA) using IndexedDB (`dexie`) to persist data natively. Caregiver-managed configurations (reminders, daily plans, cultural settings, memory vault entries) sync to the device while online, but remaining entirely functional in airplane mode. Changes queue in a robust `SyncManager` relay.

## Limitations
- **Not Clinically Validated**: Change Radar and Cognitive Profile metrics are for relative personal longitudinal monitoring, not medical diagnosis or prediction.
- **Offline Audio**: Text-to-speech relies on native browser APIs, which vary heavily by device OS, especially for Assamese and Bengali strings.
- **Real-Device Tests Pending**: Comprehensive offline verification on target Android devices has not been conducted.
