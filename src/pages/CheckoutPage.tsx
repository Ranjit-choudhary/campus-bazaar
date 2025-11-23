import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { MapPin, Truck, CreditCard, Wallet, Banknote, Save, Loader2, Crosshair, ShieldCheck, Calendar } from 'lucide-react';
import { GoogleMap, LoadScript, Marker, Autocomplete } from '@react-google-maps/api';
import { retailers } from '@/data/products';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const LIBRARIES: ("places")[] = ["places"];

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

// --- HARDCODED RETAILER ADDRESSES ---
const RETAILER_ADDRESSES: Record<string, string> = {
  'ret-1': 'Plot 101, Jubilee Hills, Hyderabad, Telangana 500033',
  'ret-2': 'Shop 4, Park Lane, Secunderabad, Telangana 500003',
  'ret-3': '2nd Floor, Banjara Hills Rd 12, Hyderabad, Telangana 500034',
  'ret-4': 'Linking Road, Bandra West, Mumbai, Maharashtra 400050',
  'ret-5': '100 Feet Road, Indiranagar, Bangalore, Karnataka 560038'
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [user, setUser] = useState<any>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'cod'>('card');
  
  const [savedAddress, setSavedAddress] = useState<CheckoutAddress | null>(null);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  
  const [addressForm, setAddressForm] = useState<CheckoutAddress>({
    full_name: '', phone: '', address_line1: '', address_line2: '',
    city: '', state: '', zip_code: '', country: 'India'
  });

  // --- MAP STATE ---
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [mapLoading, setMapLoading] = useState(false);

  const FALLBACK_CENTER = { lat: 28.6139, lng: 77.2090 };

  useEffect(() => {
    const initData = async () => {
      // FIXED: Changed getSession() to getUser() to correctly destructure 'user'
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
      setAddressForm(prev => ({ ...prev, full_name: user.user_metadata.full_name || '' }));

      // 1. Try to fetch saved address
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
        getUserLocation(); 
      }
    };
    initData();
  }, [navigate]);

  // --- LOCATION LOGIC ---
  const getUserLocation = () => {
      if (navigator.geolocation) {
          setMapLoading(true);
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  const pos = {
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                  };
                  setMarkerPosition(pos);
                  map?.panTo(pos);
                  map?.setZoom(17);
                  fetchAddressFromCoordinates(pos.lat, pos.lng);
                  setMapLoading(false);
              },
              () => {
                  toast.error("Location access denied. Using default map view.");
                  setMarkerPosition(FALLBACK_CENTER);
                  setMapLoading(false);
              }
          );
      } else {
          setMarkerPosition(FALLBACK_CENTER);
      }
  };

  const onLoadMap = useCallback((mapInstance: google.maps.Map) => {
      setMap(mapInstance);
      if (markerPosition) mapInstance.panTo(markerPosition);
  }, [markerPosition]);

  const onLoadAutocomplete = (autocomplete: google.maps.places.Autocomplete) => {
      autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
      if (autocompleteRef.current) {
          const place = autocompleteRef.current.getPlace();
          if (place.geometry && place.geometry.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              setMarkerPosition({ lat, lng });
              map?.panTo({ lat, lng });
              map?.setZoom(17);
              fillAddressFromComponents(place.address_components);
          }
      }
  };

  const onMarkerDragEnd = async (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          setMarkerPosition({ lat, lng });
          await fetchAddressFromCoordinates(lat, lng);
      }
  };

  const fetchAddressFromCoordinates = async (lat: number, lng: number) => {
      try {
          if (!GOOGLE_MAPS_API_KEY) return;
          const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
          );
          const data = await response.json();
          if (data.status === 'OK' && data.results?.[0]) {
              fillAddressFromComponents(data.results[0].address_components);
          }
      } catch (error) {
          console.error("Geocoding error:", error);
      }
  };

  const fillAddressFromComponents = (components: google.maps.GeocoderAddressComponent[] | undefined) => {
      if (!components) return;
      let streetNumber = '', route = '', sublocality = '', city = '', state = '', zip = '', country = '';

      components.forEach(component => {
          const types = component.types;
          if (types.includes('street_number')) streetNumber = component.long_name;
          if (types.includes('route')) route = component.long_name;
          if (types.includes('sublocality') || types.includes('neighborhood')) sublocality = component.long_name;
          if (types.includes('locality')) city = component.long_name;
          if (types.includes('administrative_area_level_1')) state = component.long_name;
          if (types.includes('postal_code')) zip = component.long_name;
          if (types.includes('country')) country = component.long_name;
      });

      setAddressForm(prev => ({
          ...prev,
          address_line1: `${streetNumber} ${route}`.trim() || prev.address_line1,
          address_line2: sublocality,
          city: city || prev.city,
          state: state || prev.state,
          zip_code: zip || prev.zip_code,
          country: country || 'India'
      }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddressForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveAddress = async () => {
      if (!addressForm.full_name || !addressForm.address_line1 || !addressForm.city || !addressForm.zip_code || !addressForm.phone) {
          toast.error('Please fill in all required address fields.');
          return;
      }
      setIsSaving(true);
      try {
          const { error } = await supabase.from('addresses').upsert({ user_id: user.id, ...addressForm }, { onConflict: 'user_id' });
          if (error) throw error;
          setSavedAddress(addressForm);
          setIsEditingAddress(false);
          toast.success("Address saved!");
      } catch (error: any) {
          toast.error("Failed to save address.");
      } finally {
          setIsSaving(false);
      }
  };

  // --- CHECKOUT LOGIC ---

  const subtotal = cart.reduce((total, item) => total + ((Number(item.products?.price) || 0) * item.quantity), 0);
  const shipping = orderType === 'pickup' ? 0 : (subtotal > 0 ? 50 : 0);
  const total = subtotal + shipping;

  // Determine unique retailers involved in this cart
  const uniqueRetailers = Array.from(new Set(cart.map(item => item.products?.retailer_id))).filter(Boolean) as string[];

  const handlePlaceOrder = async () => {
      if (orderType === 'delivery' && isEditingAddress) { toast.error("Please save your address first."); return; }
      if (!termsAccepted) { toast.error('You must accept terms.'); return; }
      if (paymentMethod === 'cod') await finalizeOrder('pending');
      else await initializeRazorpay();
  };

  const handleSimulatePayment = async () => {
      if (orderType === 'delivery' && isEditingAddress) { toast.error("Please save your address first."); return; }
      if (!termsAccepted) { toast.error('You must accept terms.'); return; }
      
      toast.info("Simulating secure payment...");
      setLoading(true);
      setTimeout(() => {
          finalizeOrder('paid', 'simulated_test_id_123');
      }, 1500);
  };

  const loadRazorpayScript = (src: string) => new Promise(resolve => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
      const script = document.createElement('script'); script.src = src;
      script.onload = () => resolve(true); script.onerror = () => resolve(false);
      document.body.appendChild(script);
  });

  const initializeRazorpay = async () => {
      setLoading(true);
      const res = await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!res) { toast.error("Razorpay SDK failed."); setLoading(false); return; }
      
      const options = {
          key: "rzp_test_Ri5jk85JFwqzoQ", 
          amount: Math.round(total * 100), 
          currency: "INR", 
          name: "Campus Bazaar",
          handler: function (response: any) { 
              toast.success(`Payment Successful!`); 
              finalizeOrder('paid', response.razorpay_payment_id); 
          },
          prefill: { 
              name: user?.user_metadata?.full_name, 
              email: user?.email, 
              contact: addressForm.phone || '9999999999' 
          },
          theme: { color: "#3399cc" }
      };
      try { new window.Razorpay(options).open(); } catch (error) { toast.error("Payment init failed"); setLoading(false); }
  };

  // --- FINALIZE ORDER ---
  const finalizeOrder = async (paymentStatus: string, paymentId?: string) => {
    try {
        setLoading(true);

        const orderDetails = [];
        const retailerInserts = [];

        for (const item of cart) {
            let retailerId = item.products?.retailer_id;

            // A. Fallback: Fetch retailer_id from DB if missing
            if (!retailerId) {
                const { data: prod } = await supabase
                    .from('products')
                    .select('retailer_id')
                    .eq('id', item.product_id)
                    .single();
                retailerId = prod?.retailer_id;
            }

            // B. Decrement Stock
            const { error: rpcError } = await supabase.rpc('decrement_stock', { 
                row_id: item.product_id, 
                amount: item.quantity 
            });

            if (rpcError) {
                const { data: currentProd } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
                const newStock = (currentProd?.stock || 0) - item.quantity;
                await supabase.from('products').update({ 
                    stock: Math.max(0, newStock), 
                    in_stock: newStock > 0 
                }).eq('id', item.product_id);
            }

            // C. Build Main Order Details
            orderDetails.push({
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.products?.price,
                name: item.products?.name
            });

            // D. Prepare Retailer Split Data
            if (retailerId) {
                retailerInserts.push({
                    user_id: user.id,
                    retailer_id: retailerId,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    total_price: (item.products?.price || 0) * item.quantity,
                    status: 'placed'
                });
            }
        }

        // 2. Insert Main Order
        const { data: orderData, error } = await supabase.from('orders').insert({
            user_id: user.id, 
            total_amount: total, 
            status: 'placed', 
            order_type: orderType, 
            payment_method: paymentMethod, 
            payment_status: paymentStatus, 
            order_details: orderDetails,
            payment_id: paymentId
        }).select().single();

        if (error) throw error;

        // 3. Insert Retailer Orders
        if (retailerInserts.length > 0) {
            const finalRetailerInserts = retailerInserts.map(r => ({
                ...r,
                order_id: orderData.id 
            }));

            await supabase.from('customer_orders').insert(finalRetailerInserts);
        }

        await clearCart();
        toast.success(paymentStatus === 'paid' ? 'Payment Received! Order Confirmed.' : 'Order placed successfully!');
        navigate(`/order/${orderData.id}`);

    } catch (error: any) { 
        console.error("Order finalization error:", error);
        toast.error(error.message || "Failed to finalize order."); 
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
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. DELIVERY METHOD */}
            <Card>
              <CardHeader>
                <CardTitle>1. Delivery Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={orderType} onValueChange={(v) => setOrderType(v as any)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={`flex items-center space-x-2 border p-4 rounded-lg cursor-pointer ${orderType === 'delivery' ? 'border-primary bg-primary/5' : ''}`}>
                    <RadioGroupItem value="delivery" id="delivery" />
                    <Label htmlFor="delivery" className="flex-grow cursor-pointer flex items-center gap-3"><Truck className="h-5 w-5" /> Home Delivery</Label>
                  </div>
                  <div className={`flex items-center space-x-2 border p-4 rounded-lg cursor-pointer ${orderType === 'pickup' ? 'border-primary bg-primary/5' : ''}`}><RadioGroupItem value="pickup" id="pickup" /><Label htmlFor="pickup" className="flex-grow cursor-pointer flex items-center gap-3"><MapPin className="h-5 w-5" /> Store Pickup</Label></div>
                </RadioGroup>
              </CardContent>
            </Card>
            
            {/* 2a. SHIPPING ADDRESS (For Delivery) */}
            {orderType === 'delivery' && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between"><CardTitle>2. Shipping Address</CardTitle>{!isEditingAddress && savedAddress && <Button variant="ghost" size="sm" onClick={() => setIsEditingAddress(true)}>Change</Button>}</CardHeader>
                    <CardContent>
                        {isEditingAddress ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                <div className="border rounded-lg overflow-hidden shadow-sm h-[350px] relative">{GOOGLE_MAPS_API_KEY ? (<LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={LIBRARIES}><div className="absolute top-2 left-2 right-2 z-10 flex gap-2"><Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged} className='flex-grow'><Input placeholder="Search your location..." className="bg-background shadow-md w-full" /></Autocomplete><Button size="icon" variant="secondary" className="shadow-md" onClick={getUserLocation}><Crosshair className="h-4 w-4" /></Button></div><GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={markerPosition || FALLBACK_CENTER} zoom={15} onLoad={onLoadMap} options={{ streetViewControl: false, mapTypeControl: false }}>{markerPosition && <Marker position={markerPosition} draggable={true} onDragEnd={onMarkerDragEnd} animation={window.google ? window.google.maps.Animation.DROP : undefined} />}</GoogleMap></LoadScript>) : <div className="h-full flex items-center justify-center bg-muted text-muted-foreground">API Key Missing</div>}</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label>Full Name</Label><Input name="full_name" value={addressForm.full_name} onChange={handleAddressChange} /></div><div className="space-y-2"><Label>Phone</Label><Input name="phone" value={addressForm.phone} onChange={handleAddressChange} /></div></div>
                                <div className="space-y-2"><Label>Address Line 1</Label><Input name="address_line1" value={addressForm.address_line1} onChange={handleAddressChange} /></div>
                                <div className="space-y-2"><Label>Address Line 2</Label><Input name="address_line2" value={addressForm.address_line2} onChange={handleAddressChange} /></div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4"><div className="space-y-2"><Label>City</Label><Input name="city" value={addressForm.city} onChange={handleAddressChange} /></div><div className="space-y-2"><Label>State</Label><Input name="state" value={addressForm.state} onChange={handleAddressChange} /></div><div className="space-y-2 col-span-2 md:col-span-1"><Label>ZIP</Label><Input name="zip_code" value={addressForm.zip_code} onChange={handleAddressChange} /></div></div>
                                <div className="flex gap-3 justify-end pt-2">{savedAddress && <Button variant="outline" onClick={() => setIsEditingAddress(false)} disabled={isSaving}>Cancel</Button>}<Button onClick={handleSaveAddress} disabled={isSaving}>{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : <><Save className="mr-2 h-4 w-4"/> Save Address</>}</Button></div>
                            </div>
                        ) : (<div className="flex flex-col space-y-1"><p className="font-medium">{savedAddress?.full_name}</p><p className="text-muted-foreground">{savedAddress?.address_line1}, {savedAddress?.address_line2}</p><p className="text-muted-foreground">{savedAddress?.city}, {savedAddress?.zip_code}</p><p className="text-muted-foreground mt-2">Phone: {savedAddress?.phone}</p></div>)}
                    </CardContent>
                </Card>
            )}

            {/* 2b. PICKUP LOCATIONS (For Pickup) */}
            {orderType === 'pickup' && (
                <Card>
                    <CardHeader><CardTitle>2. Pickup Locations</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-sm text-muted-foreground mb-2">Your items will be available at the following store(s):</div>
                        {uniqueRetailers.map(id => {
                            const retailer = retailers.find(r => r.id === id);
                            
                            // Calculate items for this retailer to add to calendar description
                            const retailerItems = cart
                                .filter(item => item.products?.retailer_id === id)
                                .map(item => item.products?.name)
                                .join(', ');

                            const handleAddToCalendar = () => {
                                if (!retailer) return;
                                const title = encodeURIComponent(`Pickup from ${retailer.name}`);
                                const details = encodeURIComponent(`Items to pickup: ${retailerItems}`);
                                const location = encodeURIComponent(retailer.address || retailer.city);
                                const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
                                window.open(url, '_blank');
                            };

                            return (
                                <div key={id} className="flex flex-col gap-2 p-3 rounded-lg border bg-muted/30">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                        <div>
                                            <div className="font-semibold">{retailer?.name || 'Campus Bazaar Partner'}</div>
                                            <div className="text-sm text-muted-foreground">{retailer?.address || 'Address details provided upon confirmation'}</div>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="ml-8 w-fit h-7 text-xs gap-1"
                                        onClick={handleAddToCalendar}
                                    >
                                        <Calendar className="h-3 w-3" />
                                        Add to Calendar
                                    </Button>
                                </div>
                            );
                        })}
                        {uniqueRetailers.length === 0 && (
                             <div className="text-sm text-muted-foreground">Store details will be provided in your order confirmation.</div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* 3. PAYMENT */}
            <Card><CardHeader><CardTitle>3. Payment Method</CardTitle></CardHeader><CardContent><RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)} className="space-y-3"><div className={`flex items-center space-x-3 border p-4 rounded-lg cursor-pointer ${paymentMethod === 'card' ? 'border-primary ring-1 ring-primary' : ''}`}><RadioGroupItem value="card" id="card" /><Label htmlFor="card" className="flex-grow cursor-pointer flex items-center gap-3"><CreditCard className="h-5 w-5 text-blue-600" /> Card (Razorpay)</Label></div><div className={`flex items-center space-x-3 border p-4 rounded-lg cursor-pointer ${paymentMethod === 'upi' ? 'border-primary ring-1 ring-primary' : ''}`}><RadioGroupItem value="upi" id="upi" /><Label htmlFor="upi" className="flex-grow cursor-pointer flex items-center gap-3"><Wallet className="h-5 w-5 text-green-600" /> UPI (Razorpay)</Label></div><div className={`flex items-center space-x-3 border p-4 rounded-lg cursor-pointer ${paymentMethod === 'cod' ? 'border-primary ring-1 ring-primary' : ''}`}><RadioGroupItem value="cod" id="cod" /><Label htmlFor="cod" className="flex-grow cursor-pointer flex items-center gap-3"><Banknote className="h-5 w-5 text-orange-600" /> Cash on Delivery</Label></div></RadioGroup></CardContent></Card>
          </div>
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`}</span></div><div className="border-t pt-4 flex justify-between font-bold text-lg"><span>Total</span><span>₹{total.toFixed(2)}</span></div><div className="pt-4 flex items-start space-x-2"><Checkbox id="terms" checked={termsAccepted} onCheckedChange={(c) => setTermsAccepted(c as boolean)} /><Label htmlFor="terms" className="text-sm text-muted-foreground">I agree to Terms & Conditions</Label></div></CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button className="w-full py-6 text-lg" onClick={handlePlaceOrder} disabled={loading || cart.length === 0}>{loading ? 'Processing...' : (paymentMethod === 'cod' ? `Place Order ₹${total.toFixed(2)}` : `Pay ₹${total.toFixed(2)}`)}</Button>
                {paymentMethod !== 'cod' && (<Button variant="outline" className="w-full text-green-600 border-green-600 hover:bg-green-50" onClick={handleSimulatePayment} disabled={loading || cart.length === 0}><ShieldCheck className="w-4 h-4 mr-2" /> Simulate Payment (Test Mode)</Button>)}
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;