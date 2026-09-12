import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../supabase';

interface RoleGuardProps {
  allowedRole: 'CAREGIVER' | 'ELDER';
  children: React.ReactNode;
}

export function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const { role, caregiverId, elderId, setRole, setCaregiverId, clearAuth } = useAuthStore();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      setIsLoading(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (allowedRole === 'CAREGIVER') {
          if (!session || role !== 'CAREGIVER') {
            setIsValid(false);
          } else {
            setCaregiverId(session.user.id);
            setIsValid(true);
          }
        } else if (allowedRole === 'ELDER') {
          // Elders use anonymous sessions linked to device id
          if (!session || role !== 'ELDER' || !elderId) {
            setIsValid(false);
          } else {
            setIsValid(true);
          }
        }
      } catch (err) {
        console.error('Auth verification failed', err);
        setIsValid(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    verifyAuth();
  }, [role, allowedRole, elderId, setCaregiverId]);

  if (isLoading) {
    return <div className="flex h-screen w-screen items-center justify-center">Loading...</div>;
  }

  if (!isValid) {
    // If not valid, redirect to RoleSelect if role is null, otherwise to their respective login
    if (role === null) return <Navigate to="/role-select" state={{ from: location }} replace />;
    if (allowedRole === 'CAREGIVER') return <Navigate to="/caregiver/login" state={{ from: location }} replace />;
    if (allowedRole === 'ELDER') return <Navigate to="/elder/pair" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
