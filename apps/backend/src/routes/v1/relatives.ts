import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, supabaseService } from '../../utils/authUtils.js';

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
      const user = await authenticate(request);
      const data = relativeSchema.parse(request.body);

      // Verify caregiver has access to this elder
      const { data: link, error: linkError } = await supabaseService
        .from('caregiver_elder_links')
        .select('*')
        .eq('caregiver_id', user.id)
        .eq('elder_id', data.elderId)
        .single();

      if (linkError || !link) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { data: relative, error: insertError } = await supabaseService
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

      if (insertError) throw insertError;
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
      const user = await authenticate(request);
      const { elderId } = getRelativesQuerySchema.parse(request.query);

      // Verify caregiver link or elder device link
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

      const { data: relatives, error } = await supabaseService
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
