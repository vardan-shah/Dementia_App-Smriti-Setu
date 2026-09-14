import { supabase } from '../supabase';
import { API_URL } from "../config/env";

export async function fetchRelatives(elderId: string) {
  const { data, error } = await supabase.from('relatives').select('*').eq('elder_id', elderId);
  if (error) throw new Error('Failed to fetch relatives');
  return data;
}

export async function createRelative(data: { elderId: string, name: string, relationship: string, photoUrl?: string }) {
  const { data: newRel, error } = await supabase.from('relatives').insert({
    elder_id: data.elderId,
    name: data.name,
    relationship: data.relationship,
    photo_url: data.photoUrl
  }).select().single();
  if (error) throw new Error('Failed to create relative');
  return newRel;
}

export async function fetchStories(elderId: string) {
  const { data, error } = await supabase.from('stories').select('*').eq('elder_id', elderId);
  if (error) throw new Error('Failed to fetch stories');
  return data;
}

export async function createStory(data: { elderId: string, title: string, description?: string, relativeId?: string, photoUrl?: string }) {
  const { data: newStory, error } = await supabase.from('stories').insert({
    elder_id: data.elderId,
    title: data.title,
    description: data.description,
    relative_id: data.relativeId,
    photo_url: data.photoUrl
  }).select().single();
  if (error) throw new Error('Failed to create story');
  return newStory;
}

export async function generateAiSummary(payload: { elderId: string, recentActivities: any[], aiEnabled: boolean }) {
  if (!payload.aiEnabled) return { summary: '' };
  const { data: sessionData } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionData.session) {
    headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
  }
  
  const res = await fetch(`${API_URL}/api/ai/summarize`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to generate AI summary');
  return res.json();
}
