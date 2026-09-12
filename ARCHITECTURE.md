# Architecture

## Core Technology Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, TanStack Query, Vite PWA, Dexie.js (IndexedDB).
- **Backend**: Node.js, Fastify, Zod.
- **Database / Auth**: Supabase (PostgreSQL, Row Level Security, Auth).

## API Boundaries (Phase 1.1)
Smriti Setu enforces a strict architectural boundary for core resource management:
- **Client (Caregiver & Elder)**: Handles UI, Local State (Zustand), offline storage (Dexie), and Supabase Auth session management.
- **Backend Service (Fastify)**: Responsible for orchestration, pairing generation, transactional multi-table updates, and validated persistence (`GET /elders`, `POST /elders`, `POST /sync`, `POST /elder/pair`). The backend securely evaluates JWTs and uses the Supabase Service Role exclusively where RLS bootstrapping is required (e.g. associating an elder to a caregiver safely).
- **Supabase (PostgreSQL)**: Handles actual data storage, strict Row Level Security policies (protecting read/writes globally).

## Offline & Sync Model
- UI Shell is cached via Service Worker.
- App state actions (mutations) are enqueued to `syncEvents` in IndexedDB locally.
- Online transitions flush events to `POST /sync`, persisting them safely to the `sync_events` append-only backend table for eventual processing.

## Role Model
- **Caregiver**: Owns profiles, manages elders. Authenticated via standard email/password (Supabase Auth).
- **Elder**: Operates via paired devices. Device authenticates using Supabase Anonymous sign-in, which the backend securely binds to an `elder_profiles` record via the `elder_devices` mapping table.
