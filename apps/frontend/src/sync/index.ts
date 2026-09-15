import { API_URL, SUPABASE_URL } from "../config/env";
import { db } from '../db';
import { supabase } from '../supabase';

export class SyncManager {
  private syncUrl = `${SUPABASE_URL}/functions/v1/sync-handler`;
  private isSyncing = false;

  async enqueueEvent(type: string, payload: any, entity?: string) {
    const id = crypto.randomUUID();
    await db.syncEvents.add({
      id,
      type,
      entity,
      payload,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      retryCount: 0,
    });
    
    if (navigator.onLine) {
      this.sync();
    }
  }

  async sync() {
    if (!navigator.onLine || this.isSyncing) return;
    this.isSyncing = true;
    
    try {
      const pendingEvents = await db.syncEvents
        .where('status').equals('PENDING')
        .or('status').equals('FAILED')
        .toArray();
      
      if (pendingEvents.length === 0) return;

      console.log(`Attempting to sync ${pendingEvents.length} events...`);
      
      for (const event of pendingEvents) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session) {
            console.warn('Sync aborted: User not authenticated');
            break;
          }

          const response = await fetch(this.syncUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionData.session.access_token}`
            },
            body: JSON.stringify(event)
          });

          if (response.ok) {
            const result = await response.json();
            const newStatus = result.status === 'QUEUED' ? 'QUEUED' : 'SYNCED';
            await db.syncEvents.update(event.id, { status: newStatus, lastAttemptAt: new Date().toISOString() });
            console.log(`Successfully processed event ${event.id} -> ${newStatus}`);
          } else {
            const err = await response.json().catch(() => ({}));
            await this.markFailed(event.id, event.retryCount || 0, err.error || 'Server returned error');
          }
        } catch (error: any) {
          console.error(`Failed to sync event ${event.id}`, error);
          await this.markFailed(event.id, event.retryCount || 0, error.message);
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private async markFailed(id: string, currentRetries: number, errorMsg: string) {
    await db.syncEvents.update(id, { 
      status: 'FAILED', 
      retryCount: currentRetries + 1,
      lastAttemptAt: new Date().toISOString(),
      errorMessage: errorMsg
    });
  }
}

export const syncManager = new SyncManager();

// Automatically attempt sync when network restores
window.addEventListener('online', () => {
  syncManager.sync();
});
