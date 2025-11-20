import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  role?: string;
}

type AppUser = User & { role?: string };

const ProtectedRoute = ({ role }: ProtectedRouteProps) => {
  const [appUser, setAppUser] = useState<AppUser | null | undefined>(undefined);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        // 1. Check Session Directly first (Faster on reload)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          if (mounted) setAppUser(null);
          return;
        }

        // 2. Fetch Role
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') {
           console.error("Error checking role:", error);
        }

        if (mounted) {
           // Combine auth user with role data
           setAppUser({ ...session.user, role: userData?.role });
        }

      } catch (error) {
        console.error("Auth check failed:", error);
        if (mounted) setAppUser(null);
      }
    };

    checkAuth();

    // 3. Also listen for changes (Sign out, etc)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
       if (!session) {
           if (mounted) setAppUser(null);
       }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Loading state (undefined means we haven't finished checking)
  if (appUser === undefined) {
    return (
        <div className="h-screen w-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
  }

  // Not logged in
  if (appUser === null) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but wrong role
  if (role && appUser.role !== role) {
    // Prevent toast spam if possible, or accept it shows once on redirect
    // setTimeout(() => toast.error("Access Denied: Insufficient permissions."), 0);
    return <Navigate to="/" replace />;
  }

  // Authorized
  return <Outlet />;
};

export default ProtectedRoute;