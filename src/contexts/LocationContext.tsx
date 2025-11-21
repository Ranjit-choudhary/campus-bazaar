import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

interface UserLocation {
    lat: number;
    lng: number;
}

interface LocationContextType {
  userCity: string | null;
  setUserCity: (city: string | null) => void;
  userLocation: UserLocation | null; // Added
  isLoadingLocation: boolean;
  error: string | null; // Added
  detectBrowserLocation: () => Promise<void>;
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number; // Added
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
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Haversine Formula to calculate distance in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  const getCityFromCoords = async (lat: number, lng: number): Promise<string | null> => {
    try {
        if (!GOOGLE_MAPS_API_KEY) return null;
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();
        if (data.status === 'OK' && data.results?.[0]) {
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

  const detectBrowserLocation = async () => {
      if (!navigator.geolocation) {
          const msg = "Geolocation is not supported by your browser";
          toast.error(msg);
          setError(msg);
          return;
      }

      setIsLoadingLocation(true);
      setError(null);
      
      navigator.geolocation.getCurrentPosition(
          async (position) => {
              const { latitude, longitude } = position.coords;
              
              // Set Coordinates
              setUserLocation({ lat: latitude, lng: longitude });
              
              // Get City Name
              const city = await getCityFromCoords(latitude, longitude);
              if (city) {
                  setUserCity(city);
                  localStorage.setItem('campus_bazaar_city', city);
                  toast.success(`Location detected: ${city}`);
              }
              setIsLoadingLocation(false);
          },
          (err) => {
              console.warn("Geolocation denied/error:", err);
              setError("Location permission denied. Please enable it to see nearby products.");
              setIsLoadingLocation(false);
          }
      );
  };

  useEffect(() => {
    detectBrowserLocation();
  }, []);

  const updateCity = (city: string | null) => {
    setUserCity(city);
    if (city) localStorage.setItem('campus_bazaar_city', city);
    else localStorage.removeItem('campus_bazaar_city');
  };

  return (
    <LocationContext.Provider value={{ 
        userCity, 
        setUserCity: updateCity, 
        userLocation, 
        isLoadingLocation, 
        error,
        detectBrowserLocation,
        calculateDistance
    }}>
      {children}
    </LocationContext.Provider>
  );
};