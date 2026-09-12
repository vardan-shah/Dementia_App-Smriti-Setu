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
