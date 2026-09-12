import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { db } from '../../db';
import { useTranslation } from 'react-i18next';

export function CreateStory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [title, setTitle] = useState('');
  const [storyText, setStoryText] = useState('');
  const [relativeId, setRelativeId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const relatives = useLiveQuery(
    () => id ? db.relatives.where('elderId').equals(id).toArray() : [],
    [id]
  ) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    setLoading(true);
    setError('');

    try {
      const storyId = crypto.randomUUID();
      
      const newStory = {
        id: storyId,
        elderId: id,
        title,
        storyText,
        relativeId: relativeId || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'PENDING' as const
      };

      // 1. Save to IndexedDB immediately (Local-first)
      await db.memories.add(newStory);

      // 2. Queue for sync
      await db.syncEvents.add({
        id: crypto.randomUUID(),
        type: 'STORY_CREATED',
        payload: newStory,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        retryCount: 0
      });

      // Navigate back instantly
      navigate(`/caregiver/elders/${id}/vault`);
    } catch (err: any) {
      setError(err.message || 'Failed to save story');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('add_story', 'Add Story')}</h1>
      
      <Card className="p-6">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input 
              type="text" 
              required
              className="w-full border border-gray-300 rounded p-2 focus:border-primary"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Vacation in Simla"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Story Text</label>
            <textarea 
              required
              rows={4}
              className="w-full border border-gray-300 rounded p-2 focus:border-primary"
              value={storyText}
              onChange={e => setStoryText(e.target.value)}
              placeholder="Tell the memory..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Link to Relative (Optional)</label>
            <select 
              className="w-full border border-gray-300 rounded p-2 focus:border-primary"
              value={relativeId}
              onChange={e => setRelativeId(e.target.value)}
            >
              <option value="">-- None --</option>
              {relatives.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
              {t('cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? t('saving', 'Saving...') : t('save_story', 'Save Story')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
