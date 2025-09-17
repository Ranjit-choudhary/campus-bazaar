import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox'; // Import the Checkbox component
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom'; // Import Link for the terms and conditions page

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cart, cartItemCount, clearCart } = useCart();
  const [hostel, setHostel] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [termsAccepted, setTermsAccepted] = useState(false); // Add state for the checkbox

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: address, error } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (address) {
          setHostel(address.hostel);
          setRoomNumber(address.room_number);
        }
      } else {
        navigate('/login');
      }
    };
    fetchUser();
  }, [navigate]);

  const subtotal = cart.reduce((total, item) => {
    if (item.products) {
      return total + item.products.price * item.quantity;
    }
    return total;
  }, 0);
  const shipping = 50;
  const total = subtotal + shipping;

  const handlePlaceOrder = async () => {
    if (!hostel || !roomNumber) {
      toast.error('Please select your hostel and enter your room number.');
      return;
    }

    // Check if the terms and conditions are accepted
    if (!termsAccepted) {
      toast.error('You must accept the terms and conditions to place an order.');
      return;
    }

    setLoading(true);

    const { error: addressError } = await supabase
      .from('addresses')
      .upsert({ user_id: user.id, hostel, room_number: roomNumber }, { onConflict: 'user_id' });

    if (addressError) {
      toast.error('Failed to save your address.');
      setLoading(false);
      return;
    }
    
    const orderDetails = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.products?.price,
        name: item.products?.name,
        image: item.products?.images?.[0] || null
    }));

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total_amount: total,
        status: 'placed',
        order_details: orderDetails,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Supabase order error:', orderError);
      toast.error('Failed to place your order.');
      setLoading(false);
      return;
    }

    await clearCart();
    navigate(`/order/${orderData.id}`);
  };

  const hostels = [
    'Gautam', 'Shakar', 'Viswakarma', 'Vyas', 'Budh', 'Ram', 'Krishna', 'Malviya', 'Meera', 'Valmiki'
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">Checkout</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Location</Label>
                  <Input value="BPHC" disabled />
                </div>
                <div>
                  <Label htmlFor="hostel">Hostel</Label>
                  <Select value={hostel} onValueChange={setHostel}>
                    <SelectTrigger id="hostel">
                      <SelectValue placeholder="Select your hostel" />
                    </SelectTrigger>
                    <SelectContent>
                      {hostels.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="room-number">Room Number</Label>
                  <Input
                    id="room-number"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="Enter your room number"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <p>Subtotal ({cartItemCount} items)</p>
                  <p>₹{subtotal.toFixed(2)}</p>
                </div>
                <div className="flex justify-between">
                  <p>Shipping</p>
                  <p>₹{shipping.toFixed(2)}</p>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <p>Total</p>
                  <p>₹{total.toFixed(2)}</p>
                </div>

                {/* Add the Terms and Conditions checkbox here */}
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked as boolean)} />
                  <Label htmlFor="terms" className="text-sm text-muted-foreground">
                    I agree to the{' '}
                    <Link to="/terms-and-conditions" className="underline hover:text-primary">
                      Terms and Conditions
                    </Link>
                  </Label>
                </div>

                <Button className="w-full" onClick={handlePlaceOrder} disabled={loading || cart.length === 0}>
                  {loading ? 'Placing Order...' : 'Place Order'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;