import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const [elders, setElders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    async function fetchElders() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      
      try {
        const response = await fetch(`${API_URL}/elders`, {
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setElders(data);
        }
      } catch (err) {
        console.error('Failed to fetch elders', err);
      } finally {
        setLoading(false);
      }
    }
    fetchElders();
  }, [API_URL]);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Caregiver Dashboard</h1>
      
      {elders.length === 0 ? (
        <Card className="text-center py-12">
          <h2 className="text-xl font-medium mb-2">No elders connected yet</h2>
          <p className="text-gray-600 mb-6">Add your first elder to begin monitoring their progress.</p>
          <Button onClick={() => navigate('/caregiver/create-elder')}>Add Elder</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {elders.map(elder => (
            <Card key={elder.id} className="flex items-center gap-4 cursor-pointer hover:border-secondary transition-colors">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-xl font-bold text-gray-500">
                {elder.full_name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold">{elder.full_name}</h3>
                <p className="text-sm text-gray-500">Language: {elder.primary_language}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate(`/caregiver/elders/${elder.id}/vault`)}>
                  Memory Vault
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate(`/caregiver/elders/${elder.id}/pair`)}>
                  Pair Device
                </Button>
              </div>
            </Card>
          ))}
          
          <Card className="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors border-dashed min-h-[100px]" onClick={() => navigate('/caregiver/create-elder')}>
            <span className="text-2xl mb-2">+</span>
            <span className="font-medium">Add another elder</span>
          </Card>
        </div>
      )}
    </div>
  );
}
