import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '../components/ui/Button';

export function Landing() {
  const navigate = useNavigate();
  const { role } = useAuthStore();

  useEffect(() => {
    if (role === 'CAREGIVER') {
      navigate('/caregiver', { replace: true });
    } else if (role === 'ELDER') {
      navigate('/elder', { replace: true });
    }
  }, [role, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface p-6">
      <h1 className="text-5xl font-bold text-primary mb-4">Smriti Setu</h1>
      <p className="text-xl text-gray-600 mb-12 text-center max-w-md">
        A cognitive support platform for elders and their caregivers.
      </p>
      
      <Button size="lg" onClick={() => navigate('/role-select')} className="w-full max-w-sm">
        Get Started
      </Button>
    </div>
  );
}
