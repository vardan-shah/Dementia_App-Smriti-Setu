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
