import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { fetchRelatives, fetchStories } from '../../services/api';
import { db } from '../../db';

export function MemoryVault() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [relatives, setRelatives] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        setLoading(true);
        // Attempt fetch from API
        try {
          const fetchedRelatives = await fetchRelatives(id);
          const fetchedStories = await fetchStories(id);
          setRelatives(fetchedRelatives);
          setStories(fetchedStories);
          
          // Cache to IndexedDB for offline use later
          await db.relatives.bulkPut(fetchedRelatives.map((r: any) => ({
            id: r.id,
            elderId: r.elder_id,
            name: r.name,
            relationship: r.relationship,
            photoUrl: r.photo_url,
            createdAt: r.created_at,
            updatedAt: r.updated_at
          })));
        } catch (apiError) {
          console.warn('API fetch failed, falling back to local DB', apiError);
          const localRelatives = await db.relatives.where('elderId').equals(id).toArray();
          setRelatives(localRelatives);
          // (Stories local fallback not fully implemented in DB schema map yet, but similar)
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) return <div>Loading Memory Vault...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Memory Vault</h1>
        <Button onClick={() => navigate(-1)} variant="outline">Back to Dashboard</Button>
      </div>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Relatives</h2>
          <Button onClick={() => navigate(`/caregiver/elders/${id}/vault/relative/new`)}>+ Add Relative</Button>
        </div>
        
        {relatives.length === 0 ? (
          <Card className="p-8 text-center bg-gray-50 border-dashed">
            <p className="text-gray-500 mb-4">No relatives added yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatives.map(relative => (
              <Card key={relative.id} className="overflow-hidden flex flex-col">
                {relative.photoUrl || relative.photo_url ? (
                  <img src={relative.photoUrl || relative.photo_url} alt={relative.name} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-4xl text-gray-400">
                    {relative.name.charAt(0)}
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-bold text-xl">{relative.name}</h3>
                  <p className="text-gray-600 capitalize">{relative.relationship}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Stories</h2>
          <Button disabled>+ Add Story</Button>
        </div>
        {stories.length === 0 ? (
          <Card className="p-8 text-center bg-gray-50 border-dashed">
            <p className="text-gray-500">No stories added yet. (Feature coming soon)</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stories.map(story => (
              <Card key={story.id} className="p-4">
                <h3 className="font-bold text-lg">{story.title}</h3>
                <p className="text-gray-600 line-clamp-2">{story.description}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
