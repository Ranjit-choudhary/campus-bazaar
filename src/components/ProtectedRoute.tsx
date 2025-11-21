import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Fix: Added 'children' to the interface
interface ProtectedRouteProps {
  role: string;
  children: React.ReactNode;
}

const ProtectedRoute = ({ role, children }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (error || !userData) {
        console.error('Error fetching user role:', error);
        setLoading(false);
        return;
      }

      if (userData.role === role) {
        setAuthorized(true);
      }
      
      setLoading(false);
    };

    checkAuth();
  }, [role]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!authorized) {
    // Redirect based on role if needed, or just to login/home
    return <Navigate to="/login" replace />;
  }

  // Render the children (the actual protected page)
  return <>{children}</>;
};

export default ProtectedRoute;