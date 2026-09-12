# Offline & Sync Strategy

Smriti Setu is designed to be an **Offline-First** application for Elders. 

## Phase 1.1 Current Implementation

### Service Worker Caching
- Handled by VitePWA. The application shell (HTML/JS/CSS) and basic translations are cached locally on first load, enabling the app to start up completely offline.

### Event Queueing & Dexie
- Actions taken in the app (e.g. playing a game, changing a setting) are pushed to an IndexedDB (`Dexie`) table `syncEvents` with a `PENDING` status.
- A `SyncManager` listens for `online` window events and periodically polls to flush the queue.

### Sync API
- When flushing, the frontend passes events to `POST /sync`.
- The backend validates the user's JWT Authorization token.
- Validated events are appended to the `public.sync_events` PostgreSQL table.
- Future phases will implement backend workers to process these events into relational changes (e.g., updating a baseline snapshot).

### Read Operations
- Currently, Caregiver and Elder operations (fetching the profiles) still enforce online network requests using `fetch` calls to the API. 
- In future phases, these fetch queries will use TanStack Query combined with Dexie caching to allow fully offline reads of the dashboard and profiles.
