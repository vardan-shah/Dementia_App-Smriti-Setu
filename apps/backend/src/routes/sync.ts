import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, supabaseService } from '../utils/authUtils.js';

const syncEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  entity: z.string().optional(),
  payload: z.any(),
  createdAt: z.string().datetime(),
  deviceId: z.string().optional()
});

export async function syncRoutes(app: FastifyInstance) {
  app.post('/sync', async (request, reply) => {
    try {
      // 1. Authenticate user securely
      const { user } = await authenticate(request);
      
      // 2. Validate payload
      const event = syncEventSchema.parse(request.body);
      
      // 3. Persist the sync event to the database log
      const { error: insertError } = await supabaseService.from('sync_events').insert({
        id: event.id,
        user_id: user.id,
        event_type: event.type,
        payload: event.payload,
        status: 'PENDING',
        created_at: event.createdAt
      });

      if (insertError && insertError.code !== '23505') { // Ignore unique violation if retried
        throw insertError;
      }

      // 4. Domain Materialization based on event type
      let domainApplied = false;

      // Extract elderId from payload safely
      const elderId = event.payload?.elderId;
      if (!elderId) {
        // Events lacking elderId cannot be securely materialized in this scoped context yet.
        // They remain QUEUED in sync_events.
      } else {
        // Verify Authorization: Caregiver must own the elder
        const { data: mapping } = await supabaseService.from('caregiver_elders')
          .select('id')
          .eq('caregiver_id', user.id)
          .eq('elder_id', elderId)
          .single();
          
        const isElderSelf = user.id === elderId;

        if (!mapping && !isElderSelf) {
          return reply.status(403).send({ error: 'Unauthorized to modify this elder' });
        }

        // Apply specific events
        try {
          if (event.type === 'CULTURAL_PROFILE_UPDATED') {
            const p = event.payload;
            const { error: upsertErr } = await supabaseService.from('cultural_profiles').upsert({
              elder_id: elderId,
              region: p.region,
              preferred_language: p.preferredLanguage,
              secondary_language: p.secondaryLanguage,
              preferred_themes: p.preferredThemes || [],
              custom_notes: p.customNotes,
              updated_at: p.updatedAt || new Date().toISOString()
            }, { onConflict: 'elder_id' });
            
            if (upsertErr) throw upsertErr;
            domainApplied = true;
          } 
          else if (event.type === 'REMINDER_CREATED' || event.type === 'REMINDER_UPDATED') {
            const r = event.payload;
            const { error: upsertErr } = await supabaseService.from('reminders').upsert({
              id: r.id,
              elder_id: elderId,
              title: r.title,
              time: r.time,
              recurrence: r.recurrence || 'DAILY',
              enabled: r.enabled ?? true,
              completed_today: r.completedToday ?? false,
              last_completed_date: r.lastCompletedDate,
              created_at: r.createdAt || new Date().toISOString()
            }, { onConflict: 'id' });

            if (upsertErr) throw upsertErr;
            domainApplied = true;
          }
          else if (event.type === 'REMINDER_DELETED') {
            const { error: delErr } = await supabaseService.from('reminders')
              .delete()
              .eq('id', event.payload.id)
              .eq('elder_id', elderId);

            if (delErr) throw delErr;
            domainApplied = true;
          }
        } catch (e: any) {
          app.log.error(`Failed to apply domain event ${event.id}: ${e.message}`);
          // If domain application fails, we still return QUEUED so the client doesn't mark it SYNCED.
          // In a real app we might update the sync_events status to FAILED here.
        }
      }

      if (domainApplied) {
        // Mark as processed in the ledger
        await supabaseService.from('sync_events')
          .update({ status: 'PROCESSED' })
          .eq('id', event.id);

        app.log.info(`Materialized domain change and SYNCED event: ${event.id} for user ${user.id}`);
        return {
          status: 'SYNCED',
          id: event.id
        };
      } else {
        app.log.info(`Persisted sync event (no domain materialization): ${event.id} for user ${user.id}`);
        return {
          status: 'QUEUED',
          id: event.id
        };
      }
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: (error as any).errors });
      }
      if (error.message === 'Unauthorized' || error.message.includes('Authorization')) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      app.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
