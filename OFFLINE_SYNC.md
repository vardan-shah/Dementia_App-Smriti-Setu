# Offline & Synchronization Strategy

## Offline-First Architecture
Smriti Setu is designed to remain fully functional without an active internet connection. This is critical for elders who may use paired devices in environments with unreliable connectivity.

### IndexedDB (Dexie) Local Stores
The frontend utilizes Dexie.js to manage local stores:
- `profiles`: Caches active elder metadata (ensuring the Elder Home loads instantly offline).
- `games`: Definitions for available therapeutic activities.
- `sessions`: Raw source records of completed or abandoned activities.
- `performanceRecords`: Normalized analytical records for personalization.
- `cognitiveBaselines`: Derived rollup metrics per elder.
- `memories` / `relatives`: Caches localized user-generated content.
- `syncEvents`: Append-only transactional event log for outgoing changes.

## Sync Flow
1. **Local Mutation**: Actions (like finishing a game) write updates to their respective local tables and insert a `syncEvent`.
2. **Background Flush**: When `navigator.onLine` is true, the `useSync` hook flushes pending events via `POST /sync` to the backend.
3. **Backend Resolution**: Fastify validates the event batch, enforces RLS, applies the transactions to PostgreSQL, and returns sync markers.

## Personalization Independence
The recommendation engine and adaptive difficulty (`computeBaselines`, `recommendNextActivity`) read exclusively from the local `performanceRecords`. This guarantees that recommendations never degrade or stall due to network latency. The contextual-bandit algorithms (future) and current heuristics execute deterministically on the client.

### Change Radar offline capability
The Cognitive Change Radar computes its `ChangeSignal`s exclusively from the `performanceRecords` and `cognitiveBaselines` local tables. This ensures that caregivers can instantly review longitudinal shifts in cognitive performance even when viewing the dashboard entirely offline, bypassing complex backend analytical services.

### Daily Assistance and Cultural Personalization (Phase 5)
The `TodayPlan` and caregiver `CulturalSettings` operate fundamentally on Dexie `v9` (`culturalProfiles`, `dailyPlans`, `reminders`). The curated cultural content packs are bundled directly or cached natively, allowing the elder dashboard to mount, load daily plans, process reminders, and launch filtered activities with zero network calls upon waking.

## Phase 5.3 Sync Semantics & Idempotency
- **Event Acknowledgment**: When the frontend enqueues an event (`PENDING`), the `/sync` backend endpoint processes it. If the server only persists the event in `sync_events` (e.g. unknown payload format), it returns `status: "QUEUED"`. The frontend preserves this state without retrying, treating it securely stored but unprocessed. If the server successfully materializes the change into a domain table (e.g., `cultural_profiles` or `reminders`), it returns `status: "SYNCED"`.
- **Domain Materialization**: The backend handles deduplication and idempotency via explicit `upsert` conflicts. Even if a `REMINDER_CREATED` is transmitted twice due to an edge-case network blip, the domain model enforces identical states via UUID upserts.

## Identity & UUID Integrity
Front-end generated entities natively adopt `crypto.randomUUID()` implementations identically matching PostgreSQL's `uuid_generate_v4()`. This prevents database insertion failures and guarantees universal idempotency across the sync threshold without requiring complex schema translations.

## Phase 6 Updates
- Adaptive intelligence state (`adaptiveArmStates` and `adaptiveDecisions`) is fully derived from offline `performanceRecords`. If local data is lost, it can be deterministically rebuilt when synced back.
