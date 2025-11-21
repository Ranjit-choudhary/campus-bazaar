// src/types.ts

export interface Retailer {
    id: string;
    name: string;
    email: string;
    city: string;
    latitude?: number;  // Added
    longitude?: number; // Added
}
export interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  category: string | null;
  theme_id?: string | null;
  inStock: boolean;
  images: string[] | null;
  tag?: string | null;
  wholesaler_stock?: number | null; 
  
  retailer?: Retailer;
  stock?: number;
  retailer_id?: string | null;
  wholesaler_id?: string | null;
  
  // For joins
  wholesalers?: {
    id: string;
    name: string;
    location: string;
  };
}


export interface Theme {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  header_image?: string | null;
  tag?: string | null;
}

// This 'UserData' interface is for your public user data
export interface UserData {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

// This 'Address' interface is also from AdminDashboard
export interface Address {
  hostel: string;
  room_number: string;
}

// This 'Order' interface is also from AdminDashboard
// It now correctly references UserData
export interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  user_id: string;
  users: UserData | null; // Corrected from 'profiles'
  addresses: Address | null;
}

// This 'User' interface is for the admin user list
export interface User {
  id: string;
  email: string;
  role: string;
}