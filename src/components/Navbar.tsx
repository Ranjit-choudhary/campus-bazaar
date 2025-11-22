import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Search, ShoppingCart, Menu, User, LogOut, Store as StoreIcon, Package as PackageIcon } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { supabase } from '../lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Skeleton } from './ui/skeleton';

const Navbar = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { cartItemCount } = useCart();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Helper function to fetch the user's role from the database
    const fetchUserRole = async (sessionUser: any) => {
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', sessionUser.id)
          .single();
        
        if (!mounted) return;

        if (error && error.code !== 'PGRST116') {
           console.error("Error fetching role:", error);
        }

        // Merge session user with role data
        setUser({ 
            ...sessionUser, 
            role: userData?.role || 'user' 
        });
      } catch (e) {
        console.error("Profile fetch error", e);
        if (mounted) setUser(sessionUser);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // 1. Check session immediately on mount (Fixes reload issue)
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchUserRole(session.user);
        } else {
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
        }
      } catch (e) {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    // 2. Listen for auth changes (Login/Logout events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Only fetch if we don't already have the user (prevents double fetch on mount)
        if (!user || user.id !== session.user.id) {
            fetchUserRole(session.user);
        }
      } else {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${searchQuery.trim()}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">Campus Bazaar</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/shop-all" className="transition-colors hover:text-foreground/80 text-foreground/60">Shop All</Link>
            <Link to="/themes" className="transition-colors hover:text-foreground/80 text-foreground/60">Themes</Link>
          </nav>
        </div>

        {/* Mobile Menu Trigger (Simple placeholder for now) */}
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden mr-2">
                    <Menu className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left">
                <nav className="flex flex-col gap-4 mt-4">
                    <Link to="/" className="text-lg font-semibold">Home</Link>
                    <Link to="/shop-all" className="text-lg">Shop All</Link>
                    <Link to="/themes" className="text-lg">Themes</Link>
                </nav>
            </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/cart')} className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {cartItemCount}
                </span>
              )}
            </Button>

            {loading ? (
              <Skeleton className="h-8 w-8 rounded-full" />
            ) : user ? (
              <div className="flex items-center gap-2">
                {/* Optional: Show role badge for special users */}
                {(user.role === 'retailer' || user.role === 'wholesaler' || user.role === 'admin') && (
                   <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 border border-blue-200 bg-blue-50 px-2 py-0.5 rounded-full hidden md:inline-block">
                     {user.role}
                   </span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name} />
                        <AvatarFallback>{user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.user_metadata?.full_name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {user.role === 'admin' && (
                      <DropdownMenuItem onClick={() => navigate('/admin/dashboard')}>
                        <User className="mr-2 h-4 w-4" /> Admin Dashboard
                      </DropdownMenuItem>
                    )}
                    {user.role === 'retailer' && (
                      <DropdownMenuItem onClick={() => navigate('/retailer/dashboard')}>
                        <StoreIcon className="mr-2 h-4 w-4" /> Retailer Dashboard
                      </DropdownMenuItem>
                    )}
                    {user.role === 'wholesaler' && (
                      <DropdownMenuItem onClick={() => navigate('/wholesaler/dashboard')}>
                        <PackageIcon className="mr-2 h-4 w-4" /> Wholesaler Dashboard
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" /> Profile
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" /> Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button onClick={() => navigate('/login')}>Login</Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navbar;