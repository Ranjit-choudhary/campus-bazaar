import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MapPin, Edit2, Save, X, Loader2, Search as SearchIcon } from 'lucide-react';

// --- GOOGLE MAPS IMPORTS ---
import { GoogleMap, LoadScript, Marker, Autocomplete } from '@react-google-maps/api';

// Configuration
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const LIBRARIES: ("places")[] = ["places"];

interface AddressData {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  
  // Address & Editing State
  const [savedAddress, setSavedAddress] = useState<AddressData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressData>({
    full_name: '', phone: '', address_line1: '', address_line2: '',
    city: '', state: '', zip_code: '', country: 'India'
  });

  // Map State
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const defaultCenter = { lat: 17.5449, lng: 78.5718 }; // Default: BITS Hyderabad

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);

      // 1. Fetch User Profile
      const { data: profileData } = await supabase.from('users').select('*').eq('id', user.id).single();
      setProfile(profileData);

      // 2. Fetch Saved Address
      const { data: addressData } = await supabase.from('addresses').select('*').eq('user_id', user.id).single();
      if (addressData) {
        setSavedAddress(addressData);
        setAddressForm(addressData);
        setAddressForm(prev => ({ ...prev, full_name: addressData.full_name || user.user_metadata.full_name || '' }));
      } else {
        // Initialize form with name if no address exists
        setAddressForm(prev => ({ ...prev, full_name: user.user_metadata.full_name || '' }));
        setMarkerPosition(defaultCenter);
      }

      // 3. Fetch Orders
      const { data: ordersData } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setOrders(ordersData || []);
      
      setLoading(false);
    };
    fetchProfile();
  }, [navigate]);

  // --- GOOGLE MAPS LOGIC ---

  const onLoadMap = useCallback((mapInstance: google.maps.Map) => {
      setMap(mapInstance);
  }, []);

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
          const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`);
          const data = await response.json();
          if (data.status === 'OK' && data.results?.[0]) {
              fillAddressFromComponents(data.results[0].address_components);
              toast.success("Location updated");
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

  // --- SAVE HANDLER ---

  const handleSaveAddress = async () => {
    if (!addressForm.full_name || !addressForm.address_line1 || !addressForm.city || !addressForm.zip_code) {
        toast.error('Please fill in all required fields.');
        return;
    }
    setIsSaving(true);
    try {
        const { error } = await supabase.from('addresses').upsert({ 
            user_id: user.id, ...addressForm 
        }, { onConflict: 'user_id' });

        if (error) throw error;

        setSavedAddress(addressForm);
        setIsEditing(false);
        toast.success("Address updated successfully!");
    } catch (error: any) {
        toast.error(error.message || "Failed to save address");
    } finally {
        setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("You've been logged out.");
    navigate('/');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Profile...</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        
        {/* Header Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-primary/20">
                  <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                  <AvatarFallback className="text-xl">{profile?.full_name?.charAt(0) || user?.email?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-3xl">{profile?.full_name || 'User'}</CardTitle>
                  <p className="text-muted-foreground">{profile?.email}</p>
                  {profile?.role !== 'user' && (
                    <span className="inline-block mt-2 text-xs font-bold uppercase tracking-wider text-blue-600 border border-blue-200 bg-blue-50 px-2 py-0.5 rounded-full">
                        {profile?.role} Account
                    </span>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={handleLogout}>Logout</Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Address */}
            <div className="lg:col-span-2">
                <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" /> Location & Address
                        </CardTitle>
                        {!isEditing && (
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                                <Edit2 className="h-4 w-4 mr-2" /> Edit Location
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {isEditing ? (
                            // --- EDIT MODE ---
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                <div className="border rounded-lg overflow-hidden shadow-sm h-[300px] relative">
                                    {GOOGLE_MAPS_API_KEY ? (
                                        <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={LIBRARIES}>
                                            <div className="absolute top-2 left-2 right-2 z-10">
                                                <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged}>
                                                    <div className="relative">
                                                        <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                        <Input placeholder="Search area..." className="bg-background shadow-md w-full pl-9" />
                                                    </div>
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
                                        <div className="h-full flex items-center justify-center bg-muted text-muted-foreground">
                                            Map Key Missing
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs text-center text-muted-foreground">
                                    Drag the marker on the map to automatically fill details.
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>Full Name</Label><Input value={addressForm.full_name} onChange={e => setAddressForm({...addressForm, full_name: e.target.value})} /></div>
                                    <div className="space-y-2"><Label>Phone</Label><Input value={addressForm.phone} onChange={e => setAddressForm({...addressForm, phone: e.target.value})} /></div>
                                </div>
                                <div className="space-y-2"><Label>Flat / House No / Street</Label><Input value={addressForm.address_line1} onChange={e => setAddressForm({...addressForm, address_line1: e.target.value})} /></div>
                                <div className="space-y-2"><Label>Area / Landmark</Label><Input value={addressForm.address_line2} onChange={e => setAddressForm({...addressForm, address_line2: e.target.value})} /></div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="space-y-2"><Label>City</Label><Input value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} /></div>
                                    <div className="space-y-2"><Label>State</Label><Input value={addressForm.state} onChange={e => setAddressForm({...addressForm, state: e.target.value})} /></div>
                                    <div className="space-y-2 col-span-2 md:col-span-1"><Label>Pincode</Label><Input value={addressForm.zip_code} onChange={e => setAddressForm({...addressForm, zip_code: e.target.value})} /></div>
                                </div>

                                <div className="flex gap-3 justify-end">
                                    <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
                                    <Button onClick={handleSaveAddress} disabled={isSaving}>
                                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : <><Save className="mr-2 h-4 w-4"/> Save Changes</>}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // --- VIEW MODE ---
                            <div className="space-y-4">
                                {savedAddress ? (
                                    <div className="space-y-1">
                                        <div className="font-semibold text-lg">{savedAddress.full_name}</div>
                                        <div className="text-muted-foreground">{savedAddress.address_line1}</div>
                                        {savedAddress.address_line2 && <div className="text-muted-foreground">{savedAddress.address_line2}</div>}
                                        <div className="text-muted-foreground">
                                            {savedAddress.city}, {savedAddress.state} - {savedAddress.zip_code}
                                        </div>
                                        <div className="text-muted-foreground text-sm mt-2">
                                            <span className="font-medium text-foreground">Phone:</span> {savedAddress.phone}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                                        <MapPin className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                        <p>No address saved yet.</p>
                                        <Button variant="link" onClick={() => setIsEditing(true)}>Add Address</Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Order History */}
            <div className="lg:col-span-1">
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle>Order History</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto max-h-[600px] pr-2">
                        <div className="space-y-4">
                        {orders.length > 0 ? (
                            orders.map(order => (
                            <div key={order.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="font-mono text-xs text-muted-foreground">ORDER #{order.id.substring(0, 8).toUpperCase()}</div>
                                        <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        order.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                                        order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                        {order.status}
                                    </div>
                                </div>
                                <div className="flex justify-between items-end mt-2">
                                    <div className="text-sm">
                                        {order.order_details ? (
                                            <span className="text-muted-foreground">{order.order_details.length} items</span>
                                        ) : (
                                            <span className="text-muted-foreground">View details</span>
                                        )}
                                    </div>
                                    <div className="font-bold">₹{order.total_amount.toLocaleString()}</div>
                                </div>
                            </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-center py-8">No orders yet.</p>
                        )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;