import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationContextType {
  userLocation: Coordinates | null;
  userCity: string | null; // Added userCity
  setUserCity: (city: string) => void; // Added setUserCity function
  error: string | null;
  isLoading: boolean;
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
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null); // Added state
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsLoading(false);
      },
      (err) => {
        setError(`Unable to retrieve your location: ${err.message}`);
        // Fallback to a default location (e.g., Hyderabad) for demo purposes
        setUserLocation({ latitude: 17.3850, longitude: 78.4867 }); 
        setIsLoading(false);
      }
    );
  }, []);

  return (
    // Added userCity and setUserCity to the value object
    <LocationContext.Provider value={{ userLocation, userCity, setUserCity, error, isLoading }}>
      {children}
    </LocationContext.Provider>
  );
};