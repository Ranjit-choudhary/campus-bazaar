// src/pages/AdminLogin.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const GoogleIcon = () => (
    <svg role="img" viewBox="0 0 488 512" xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4">
        <path fill="currentColor" d="M488 261.8C488 403.3 381.5 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.2 172.9 65.6l-63.7 63.7C333.5 113.4 293.3 96 248 96c-88.8 0-160.1 71.1-160.1 160.1s71.3 160.1 160.1 160.1c98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
    </svg>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // --- MODIFIED QUERY ---
        const { data: userData } = await supabase
          .from('users') // Changed from 'profiles'
          .select('role') // Changed from 'role_id'
          .eq('id', session.user.id)
          .single();
        
        if (userData && userData.role === 'admin') { // Check for 'admin' role
          setIsAdmin(true);
        }
        // --- END MODIFICATION ---
      }
    };
    checkAdminStatus();
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    } else if (data.user) {
      toast.success('Login successful!');
      // --- MODIFIED QUERY ---
      const { data: userData } = await supabase
        .from('users') // Changed from 'profiles'
        .select('role') // Changed from 'role_id'
        .eq('id', data.user.id)
        .single();
      
      if (userData?.role === 'admin') { // Check for 'admin' role
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
      // --- END MODIFICATION ---
    }
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Login</CardTitle>
          <p className="text-muted-foreground">Sign in to your account</p>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isLoading}>
            <GoogleIcon />
            Sign in with Google
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>
          
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In with Email'}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            {isAdmin && (
              <Button variant="secondary" className="w-full" onClick={() => navigate('/admin/dashboard')}>
                Go to Admin Dashboard
              </Button>
            )}
            <Button variant="ghost" onClick={() => navigate('/')} className="mt-2">
              Back to Store
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;