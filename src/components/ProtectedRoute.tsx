// src/components/ProtectedRoute.tsx
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Session, User } from '@supabase/supabase-js'; // Import Supabase types

interface ProtectedRouteProps {
  role?: string;
}

// Create a combined type for our user object
type AppUser = User & { role?: string };

const ProtectedRoute = ({ role }: ProtectedRouteProps) => {
  // We use `undefined` to mean "we haven't checked yet"
  const [appUser, setAppUser] = useState<AppUser | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // This listener is the single source of truth.
    // It fires once on page load and again on any auth change.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          if (session?.user) {
            // User is logged in, now get their role from public.users
            const { data: userData, error: userError } = await supabase
              .from('users') // This queries 'public.users'
              .select('role')
              .eq('id', session.user.id)
              .single();

            if (userError) throw userError;

            if (userData) {
              // We have the session AND the role
              setAppUser({ ...session.user, ...userData });
            } else {
              // This is a problem: user is auth'd but has no row in public.users
              // This shouldn't happen with the trigger, but we must handle it.
              console.error("Auth Error: User exists in auth but not in public.users.");
              toast.error("User profile is missing. Please contact support.");
              setAppUser(session.user); // Set user without role
            }
          } else {
            // User is logged out
            setAppUser(null);
          }
        } catch (e: any) {
            console.error("Error in auth listener:", e.message);
            toast.error("An error occurred checking your permissions.");
            setAppUser(null); // Log them out on error
        } finally {
            // THIS IS THE FIX:
            // After the first check (on page load), we are no longer loading.
            setLoading(false);
        }
      }
    );

    return () => {
      // Cleanup the listener on component unmount
      authListener.subscription.unsubscribe();
    };
  }, []); // The empty array ensures this effect runs only once on mount

  // --- Render Logic ---

  if (loading) {
    return <div>Loading...</div>; // Show loading screen ONLY while the listener runs for the first time
  }

  // If loading is done and there's no user, redirect to login
  if (!appUser) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // If a role is required and the user's role doesn't match, redirect
  if (role && appUser?.role !== role) {
    toast.error("Access Denied: You do not have permission to view this page.");
    return <Navigate to="/" replace />;
  }

  // If all checks pass, render the child component (e.g., AdminDashboard)
  return <Outlet />;
};

export default ProtectedRoute;