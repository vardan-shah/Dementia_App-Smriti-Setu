import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function RoleSelect() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface p-6">
      <h1 className="text-3xl font-bold text-primary mb-8">Who is using this device?</h1>
      
      <div className="flex flex-col gap-6 w-full max-w-md">
        <Card className="hover:border-primary cursor-pointer transition-colors" onClick={() => navigate('/elder/pair')}>
          <div className="flex flex-col items-center gap-4 py-4">
            <h2 className="text-2xl font-bold">I am an Elder</h2>
            <p className="text-gray-600 text-center">I have a pairing code from my caregiver.</p>
            <Button size="lg" className="w-full mt-2">Enter Code</Button>
          </div>
        </Card>

        <Card className="hover:border-primary cursor-pointer transition-colors" onClick={() => navigate('/caregiver/login')}>
          <div className="flex flex-col items-center gap-4 py-4">
            <h2 className="text-2xl font-bold">I am a Caregiver</h2>
            <p className="text-gray-600 text-center">I want to manage profiles and activities.</p>
            <Button variant="secondary" size="lg" className="w-full mt-2">Caregiver Login</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
