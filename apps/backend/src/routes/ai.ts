import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, supabaseService } from '../utils/authUtils.js';

const aiRequestSchema = z.object({
  elderId: z.string().uuid(),
  aiEnabled: z.boolean().default(false),
  recentActivities: z.array(z.object({
    gameName: z.string(),
    accuracy: z.number(),
    completed: z.boolean(),
    difficulty: z.string()
  })).max(10) // Bound payload
});

export async function aiRoutes(app: FastifyInstance) {
  app.post('/ai/summarize', async (request, reply) => {
    try {
      const { user } = await authenticate(request);
      const { elderId, recentActivities, aiEnabled } = aiRequestSchema.parse(request.body);

      // Verify Authorization: Caregiver must own the elder
      const { data: mapping } = await supabaseService.from('caregiver_elder_links')
        .select('id')
        .eq('caregiver_id', user.id)
        .eq('elder_id', elderId)
        .single();
        
      if (!mapping) {
        return reply.status(403).send({ error: 'Unauthorized' });
      }

      // Check if we have an API key. 
      // Do not use AI if no key is present. Fallback to deterministic local text.
      const groqKey = process.env.GROQ_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY;

      if (!aiEnabled || (!groqKey && !geminiKey)) {
        // Local Fallback 
        app.log.info(`AI Provider fallback: aiEnabled=${aiEnabled}, keys_present=${!!(groqKey || geminiKey)}`);
        return generateDeterministicSummary(recentActivities);
      }

      // We have a provider. Minimize payload.
      const prompt = `
You are an assistant for a caregiver of an elder.
Analyze these recent game sessions and write a 1-sentence supportive summary about their learning progress.
Do not diagnose or mention dementia. Do not use medical terms. Keep it simple and encouraging.
Recent sessions:
${recentActivities.map(a => `- ${a.gameName} (${a.difficulty}): ${a.completed ? 'completed' : 'abandoned'}, ${Math.round(a.accuracy * 100)}% accuracy`).join('\n')}
      `.trim();

      try {
        if (groqKey) {
          // Mock Groq fetch
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${groqKey}`
            },
            body: JSON.stringify({
              model: 'llama3-8b-8192',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 150
            })
          });

          if (!response.ok) throw new Error('Groq failed');
          const data: any = await response.json();
          return { summary: data.choices[0].message.content.trim(), provider: 'groq' };
          
        } else if (geminiKey) {
          // Mock Gemini fetch
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          });

          if (!response.ok) throw new Error('Gemini failed');
          const data: any = await response.json();
          return { summary: data.candidates[0].content.parts[0].text.trim(), provider: 'gemini' };
        }
      } catch (err: any) {
        app.log.error(`AI Provider failed: ${err.message}. Falling back to deterministic.`);
        return generateDeterministicSummary(recentActivities);
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

function generateDeterministicSummary(activities: any[]) {
  if (activities.length === 0) return { summary: 'No recent activity to summarize.', provider: 'local-fallback' };
  
  const completed = activities.filter(a => a.completed).length;
  const avgAcc = activities.reduce((sum, a) => sum + a.accuracy, 0) / activities.length;

  let summary = `Recent activity shows a ${Math.round(avgAcc * 100)}% average accuracy.`;
  if (completed === activities.length) {
    summary += ' Great engagement with all activities completed.';
  } else {
    summary += ` Some activities were skipped, adjusting difficulty as needed.`;
  }
  
  return { summary, provider: 'local-fallback' };
}
