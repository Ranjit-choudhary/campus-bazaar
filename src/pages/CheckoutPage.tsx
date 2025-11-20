import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
// Corrected Imports: pointing to src/components/ui from src/pages
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { useCart } from '../contexts/CartContext';
import { toast } from 'sonner';
import { MapPin, Truck, CreditCard, Wallet, Banknote, Loader2 } from 'lucide-react';

// Define Razorpay type on window
declare global {
    interface Window {
        Razorpay: any;
    }
}

interface CheckoutAddress {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cart, cartItemCount, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  
  const [user, setUser] = useState<any>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'cod'>('card');
  
  const [savedAddress, setSavedAddress] = useState<CheckoutAddress | null>(null);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  
  const [addressForm, setAddressForm] = useState<CheckoutAddress>({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'India'
  });

  useEffect(() => {
    const fetchUserAndAddress = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setAddressForm(prev => ({ ...prev, full_name: user.user_metadata.full_name || '' }));

        const { data: address } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (address) {
          setSavedAddress(address);
          setAddressForm(address);
        } else {
          setIsEditingAddress(true);
        }
      } else {
        navigate('/login');
      }
    };
    fetchUserAndAddress();
  }, [navigate]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddressForm(prev => ({ ...prev, [name]: value }));
  };

  const subtotal = cart.reduce((total, item) => {
    if (item.products) {
      const price = Number(item.products.price) || 0;
      const quantity = Number(item.quantity) || 0;
      return total + (price * quantity);
    }
    return total;
  }, 0);
  
  const shipping = orderType === 'pickup' ? 0 : (subtotal > 0 ? 50 : 0);
  const total = subtotal + shipping;

  // --- Helper to Load Razorpay Script Dynamically ---
  const loadRazorpayScript = (src: string) => {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) {
          resolve(true);
          return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    // Validation
    if (orderType === 'delivery') {
        if (isEditingAddress || !savedAddress) {
            if (!addressForm.full_name || !addressForm.address_line1 || !addressForm.city || !addressForm.zip_code || !addressForm.phone) {
                toast.error('Please fill in all required address fields.');
                return;
            }
        }
    }

    if (!termsAccepted) {
      toast.error('You must accept the terms and conditions.');
      return;
    }

    // Determine Flow
    if (paymentMethod === 'cod') {
        await finalizeOrder('pending'); 
    } else {
        // Online Payment (Razorpay)
        await initializeRazorpay();
    }
  };

  const initializeRazorpay = async () => {
      setLoading(true);
      
      // 1. Load the script
      const res = await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js');

      if (!res) {
          toast.error("Razorpay SDK failed to load. Check internet connection.");
          setLoading(false);
          return;
      }

      // 2. Create Options
      const options = {
          key: "rzp_test_Ri5jk85JFwqzoQ", // Your Test Key
          amount: Math.round(total * 100), // Amount in paise (Integer)
          currency: "INR",
          name: "Campus Bazaar",
          description: "Test Transaction",
          // You can add a logo here if you have one hosted
          // image: "https://campus-bazaar.vercel.app/logo.png", 
          handler: function (response: any) {
              // Success Callback
              console.log("Payment ID: ", response.razorpay_payment_id);
              toast.success(`Payment Successful!`);
              finalizeOrder('paid', response.razorpay_payment_id);
          },
          prefill: {
              name: user?.user_metadata?.full_name || addressForm.full_name,
              email: user?.email,
              contact: addressForm.phone || '9999999999'
          },
          notes: {
              address: "Campus Bazaar Checkout"
          },
          theme: {
              color: "#3399cc"
          }
      };

      // 3. Open Modal
      try {
        const rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', function (response: any){
            toast.error(`Payment Failed: ${response.error.description}`);
            setLoading(false);
        });
        rzp1.open();
      } catch (error) {
          console.error("Razorpay Init Error:", error);
          toast.error("Something went wrong initializing payment.");
          setLoading(false);
      }
  };

  const finalizeOrder = async (paymentStatus: string, paymentId?: string) => {
    try {
        // Save Address if needed
        if (orderType === 'delivery' && (isEditingAddress || !savedAddress)) {
            const { error: addressError } = await supabase
            .from('addresses')
            .upsert({ 
                user_id: user.id, 
                ...addressForm 
            }, { onConflict: 'user_id' });

            if (addressError) throw addressError;
        }
        
        // Create Order Snapshot
        const orderDetails = cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.products?.price, 
            name: item.products?.name
        }));

        // Insert Order
        const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: user.id,
            total_amount: total,
            status: 'placed',
            order_type: orderType,
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            order_details: orderDetails, 
            // You could store paymentId in a 'transaction_id' column if you added one
        })
        .select()
        .single();

        if (orderError) throw orderError;

        await clearCart();
        toast.success('Order placed successfully!');
        navigate(`/order/${orderData.id}`);

    } catch (error: any) {
        console.error('Checkout Error:', error);
        toast.error(error.message || 'Failed to place order.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Delivery Method */}
            <Card>
                <CardHeader><CardTitle className="text-lg">1. Delivery Method</CardTitle></CardHeader>
                <CardContent>
                    <RadioGroup 
                        value={orderType} 
                        onValueChange={(v) => setOrderType(v as 'delivery' | 'pickup')}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                        <div className={`flex items-center space-x-2 border p-4 rounded-lg cursor-pointer transition-colors ${orderType === 'delivery' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                            <RadioGroupItem value="delivery" id="delivery" />
                            <Label htmlFor="delivery" className="flex-grow cursor-pointer flex items-center gap-3">
                                <Truck className="h-5 w-5 text-muted-foreground" />
                                <div><div className="font-medium">Home Delivery</div><div className="text-xs text-muted-foreground">Delivered to your address</div></div>
                            </Label>
                        </div>
                        <div className={`flex items-center space-x-2 border p-4 rounded-lg cursor-pointer transition-colors ${orderType === 'pickup' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                            <RadioGroupItem value="pickup" id="pickup" />
                            <Label htmlFor="pickup" className="flex-grow cursor-pointer flex items-center gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground" />
                                <div><div className="font-medium">Store Pickup</div><div className="text-xs text-muted-foreground">Collect from retailer</div></div>
                            </Label>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>

            {/* 2. Shipping Address */}
            {orderType === 'delivery' && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">2. Shipping Address</CardTitle>
                        {!isEditingAddress && savedAddress && (
                            <Button variant="ghost" size="sm" onClick={() => setIsEditingAddress(true)}>Change</Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {isEditingAddress ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>Full Name</Label><Input name="full_name" value={addressForm.full_name} onChange={handleAddressChange} placeholder="John Doe" /></div>
                                    <div className="space-y-2"><Label>Phone Number</Label><Input name="phone" value={addressForm.phone} onChange={handleAddressChange} placeholder="+91 98765 43210" /></div>
                                </div>
                                <div className="space-y-2"><Label>Address Line 1</Label><Input name="address_line1" value={addressForm.address_line1} onChange={handleAddressChange} placeholder="House No., Street Name" /></div>
                                <div className="space-y-2"><Label>Address Line 2</Label><Input name="address_line2" value={addressForm.address_line2} onChange={handleAddressChange} placeholder="Apartment, Landmark" /></div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="space-y-2"><Label>City</Label><Input name="city" value={addressForm.city} onChange={handleAddressChange} placeholder="City" /></div>
                                    <div className="space-y-2"><Label>State</Label><Input name="state" value={addressForm.state} onChange={handleAddressChange} placeholder="State" /></div>
                                    <div className="space-y-2 col-span-2 md:col-span-1"><Label>ZIP Code</Label><Input name="zip_code" value={addressForm.zip_code} onChange={handleAddressChange} placeholder="123456" /></div>
                                </div>
                                {savedAddress && <Button variant="secondary" size="sm" onClick={() => setIsEditingAddress(false)}>Cancel</Button>}
                            </div>
                        ) : (
                            <div className="flex flex-col space-y-1">
                                <p className="font-medium">{savedAddress?.full_name}</p>
                                <p className="text-muted-foreground">{savedAddress?.address_line1}, {savedAddress?.address_line2}</p>
                                <p className="text-muted-foreground">{savedAddress?.city}, {savedAddress?.state} {savedAddress?.zip_code}</p>
                                <p className="text-muted-foreground mt-2">Phone: {savedAddress?.phone}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* 3. Payment Method */}
            <Card>
                <CardHeader><CardTitle className="text-lg">3. Payment Method</CardTitle></CardHeader>
                <CardContent>
                    <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)} className="space-y-3">
                        <div className={`flex items-center space-x-3 border p-4 rounded-lg cursor-pointer ${paymentMethod === 'card' ? 'border-primary ring-1 ring-primary' : ''}`}>
                            <RadioGroupItem value="card" id="card" />
                            <Label htmlFor="card" className="flex-grow cursor-pointer flex items-center gap-3"><div className="p-2 bg-blue-100 text-blue-600 rounded-full"><CreditCard className="h-5 w-5" /></div><span className="font-medium">Card (Razorpay)</span></Label>
                        </div>
                        <div className={`flex items-center space-x-3 border p-4 rounded-lg cursor-pointer ${paymentMethod === 'upi' ? 'border-primary ring-1 ring-primary' : ''}`}>
                            <RadioGroupItem value="upi" id="upi" />
                            <Label htmlFor="upi" className="flex-grow cursor-pointer flex items-center gap-3"><div className="p-2 bg-green-100 text-green-600 rounded-full"><Wallet className="h-5 w-5" /></div><span className="font-medium">UPI (Razorpay)</span></Label>
                        </div>
                        <div className={`flex items-center space-x-3 border p-4 rounded-lg cursor-pointer ${paymentMethod === 'cod' ? 'border-primary ring-1 ring-primary' : ''}`}>
                            <RadioGroupItem value="cod" id="cod" />
                            <Label htmlFor="cod" className="flex-grow cursor-pointer flex items-center gap-3"><div className="p-2 bg-orange-100 text-orange-600 rounded-full"><Banknote className="h-5 w-5" /></div><span className="font-medium">Cash on Delivery</span></Label>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`}</span></div>
                <div className="border-t pt-4 flex justify-between font-bold text-lg"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
                <div className="pt-4 flex items-start space-x-2">
                    <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(c) => setTermsAccepted(c as boolean)} />
                    <Label htmlFor="terms" className="text-sm text-muted-foreground">I agree to Terms & Conditions</Label>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full py-6 text-lg" onClick={handlePlaceOrder} disabled={loading || cart.length === 0}>
                    {loading ? 'Processing...' : `Pay ₹${total.toFixed(2)}`}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;