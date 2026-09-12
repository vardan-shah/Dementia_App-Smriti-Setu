import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

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
      const { user, userClient } = await authenticate(request);
      
      // 2. Validate payload
      const event = syncEventSchema.parse(request.body);
      
      // 3. Persist the sync event to the database log
      // We do NOT perform generic unrestricted writes to arbitrary tables.
      // Instead we write to an append-only event sourcing table `sync_events`.
      const { error: insertError } = await supabaseService.from('sync_events').insert({
        id: event.id,
        user_id: user.id,
        event_type: event.type,
        payload: event.payload,
        status: 'PENDING',
        created_at: event.createdAt
      });

      if (insertError) {
        throw insertError;
      }

      app.log.info(`Persisted sync event: ${event.id} of type ${event.type} for user ${user.id}`);
      
      return {
        status: 'SYNCED',
        id: event.id
      };
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
