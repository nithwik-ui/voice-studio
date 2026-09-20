"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode;
  allowedRoles?: ('ADMIN' | 'USER')[];
}) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (allowedRoles && role && !allowedRoles.includes(role)) {
        // User is logged in but doesn't have the right role
        router.push(role === 'ADMIN' ? '/admin/dashboard' : '/dashboard');
      }
    }
  }, [user, role, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || (allowedRoles && role && !allowedRoles.includes(role))) {
    return null;
  }

  return <>{children}</>;
}
