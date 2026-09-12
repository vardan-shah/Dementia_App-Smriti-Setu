import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../utils/authUtils.js';

const storySchema = z.object({
  elderId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  relativeId: z.string().uuid().optional(),
  photoUrl: z.string().optional(),
  voiceUrl: z.string().optional()
});

const getStoriesQuerySchema = z.object({
  elderId: z.string().uuid()
});

export async function storiesRoutes(app: FastifyInstance) {
  
  app.post('/stories', async (request, reply) => {
    try {
      const { user, userClient } = await authenticate(request);
      const data = storySchema.parse(request.body);

      // We rely on RLS policies to authorize this action via userClient
      const { data: story, error: insertError } = await userClient
        .from('memories')
        .insert({
          elder_id: data.elderId,
          title: data.title,
          description: data.description,
          relative_id: data.relativeId,
          photo_url: data.photoUrl,
          voice_url: data.voiceUrl,
          created_by: user.id
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '42501' || insertError.details?.includes('Row Level Security')) {
          return reply.status(403).send({ error: 'Forbidden' });
        }
        throw insertError;
      }
      
      if (!story) return reply.status(403).send({ error: 'Forbidden' });
      return reply.status(201).send(story);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: (error as any).errors });
      }
      if (error.message === 'Unauthorized') return reply.status(401).send({ error: 'Unauthorized' });
      app.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  app.get('/stories', async (request, reply) => {
    try {
      const { userClient } = await authenticate(request);
      const { elderId } = getStoriesQuerySchema.parse(request.query);

      const { data: stories, error } = await userClient
        .from('memories')
        .select('*')
        .eq('elder_id', elderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return stories;
    } catch (error: any) {
      if (error instanceof z.ZodError) return reply.status(400).send({ error: 'Validation failed', details: (error as any).errors });
      if (error.message === 'Unauthorized') return reply.status(401).send({ error: 'Unauthorized' });
      app.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
