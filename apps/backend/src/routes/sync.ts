import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy';
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const syncEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  entity: z.string().optional(),
  payload: z.any(),
  createdAt: z.string().datetime(),
  deviceId: z.string().optional()
});

async function authenticate(request: FastifyRequest) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseService.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function syncRoutes(app: FastifyInstance) {
  app.post('/sync', async (request, reply) => {
    try {
      // 1. Authenticate user securely
      const user = await authenticate(request);
      
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
