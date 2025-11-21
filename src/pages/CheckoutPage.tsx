import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { useCart } from '../contexts/CartContext';
import { toast } from 'sonner';
import { MapPin, Truck, CreditCard, Wallet, Banknote, Save, Loader2 } from 'lucide-react';

// --- GOOGLE MAPS IMPORTS ---
import { GoogleMap, LoadScript, Marker, Autocomplete } from '@react-google-maps/api';

// --- CONFIGURATION ---
// Read API Key from .env file
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Libraries needed for Places Autocomplete (must be a static constant)
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
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'India'
  });

  // --- GOOGLE MAPS STATE ---
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Default Map Center (BITS Hyderabad)
  const defaultCenter = { lat: 17.5449, lng: 78.5718 };

  // Initialize User Data
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
          setMarkerPosition(defaultCenter); // Set default pin if no address
        }
      } else {
        navigate('/login');
      }
    };
    fetchUserAndAddress();
  }, [navigate]);

  // --- GOOGLE MAPS HANDLERS ---

  const onLoadMap = useCallback((mapInstance: google.maps.Map) => {
      setMap(mapInstance);
  }, []);

  const onLoadAutocomplete = (autocomplete: google.maps.places.Autocomplete) => {
      autocompleteRef.current = autocomplete;
  };

  // When user selects a place from the search bar
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
          } else {
              toast.error("Please select a valid location from the dropdown");
          }
      }
  };

  // When user drags the marker manually
  const onMarkerDragEnd = async (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          setMarkerPosition({ lat, lng });
          
          // Reverse Geocoding (Get address from dropped pin)
          await fetchAddressFromCoordinates(lat, lng);
      }
  };

  // Call Google Geocoding API to convert Lat/Lng -> Text
  const fetchAddressFromCoordinates = async (lat: number, lng: number) => {
      try {
          if (!GOOGLE_MAPS_API_KEY) {
              toast.error("Google Maps API Key is missing");
              return;
          }
          
          const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
          );
          const data = await response.json();
          
          if (data.status === 'OK' && data.results?.[0]) {
              fillAddressFromComponents(data.results[0].address_components);
              // Also set formatted address as line 1
              const formatted = data.results[0].formatted_address;
              toast.success(`Location updated`);
          } else {
              console.error("Geocoding failed:", data.status);
          }
      } catch (error) {
          console.error("Geocoding error:", error);
      }
  };

  // Helper to parse Google's address components
  const fillAddressFromComponents = (components: google.maps.GeocoderAddressComponent[] | undefined) => {
      if (!components) return;

      let streetNumber = '';
      let route = '';
      let sublocality = '';
      let city = '';
      let state = '';
      let zip = '';
      let country = '';

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

  // --- STANDARD FORM HANDLERS ---

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
          const { error } = await supabase
              .from('addresses')
              .upsert({ 
                  user_id: user.id, 
                  ...addressForm 
              }, { onConflict: 'user_id' });

          if (error) throw error;

          setSavedAddress(addressForm);
          setIsEditingAddress(false);
          toast.success("Address saved successfully!");
      } catch (error: any) {
          console.error("Save error:", error);
          toast.error("Failed to save address.");
      } finally {
          setIsSaving(false);
      }
  };

  // --- CHECKOUT LOGIC ---

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

  const loadRazorpayScript = (src: string) => {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(true); return; }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    if (orderType === 'delivery' && isEditingAddress) {
        toast.error("Please save your address first.");
        return;
    }
    if (!termsAccepted) {
      toast.error('You must accept the terms and conditions.');
      return;
    }
    if (paymentMethod === 'cod') await finalizeOrder('pending'); 
    else await initializeRazorpay();
  };

  const initializeRazorpay = async () => {
      setLoading(true);
      const res = await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!res) {
          toast.error("Razorpay SDK failed to load.");
          setLoading(false);
          return;
      }

      const options = {
          key: "rzp_test_Ri5jk85JFwqzoQ", // Replace with your key
          amount: Math.round(total * 100),
          currency: "INR",
          name: "Campus Bazaar",
          description: "Order Payment",
          handler: function (response: any) {
              toast.success(`Payment Successful!`);
              finalizeOrder('paid', response.razorpay_payment_id);
          },
          prefill: {
              name: user?.user_metadata?.full_name || addressForm.full_name,
              email: user?.email,
              contact: addressForm.phone || '9999999999'
          },
          theme: { color: "#3399cc" }
      };

      try {
        const rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', function (response: any){
            toast.error(response.error.description);
            setLoading(false);
        });
        rzp1.open();
      } catch (error) {
          toast.error("Payment init failed");
          setLoading(false);
      }
  };

  const finalizeOrder = async (paymentStatus: string, paymentId?: string) => {
    try {
        const orderDetails = cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.products?.price, 
            name: item.products?.name
        }));

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
        })
        .select()
        .single();

        if (orderError) throw orderError;

        await clearCart();
        toast.success('Order placed successfully!');
        navigate(`/order/${orderData.id}`);

    } catch (error: any) {
        console.error('Checkout Error:', error);
        toast.error(error.message);
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
            
            {/* 1. Delivery Method */}
            <Card>
                <CardHeader><CardTitle className="text-lg">1. Delivery Method</CardTitle></CardHeader>
                <CardContent>
                    <RadioGroup value={orderType} onValueChange={(v) => setOrderType(v as any)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className={`flex items-center space-x-2 border p-4 rounded-lg cursor-pointer ${orderType === 'delivery' ? 'border-primary bg-primary/5' : ''}`}>
                            <RadioGroupItem value="delivery" id="delivery" />
                            <Label htmlFor="delivery" className="flex-grow cursor-pointer flex items-center gap-3"><Truck className="h-5 w-5" /> Home Delivery</Label>
                        </div>
                        <div className={`flex items-center space-x-2 border p-4 rounded-lg cursor-pointer ${orderType === 'pickup' ? 'border-primary bg-primary/5' : ''}`}>
                            <RadioGroupItem value="pickup" id="pickup" />
                            <Label htmlFor="pickup" className="flex-grow cursor-pointer flex items-center gap-3"><MapPin className="h-5 w-5" /> Store Pickup</Label>
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
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                
                                {/* GOOGLE MAP COMPONENT */}
                                <div className="border rounded-lg overflow-hidden shadow-sm h-[350px] relative">
                                    {GOOGLE_MAPS_API_KEY ? (
                                        <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={LIBRARIES}>
                                            <div className="absolute top-2 left-2 right-2 z-10">
                                                <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged}>
                                                    <Input placeholder="Search for a location..." className="bg-background shadow-md w-full" />
                                                </Autocomplete>
                                            </div>
                                            <GoogleMap
                                                mapContainerStyle={{ width: '100%', height: '100%' }}
                                                center={markerPosition || defaultCenter}
                                                zoom={15}
                                                onLoad={onLoadMap}
                                                options={{ streetViewControl: false, mapTypeControl: false }}
                                            >
                                                {markerPosition && (
                                                    <Marker 
                                                        position={markerPosition} 
                                                        draggable={true} 
                                                        onDragEnd={onMarkerDragEnd}
                                                        animation={window.google ? window.google.maps.Animation.DROP : undefined}
                                                    />
                                                )}
                                            </GoogleMap>
                                        </LoadScript>
                                    ) : (
                                        <div className="h-full flex items-center justify-center bg-muted text-muted-foreground p-4 text-center">
                                            Google Maps API Key is missing. Please check your .env file.
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground text-center">Drag the pin to adjust your exact location.</p>

                                {/* FORM */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>Full Name</Label><Input name="full_name" value={addressForm.full_name} onChange={handleAddressChange} /></div>
                                    <div className="space-y-2"><Label>Phone</Label><Input name="phone" value={addressForm.phone} onChange={handleAddressChange} /></div>
                                </div>
                                <div className="space-y-2"><Label>Address Line 1</Label><Input name="address_line1" value={addressForm.address_line1} onChange={handleAddressChange} /></div>
                                <div className="space-y-2"><Label>Address Line 2</Label><Input name="address_line2" value={addressForm.address_line2} onChange={handleAddressChange} /></div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="space-y-2"><Label>City</Label><Input name="city" value={addressForm.city} onChange={handleAddressChange} /></div>
                                    <div className="space-y-2"><Label>State</Label><Input name="state" value={addressForm.state} onChange={handleAddressChange} /></div>
                                    <div className="space-y-2 col-span-2 md:col-span-1"><Label>ZIP</Label><Input name="zip_code" value={addressForm.zip_code} onChange={handleAddressChange} /></div>
                                </div>
                                
                                {/* ACTION BUTTONS */}
                                <div className="flex gap-3 justify-end pt-2">
                                    {savedAddress && <Button variant="outline" onClick={() => setIsEditingAddress(false)} disabled={isSaving}>Cancel</Button>}
                                    <Button onClick={handleSaveAddress} disabled={isSaving}>
                                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : <><Save className="mr-2 h-4 w-4"/> Save Address</>}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col space-y-1">
                                <p className="font-medium">{savedAddress?.full_name}</p>
                                <p className="text-muted-foreground">{savedAddress?.address_line1}, {savedAddress?.address_line2}</p>
                                <p className="text-muted-foreground">{savedAddress?.city}, {savedAddress?.zip_code}</p>
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
                            <Label htmlFor="card" className="flex-grow cursor-pointer flex items-center gap-3"><CreditCard className="h-5 w-5 text-blue-600" /> Card (Razorpay)</Label>
                        </div>
                        <div className={`flex items-center space-x-3 border p-4 rounded-lg cursor-pointer ${paymentMethod === 'upi' ? 'border-primary ring-1 ring-primary' : ''}`}>
                            <RadioGroupItem value="upi" id="upi" />
                            <Label htmlFor="upi" className="flex-grow cursor-pointer flex items-center gap-3"><Wallet className="h-5 w-5 text-green-600" /> UPI (Razorpay)</Label>
                        </div>
                        <div className={`flex items-center space-x-3 border p-4 rounded-lg cursor-pointer ${paymentMethod === 'cod' ? 'border-primary ring-1 ring-primary' : ''}`}>
                            <RadioGroupItem value="cod" id="cod" />
                            <Label htmlFor="cod" className="flex-grow cursor-pointer flex items-center gap-3"><Banknote className="h-5 w-5 text-orange-600" /> Cash on Delivery</Label>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>
          </div>

          {/* Summary Column */}
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