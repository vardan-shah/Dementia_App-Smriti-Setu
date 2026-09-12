import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../utils/authUtils.js';

const relativeSchema = z.object({
  elderId: z.string().uuid(),
  name: z.string().min(1),
  relationship: z.string().min(1),
  photoUrl: z.string().optional(),
  voiceUrl: z.string().optional()
});

const getRelativesQuerySchema = z.object({
  elderId: z.string().uuid()
});

export async function relativeRoutes(app: FastifyInstance) {
  
  app.post('/relatives', async (request, reply) => {
    try {
      const { user, userClient } = await authenticate(request);
      const data = relativeSchema.parse(request.body);

      // We rely on PostgreSQL RLS policies to authorize this action via userClient
      const { data: relative, error: insertError } = await userClient
        .from('relatives')
        .insert({
          elder_id: data.elderId,
          name: data.name,
          relationship: data.relationship,
          photo_url: data.photoUrl,
          voice_url: data.voiceUrl,
          created_by: user.id
        })
        .select()
        .single();

      if (insertError) {
        // Postgres RLS violations usually surface as missing return rows or permission errors
        if (insertError.code === '42501' || insertError.details?.includes('Row Level Security')) {
          return reply.status(403).send({ error: 'Forbidden' });
        }
        throw insertError;
      }
      
      if (!relative) return reply.status(403).send({ error: 'Forbidden' });
      return reply.status(201).send(relative);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: (error as any).errors });
      }
      if (error.message === 'Unauthorized') return reply.status(401).send({ error: 'Unauthorized' });
      app.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  app.get('/relatives', async (request, reply) => {
    try {
      const { userClient } = await authenticate(request);
      const { elderId } = getRelativesQuerySchema.parse(request.query);

      // RLS naturally scopes this to linked caregivers or the exact elder device.
      const { data: relatives, error } = await userClient
        .from('relatives')
        .select('*')
        .eq('elder_id', elderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return relatives;
    } catch (error: any) {
      if (error instanceof z.ZodError) return reply.status(400).send({ error: 'Validation failed', details: (error as any).errors });
      if (error.message === 'Unauthorized') return reply.status(401).send({ error: 'Unauthorized' });
      app.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
