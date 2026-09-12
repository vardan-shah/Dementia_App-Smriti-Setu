# Architecture

## Core Technology Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, TanStack Query, Vite PWA, Dexie.js (IndexedDB).
- **Backend**: Node.js, Fastify, Zod.
- **Database / Auth**: Supabase (PostgreSQL, Row Level Security, Auth).

## Data Hierarchy (Personalization)
The personalization engine distinguishes data into strict hierarchical tiers:

1. **RAW SOURCE (GameSession)**: Ephemeral event indicating a game was played, containing an untyped metrics JSON payload. Represents the historical log.
2. **NORMALIZED SOURCE (PerformanceRecord)**: Canonical strongly-typed metrics record generated securely from GameSessions. Guaranteed uniform structure across all games.
3. **DERIVED (CognitiveBaseline, CognitiveProfile, ActivityRecommendation)**: Rollup structures, statistical variance models, and machine recommendations built deterministically from `PerformanceRecords`. Can be aggressively cached and rebuilt transparently on demand.
4. **EPHEMERAL (UI State)**: Memory state managed by React/Zustand representing active views.

## API Boundaries
Smriti Setu enforces a strict architectural boundary for core resource management:
- **Client (Caregiver & Elder)**: Handles UI, Local State (Zustand), offline storage (Dexie), and Supabase Auth session management.
- **Backend Service (Fastify)**: Responsible for orchestration, pairing generation, transactional multi-table updates, and validated persistence (`GET /elders`, `POST /elders`, `POST /sync`, `POST /elder/pair`). The backend securely evaluates JWTs and uses the Supabase Service Role exclusively where RLS bootstrapping is required.
- **Supabase (PostgreSQL)**: Handles actual data storage, strict Row Level Security policies (protecting read/writes globally).

## Offline & Sync Model
- UI Shell is cached via Service Worker.
- App state actions (mutations) are enqueued to `syncEvents` in IndexedDB locally.
- The Elder Home profile and recommendations are served primarily from IndexedDB (local-first) without blocking on network.
- Online transitions flush events to `POST /sync`.

## Role Model
- **Caregiver**: Owns profiles, manages elders. Authenticated via standard email/password (Supabase Auth).
- **Elder**: Operates via paired devices. Device authenticates using Supabase Anonymous sign-in, which the backend securely binds to an `elder_profiles` record via the `elder_devices` mapping table. Strict `elderId` scoping ensures zero cross-contamination of sessions, recommendations, or baselines on shared hardware.

## Cognitive Change Radar (Phase 4)
Change Radar identifies persistent changes in an elder's activity-performance patterns relative to their own established baseline.
- **Role**: Longitudinal monitoring. Not a clinical diagnosis engine.
- **Model (`ChangeSignal`)**: Evaluates memory, language, reaction, and engagement metrics natively.
- **Configuration**:
  - `RECENT_WINDOW_SESSIONS = 5` (Evaluates the 5 most recent activities).
  - `PERSISTENCE_THRESHOLD = 3` (Requires 3+ deviations to establish a persistent change signal, avoiding knee-jerk alerts).
- **Execution**: Runs exclusively locally against `db.performanceRecords` and `db.cognitiveBaselines`.

## North-East Cultural Personalization (Phase 5)
Provides an offline-first culturally tailored elder experience focusing natively on NER.
- **Cultural Profile**: Caregiver-controlled. Avoids AI assumptions, allowing manual selection of region, language, and themes.
- **Content Packs**: Bounded offline bundles containing highly curated, safe local trivia, memories, and prompts (e.g. `CULTURAL_PACK_ASSAM`). 
- **Daily Assistance (`TodayPlan`)**: Generates deterministically each local day by merging a personalized cognitive activity recommendation with the culturally filtered prompts. Ensures stability on refresh.
- **Reminders**: Elder-scoped local-only daily checklist without making clinical medical claims.
- **Audio Interface**: Voice-first integration into the daily plan via existing `useGameAudio` (`speechSynthesis` fallback).

## Final Sync Semantics (Phase 5.3)
The system adopts an explicit event-sourcing paradigm where mutations (`CULTURAL_PROFILE_UPDATED`, `REMINDER_CREATED`) enqueue locally into IndexedDB as `SyncEvents`. The backend routes these into an append-only ledger (`sync_events`), returning a deterministic semantic acknowledgment:
1. `QUEUED`: Event preserved securely, but unsupported/awaiting batch ingestion.
2. `SYNCED`: Event parsed, authorized, and materialized robustly into the canonical PostgreSQL domain schemas (`cultural_profiles`, `reminders`).

## Database Migrations & Reconciliation (Phase 5.5)
The repository uses purely append-only schema evolution. A historical migration `20260912000003_phase5_cultural_reminders.sql` mistakenly referenced legacy schemas. Instead of mutating published history, a robust `20260912000004_phase5_5_reconciliation.sql` was introduced. This strictly enforces foreign keys against `elder_profiles` and utilizes a hardened Security Definer RPC (`update_reminder_completion`) to strictly isolate elder capabilities to modifying reminder completions, bounding all structural reminder mutations to Caregivers matching `caregiver_elder_links`.

## Phase 6: Advanced Adaptive Intelligence
- Replaced heuristic difficulty with an epsilon-greedy Contextual Bandit engine.
- Multi-factor recommendation algorithm incorporating diversity, novelty, and cultural fit.
- Dexie database upgraded to version 10 to include `adaptiveArmStates` and `adaptiveDecisions`.
- Offline-first design allows full reconstruction of ML state from raw performance logs.


## Phase 6.1 Correctness
- The contextual bandit algorithm is a lightweight, stochastic epsilon-greedy mechanism, not a heavy ML model.
- `PerformanceRecords` are the absolute source of truth for all learning states. `AdaptiveDecision` is strictly used for logging and provenance.
- Accuracy metrics strictly follow the canonical [0.0, 1.0] scale.
