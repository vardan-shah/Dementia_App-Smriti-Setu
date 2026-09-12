# Security Requirements

## Authentication
- Handled via Supabase Auth.
- Session tokens are stored securely in browser state/storage.
- **Elder Pairing**: Caregivers generate a temporary (24hr), single-use 6-digit code. Elder devices consume this code using an Anonymous session. The backend Fastify API strictly validates this code and issues a secure `elder_devices` database linkage preventing credential leakage.

## Implemented Security Controls

### Role-Based Access Control (RBAC) & Row Level Security (RLS)
- RLS is explicitly enabled on all core tables.
- **Elders** can read their own profiles and activity via their anonymous device linkage.
- **Caregivers** can read and manage data ONLY for elder_profiles they are explicitly linked to via `caregiver_elder_links`.
- Unauthenticated access is globally denied.

### API Security & Transactions (Phase 1.1)
- Operations bridging multiple tables (e.g. creating an Elder profile and instantly linking the Caregiver to it) are enforced atomically within the Backend API to bypass the traditional RLS "chicken-and-egg" lockouts without weakening the database-layer security.
- All API inputs are aggressively typed and stripped using Zod validation.

## Data Integrity
- `updated_at` columns automatically track modifications using Postgres triggers.
- Action logs are stored securely in `sync_events` and `audit_logs`.

## Prototype Limitations
- Security model is robust for a prototype but does not yet claim production-grade clinical compliance (e.g., HIPAA/GDPR).

## Phase 5.3 Sync Authorization
The generic `/sync` append-only ledger validates payload mutations before applying them to domain schemas (`cultural_profiles`, `reminders`). It completely ignores any generic `caregiver_id` appended in the payload. Instead, it extracts the target `elderId` and performs an independent `caregiver_elder_links` cross-check against the authenticated token's `user.id`. If authorization fails, the event is rejected cleanly with a `403 Forbidden`. Elders are strictly prevented from altering configuration parameters.

## Database Level Authorization & RPCs (Phase 5.5)
Elder permissions are further hardened at the PostgreSQL layer. Direct table `UPDATE` access to `public.reminders` has been fully revoked for Elders to prevent unauthorized alteration of title/time/recurrence settings via intercepted payloads. Instead, Elders only possess access to a `SECURITY DEFINER` Remote Procedure Call (`update_reminder_completion`) which executes an immutable `UPDATE` strictly bound to the `completed_today` and `last_completed_date` properties after validating `auth.uid() = elder_id`.

## Phase 6 AI Boundary
- External AI is strictly optional, default OFF. 
- The frontend never receives API keys. External calls happen strictly on the Fastify backend.
- Sensitive data is aggregated before being sent to external LLMs.

## Phase 6.1 Enhancements
- The AI provider boundary validates the caregiver's explicit `aiEnabled` preference on the server level, preventing accidental data egress.
- AdaptiveDecision tables strictly separate the decision provenance from elder-facing UI, preventing unintentional disclosure of behavioral metrics to patients.
