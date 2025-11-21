import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { User as UserIcon, Store, Building2, Mail, ArrowLeft } from 'lucide-react';

const GoogleIcon = () => (
    <svg role="img" viewBox="0 0 488 512" xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4">
        <path fill="currentColor" d="M488 261.8C488 403.3 381.5 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.2 172.9 65.6l-63.7 63.7C333.5 113.4 293.3 96 248 96c-88.8 0-160.1 71.1-160.1 160.1s71.3 160.1 160.1 160.1c98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
    </svg>
);

const FacebookIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [useOtp, setUseOtp] = useState(false); 
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0); // Resend timer

  // Onboarding/Signup State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('user');
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        checkUserProfile(session.user);
      }
    };
    checkSession();
  }, []);

  // Timer for resend button
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const checkUserProfile = async (user: any) => {
    setIsLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile || error) {
        // Profile missing -> Show Onboarding
        setUserId(user.id);
        setUserEmail(user.email);
        setFullName(user.user_metadata?.full_name || ''); 
        setShowOnboarding(true);
      } else {
        handleRedirect(profile.role);
      }
    } catch (e) {
      console.error("Profile check error:", e);
      setShowOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedirect = (role: string) => {
    if (role === 'admin') navigate('/admin/dashboard');
    else if (role === 'retailer') navigate('/retailer/dashboard');
    else if (role === 'wholesaler') navigate('/wholesaler/dashboard');
    else navigate('/');
  };

  // --- OTP LOGIC ---
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
        toast.error("Please enter your email");
        return;
    }
    
    setIsLoading(true);
    
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: true, // Allows new users to sign up via OTP
      }
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Code sent! Check your email.');
      setOtpSent(true);
      setTimer(60); // Start 60s cooldown
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
        toast.error("Please enter the code");
        return;
    }
    setIsLoading(true);

    // Verify the 6-digit code
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email', 
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    } else if (data.user) {
      toast.success('Verified successfully!');
      // If session exists, check profile (will trigger onboarding if new user)
      if (data.session) {
        checkUserProfile(data.user);
      }
    }
  };
  // ----------------

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (isSignUp && !fullName.trim()) {
      toast.error("Please enter your name.");
      setIsLoading(false);
      return;
    }

    try {
        let result;
        if (isSignUp) {
            result = await supabase.auth.signUp({ 
                email, 
                password,
                options: {
                    data: { full_name: fullName, role: role }
                }
            });
        } else {
            result = await supabase.auth.signInWithPassword({ email, password });
        }
        
        const { data, error } = result;

        if (error) throw error;

        if (data.user) {
            if (isSignUp) {
                const { error: profileError } = await supabase.from('users').upsert({
                    id: data.user.id,
                    email: email,
                    full_name: fullName,
                    role: role
                }, { onConflict: 'id' });

                if (profileError) console.error("Error updating profile:", profileError);

                if (!data.session) {
                    toast.success('Signup successful! Please check your email to confirm.');
                    setIsLoading(false);
                    return;
                }
            } else {
                toast.success('Login successful!');
            }
            
            if (data.session) {
                checkUserProfile(data.user);
            }
        }
    } catch (error: any) {
        toast.error(error.message);
        setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: `${window.location.origin}/`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      }
    });
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { 
        redirectTo: `${window.location.origin}/`,
      }
    });
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    }
  };

  const handleOnboardingSubmit = async () => {
    if (!fullName.trim()) {
        toast.error("Please enter your name.");
        return;
    }
    if (!userId) return;

    setIsLoading(true);
    try {
        const { error } = await supabase
            .from('users')
            .upsert({
                id: userId,
                email: userEmail,
                full_name: fullName,
                role: role,
            }, { onConflict: 'id' });

        if (error) throw error;

        toast.success(`Welcome, ${fullName}!`);
        handleRedirect(role);
    } catch (error: any) {
        console.error("Onboarding error:", error);
        toast.error("Failed to create profile.");
    } finally {
        setIsLoading(false);
    }
  };

  const RoleSelection = () => (
    <div className="space-y-3">
        <Label className="text-base">I am a...</Label>
        <RadioGroup value={role} onValueChange={setRole} className="grid grid-cols-3 gap-4">
            <div>
                <RadioGroupItem value="user" id="role-user" className="peer sr-only" />
                <Label
                    htmlFor="role-user"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
                >
                    <UserIcon className="mb-2 h-5 w-5" />
                    <span className="text-xs font-semibold">Shopper</span>
                </Label>
            </div>
            <div>
                <RadioGroupItem value="retailer" id="role-retailer" className="peer sr-only" />
                <Label
                    htmlFor="role-retailer"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
                >
                    <Store className="mb-2 h-5 w-5" />
                    <span className="text-xs font-semibold">Retailer</span>
                </Label>
            </div>
            <div>
                <RadioGroupItem value="wholesaler" id="role-wholesaler" className="peer sr-only" />
                <Label
                    htmlFor="role-wholesaler"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
                >
                    <Building2 className="mb-2 h-5 w-5" />
                    <span className="text-xs font-semibold">Wholesaler</span>
                </Label>
            </div>
        </RadioGroup>
    </div>
  );

  if (showOnboarding) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-primary">Final Step!</CardTitle>
                    <CardDescription>Tell us a bit about yourself.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="fullname-onboard">Full Name</Label>
                        <Input 
                            id="fullname-onboard" 
                            placeholder="John Doe" 
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    </div>
                    <RoleSelection />
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={handleOnboardingSubmit} disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Complete Setup'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            {useOtp ? 'Login with Code' : (isSignUp ? 'Create Account' : 'Login')}
          </CardTitle>
          <p className="text-muted-foreground">
            {useOtp ? 'We\'ll send a one-time code to your email' : (isSignUp ? 'Join us today' : 'Welcome back!')}
          </p>
        </CardHeader>
        <CardContent>
          
          {!useOtp && !isSignUp && (
            <div className="flex flex-col gap-3 mb-6">
                <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isLoading}>
                    <GoogleIcon />
                    Sign in with Google
                </Button>
                <Button variant="outline" className="w-full" onClick={handleFacebookLogin} disabled={isLoading}>
                    <FacebookIcon />
                    Sign in with Facebook
                </Button>
            </div>
          )}

          {/* OTP FLOW */}
          {useOtp ? (
            <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email-otp">Email</Label>
                    <Input 
                        id="email-otp" 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        placeholder="m@example.com"
                        disabled={otpSent} // Lock email after sending
                    />
                </div>
                
                {otpSent && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="otp-code">OTP Code</Label>
                            <button 
                                type="button"
                                onClick={handleSendOtp}
                                disabled={timer > 0 || isLoading}
                                className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                            >
                                {timer > 0 ? `Resend in ${timer}s` : "Resend Code"}
                            </button>
                        </div>
                        <Input 
                            id="otp-code" 
                            type="text" 
                            value={otp} 
                            onChange={(e) => setOtp(e.target.value)} 
                            required 
                            placeholder="123456"
                            className="tracking-widest"
                        />
                    </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Processing...' : (otpSent ? 'Verify & Login' : 'Send Code')}
                </Button>
                
                <div className="text-center">
                    <button 
                        type="button" 
                        className="flex items-center justify-center w-full gap-2 text-sm text-muted-foreground hover:text-primary"
                        onClick={() => {
                            setUseOtp(false);
                            setOtpSent(false);
                            setOtp('');
                        }}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Password Login
                    </button>
                </div>
            </form>
          ) : (
            /* PASSWORD FLOW */
            <form onSubmit={handlePasswordAuth} className="space-y-4">
                {isSignUp && (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="fullname">Full Name</Label>
                            <Input id="fullname" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                        </div>
                        <RoleSelection />
                    </>
                )}

                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="m@example.com" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                </Button>

                {!isSignUp && (
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or</span>
                        </div>
                    </div>
                )}

                {!isSignUp && (
                     <Button 
                        type="button" 
                        variant="secondary" 
                        className="w-full" 
                        onClick={() => setUseOtp(true)}
                    >
                        <Mail className="mr-2 h-4 w-4" />
                        Login with Email Code
                    </Button>
                )}
            </form>
          )}

          {!useOtp && (
            <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">
                    {isSignUp ? "Already have an account? " : "Don't have an account? "}
                </span>
                <button 
                    type="button" 
                    className="text-primary hover:underline font-medium focus:outline-none"
                    onClick={() => {
                        setIsSignUp(!isSignUp);
                        setFullName('');
                    }}
                >
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;