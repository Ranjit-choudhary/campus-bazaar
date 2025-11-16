import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Search, ShoppingCart, Menu, User, LogOut } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Skeleton } from './ui/skeleton'; // Import Skeleton for loading UI

const Navbar = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { cartItemCount } = useCart();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true); // <-- ADD THIS STATE

  useEffect(() => {
    // We REMOVE the initial getSessionAndRole() call to prevent the race condition.
    // onAuthStateChange fires on page load *anyway* with the cached session.

    // Listen for auth changes and fetch role
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          if (session?.user) {
            // Fetch the role from the public.users table
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('role')
              .eq('id', session.user.id)
              .single();
            
            if (userError) throw userError;
            
            // Merge the auth user data with the public user data (role)
            setUser({ ...session.user, ...userData });
          } else {
            setUser(null);
          }
        } catch (error: any) {
          console.error("Error fetching user role:", error.message);
          setUser(session?.user || null); // Set user without role on error
        } finally {
          // This is the key: set loading to false AFTER the first auth check
          setLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); // The empty dependency array ensures this runs once

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${searchQuery.trim()}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search products..." className="w-full pl-8 md:w-[200px] lg:w-[336px]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </form>
          </div>
          <nav className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/cart')} className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {cartItemCount}
                </span>
              )}
            </Button>

            {/* --- MODIFIED RENDER LOGIC --- */}
            {loading ? (
              // Show a placeholder while checking auth to prevent flicker
              <Skeleton className="h-8 w-8 rounded-full" />
            ) : user ? (
              // User is logged in, show dropdown
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata.avatar_url} alt={user.user_metadata.full_name} />
                      <AvatarFallback>{user.user_metadata.full_name?.charAt(0) || 'A'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.user_metadata.full_name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      {user.role && (
                        <p className="text-xs leading-none text-blue-600 capitalize pt-1 font-medium">
                          {user.role}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {user.role === 'admin' ? (
                    <DropdownMenuItem onClick={() => navigate('/admin/dashboard')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Admin Dashboard</span>
                    </DropdownMenuItem>
                  ) : user.role === 'retailer' ? (
                    <DropdownMenuItem onClick={() => navigate('/retailer/dashboard')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Retailer Dashboard</span>
                    </DropdownMenuItem>
                  ) : user.role === 'wholesaler' ? (
                    <DropdownMenuItem onClick={() => navigate('/wholesaler/dashboard')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Wholesaler Dashboard</span>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // User is logged out, show Login button
              <Button onClick={() => navigate('/login')}>Login</Button>
            )}
            {/* --- END MODIFICATION --- */}
            
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navbar;