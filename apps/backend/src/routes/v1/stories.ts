import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, supabaseService } from '../../utils/authUtils.js';

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
      const user = await authenticate(request);
      const data = storySchema.parse(request.body);

      // Verify caregiver link
      const { data: link, error: linkError } = await supabaseService
        .from('caregiver_elder_links')
        .select('*')
        .eq('caregiver_id', user.id)
        .eq('elder_id', data.elderId)
        .single();

      if (linkError || !link) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      // We use 'memories' table as our stories table (as per migration)
      const { data: story, error: insertError } = await supabaseService
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

      if (insertError) throw insertError;
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
      const user = await authenticate(request);
      const { elderId } = getStoriesQuerySchema.parse(request.query);

      const { data: cgLink } = await supabaseService
        .from('caregiver_elder_links')
        .select('*')
        .eq('caregiver_id', user.id)
        .eq('elder_id', elderId)
        .single();
        
      const { data: elderLink } = await supabaseService
        .from('elder_devices')
        .select('*')
        .eq('id', user.id)
        .eq('elder_id', elderId)
        .single();

      if (!cgLink && !elderLink) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { data: stories, error } = await supabaseService
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
