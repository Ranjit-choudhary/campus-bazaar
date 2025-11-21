import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// Configuration
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

interface LocationContextType {
  userCity: string | null;
  setUserCity: (city: string | null) => void;
  isLoadingLocation: boolean;
  detectBrowserLocation: () => Promise<void>; // New function exposed to components
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [userCity, setUserCity] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  // Helper: Convert Lat/Lng to City Name using Google API
  const getCityFromCoords = async (lat: number, lng: number): Promise<string | null> => {
    try {
        if (!GOOGLE_MAPS_API_KEY) return null;
        
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();
        
        if (data.status === 'OK' && data.results?.[0]) {
            // Look for 'locality' (City) or 'administrative_area_level_2' (District)
            for (const component of data.results[0].address_components) {
                if (component.types.includes('locality')) {
                    return component.long_name;
                }
            }
        }
        return null;
    } catch (error) {
        console.error("Reverse geocoding failed:", error);
        return null;
    }
  };

  // Main logic to determine location
  const detectBrowserLocation = async () => {
      if (!navigator.geolocation) {
          toast.error("Geolocation is not supported by your browser");
          return;
      }

      setIsLoadingLocation(true);
      
      navigator.geolocation.getCurrentPosition(
          async (position) => {
              const city = await getCityFromCoords(position.coords.latitude, position.coords.longitude);
              if (city) {
                  setUserCity(city);
                  localStorage.setItem('campus_bazaar_city', city);
                  toast.success(`Location detected: ${city}`);
              } else {
                  toast.error("Could not determine city from location.");
              }
              setIsLoadingLocation(false);
          },
          (error) => {
              console.warn("Geolocation denied/error:", error);
              // Don't show error toast on auto-load, only if manually triggered
              setIsLoadingLocation(false);
          }
      );
  };

  useEffect(() => {
    const initLocation = async () => {
      setIsLoadingLocation(true);
      
      // 1. Priority: Saved Address in Database
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: address } = await supabase
          .from('addresses')
          .select('city')
          .eq('user_id', session.user.id)
          .single();

        if (address?.city) {
          setUserCity(address.city);
          setIsLoadingLocation(false);
          return;
        }
      }

      // 2. Priority: Local Storage (Previous session)
      const savedCity = localStorage.getItem('campus_bazaar_city');
      if (savedCity) {
        setUserCity(savedCity);
        setIsLoadingLocation(false);
        return;
      }

      // 3. Priority: Browser Geolocation (Auto-detect)
      // We trigger this automatically if nothing else is found
      await detectBrowserLocation();
    };

    initLocation();
  }, []);

  const updateCity = (city: string | null) => {
    setUserCity(city);
    if (city) {
      localStorage.setItem('campus_bazaar_city', city);
    } else {
      localStorage.removeItem('campus_bazaar_city');
    }
  };

  return (
    <LocationContext.Provider value={{ userCity, setUserCity: updateCity, isLoadingLocation, detectBrowserLocation }}>
      {children}
    </LocationContext.Provider>
  );
};