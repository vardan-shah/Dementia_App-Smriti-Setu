import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, supabaseService } from '../utils/authUtils.js';

// Base generic sync event for initial parsing
const syncEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  entity: z.string().optional(),
  payload: z.any(),
  createdAt: z.string().datetime(),
  deviceId: z.string().optional()
});

// Specific event schemas
const culturalProfileUpdatedSchema = z.object({
  elderId: z.string().uuid(),
  region: z.string(),
  preferredLanguage: z.string(),
  secondaryLanguage: z.string().optional(),
  preferredThemes: z.array(z.string()).optional(),
  customNotes: z.string().optional(),
  updatedAt: z.string().datetime().optional()
});

const reminderSchema = z.object({
  id: z.string().uuid(),
  elderId: z.string().uuid(),
  title: z.string().min(1).max(100),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  recurrence: z.enum(['DAILY', 'WEEKLY', 'ONCE']).optional(),
  enabled: z.boolean().optional(),
  completedToday: z.boolean().optional(),
  lastCompletedDate: z.string().optional(),
  createdAt: z.string().datetime().optional()
});

const reminderDeletedSchema = z.object({
  id: z.string().uuid(),
  elderId: z.string().uuid()
});

export async function syncRoutes(app: FastifyInstance) {
  app.post('/sync', async (request, reply) => {
    try {
      // 1. Authenticate user securely
      const { user } = await authenticate(request);
      
      // 2. Validate base payload
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
      let elderId: string | undefined = undefined;

      // Validate strict specific payloads
      if (event.type === 'CULTURAL_PROFILE_UPDATED') {
        const payload = culturalProfileUpdatedSchema.parse(event.payload);
        elderId = payload.elderId;
      } else if (event.type === 'REMINDER_CREATED' || event.type === 'REMINDER_UPDATED') {
        const payload = reminderSchema.parse(event.payload);
        elderId = payload.elderId;
      } else if (event.type === 'REMINDER_DELETED') {
        const payload = reminderDeletedSchema.parse(event.payload);
        elderId = payload.elderId;
      }

      if (elderId) {
        // Verify Authorization: Caregiver must own the elder (via canonical links table) or be the elder themselves
        const { data: mapping } = await supabaseService.from('caregiver_elder_links')
          .select('id')
          .eq('caregiver_id', user.id)
          .eq('elder_id', elderId)
          .single();
          
        const isElderSelf = user.id === elderId;

        // Elders can only update reminder completion. Caregivers can do everything else.
        if (!mapping && !isElderSelf) {
          return reply.status(403).send({ error: 'Unauthorized to modify this elder' });
        }

        // Apply specific events
        try {
          if (event.type === 'CULTURAL_PROFILE_UPDATED') {
            if (isElderSelf) {
              return reply.status(403).send({ error: 'Elders cannot update cultural profiles' });
            }
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
            // Elder can only update completion
            if (isElderSelf && event.type === 'REMINDER_CREATED') {
              return reply.status(403).send({ error: 'Elders cannot create reminders' });
            }
            if (isElderSelf && event.type === 'REMINDER_UPDATED') {
              // We should ensure they aren't changing title/time. A full check might be complex, 
              // but we are upserting. The RLS prevents them from doing UPDATE on anything but completed_today
              // but we are bypassing RLS by using supabaseService. We must manually enforce it here.
              // Actually, wait, supabaseService bypasses RLS. So yes, if isElderSelf, we must only update completion fields.
              const r = event.payload;
              const { error: upsertErr } = await supabaseService.from('reminders').update({
                completed_today: r.completedToday ?? false,
                last_completed_date: r.lastCompletedDate,
              }).eq('id', r.id).eq('elder_id', elderId);
              
              if (upsertErr) throw upsertErr;
              domainApplied = true;
            } else {
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
          }
          else if (event.type === 'REMINDER_DELETED') {
            if (isElderSelf) {
              return reply.status(403).send({ error: 'Elders cannot delete reminders' });
            }
            const { error: delErr } = await supabaseService.from('reminders')
              .delete()
              .eq('id', event.payload.id)
              .eq('elder_id', elderId);

            if (delErr) throw delErr;
            domainApplied = true;
          }
        } catch (e: any) {
          app.log.error(`Failed to apply domain event ${event.id}: ${e.message}`);
          // Fall through to QUEUED
        }
      }

      if (domainApplied) {
        // Transactional boundary: if domain applied successfully, mark sync event PROCESSED
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
