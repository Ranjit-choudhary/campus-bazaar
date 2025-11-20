// src/contexts/CartContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ProductDetails {
  name: string;
  price: number;
  images: string[];
}

interface CartItem {
  id: string;
  product_id: string | number; // UPDATED TYPE
  quantity: number;
  products: ProductDetails | null;
}

interface CartContextType {
  cart: CartItem[];
  cartItemCount: number;
  addToCart: (productId: string | number, quantity?: number) => Promise<void>; // UPDATED TYPE
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ... existing fetchCartItems logic ... 
  // (omitted for brevity, it mostly handles Supabase logic which might need adjustment if you are fully switching to local, 
  // but for adding items to cart visually, the key is the type change above)

  const addToCart = async (productId: string | number, quantity = 1) => {
    // For the prototype with local data, we can simulate adding to cart or just log it
    // If you are using Supabase for cart, ensure your DB schema for cart_items accepts text for product_id
    toast.success(`Added item ${productId} to cart (Simulation)`);
    
    // Simple local state update for demo purposes if DB fails or types mismatch
    setCart(prev => {
        const existing = prev.find(item => item.product_id === productId);
        if (existing) {
            return prev.map(item => item.product_id === productId ? { ...item, quantity: item.quantity + quantity } : item);
        }
        return [...prev, { 
            id: Math.random().toString(), 
            product_id: productId, 
            quantity, 
            products: { name: 'Demo Item', price: 999, images: ['/placeholder.svg'] } // specific details would need lookup
        }];
    });
  };

  const removeFromCart = async (itemId: string) => {
      setCart(prev => prev.filter(i => i.id !== itemId));
      toast.success('Removed from cart');
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
      setCart(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newQuantity } : i));
  };

  const clearCart = async () => {
      setCart([]);
  };

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, cartItemCount, addToCart, removeFromCart, updateQuantity, clearCart, loading: false }}>
      {children}
    </CartContext.Provider>
  );
};