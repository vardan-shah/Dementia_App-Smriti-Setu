import { supabase } from '../supabase';

import { API_URL } from "../config/env";

async function getAuthHeader() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error('Not authenticated');
  return { 'Authorization': `Bearer ${sessionData.session.access_token}` };
}

export async function fetchRelatives(elderId: string) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/v1/relatives?elderId=${elderId}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch relatives');
  return res.json();
}

export async function createRelative(data: { elderId: string, name: string, relationship: string, photoUrl?: string }) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/v1/relatives`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create relative');
  return res.json();
}

export async function fetchStories(elderId: string) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/v1/stories?elderId=${elderId}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch stories');
  return res.json();
}

export async function createStory(data: { elderId: string, title: string, description?: string, relativeId?: string, photoUrl?: string }) {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/v1/stories`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create story');
  return res.json();
}

export async function generateAiSummary(payload: { elderId: string, recentActivities: any[], aiEnabled: boolean }) {
  const headers = await getAuthHeader().catch(() => ({})); // fallback if not authenticated
  const res = await fetch(`${API_URL}/api/ai/summarize`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to generate AI summary');
  return res.json();
}
