// src/pages/ProfilePage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null); // This state now holds data from 'users' table
  const [address, setAddress] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // --- MODIFIED QUERY ---
      // Changed from 'profiles' to 'users'
      const { data: profileData } = await supabase.from('users').select('*').eq('id', user.id).single();
      setProfile(profileData);
      // --- END MODIFICATION ---

      const { data: addressData } = await supabase.from('addresses').select('*').eq('user_id', user.id).single();
      setAddress(addressData);

      const { data: ordersData } = await supabase.from('orders').select('*').eq('user_id', user.id);
      setOrders(ordersData || []);
      
      setLoading(false);
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("You've been logged out.");
    navigate('/');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {/* MODIFIED: Use new column names */}
                  <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                  <AvatarFallback>{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{profile?.full_name}</CardTitle>
                  <p className="text-muted-foreground">{profile?.email}</p>
                  {/* END MODIFICATION */}
                </div>
              </div>
              <Button variant="outline" onClick={handleLogout}>Logout</Button>
            </div>
          </CardHeader>
          <CardContent>
            <h2 className="text-xl font-semibold mt-6 mb-4">Your Address</h2>
            {address ? (
              <p>
                {address.hostel}, Room {address.room_number}, BPHC
              </p>
            ) : (
              <p>No address on file.</p>
            )}
            <h2 className="text-xl font-semibold mt-6 mb-4">Your Orders</h2>
            <div className="space-y-4">
              {orders.length > 0 ? (
                orders.map(order => (
                  <Card key={order.id}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-semibold">Order #{order.id.substring(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{order.total_amount}</p>
                        <p className="text-sm text-green-600 capitalize">{order.status}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p>You haven't placed any orders yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;