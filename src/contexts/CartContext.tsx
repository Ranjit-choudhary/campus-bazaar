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
  product_id: number;
  quantity: number;
  products: ProductDetails | null;
}

interface CartContextType {
  cart: CartItem[];
  cartItemCount: number;
  addToCart: (productId: number, quantity?: number) => Promise<void>;
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

  const fetchCartItems = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCart([]);
      setLoading(false);
      return;
    }

    const { data: cartData, error: rpcError } = await supabase.rpc('get_or_create_user_cart');
    if (rpcError) {
        console.error("Error getting or creating cart:", rpcError);
        setLoading(false);
        return;
    }

    if (cartData) {
      const { data: items, error } = await supabase
        .from('cart_items')
        .select(`id, product_id, quantity, products (name, price, images)`)
        .eq('cart_id', cartData);
      
      if (error) {
        toast.error('Failed to fetch cart items.');
        console.error("Error fetching cart items:", error);
        setCart([]);
      } else {
        const validItems = (items || []).filter(item => item.products);
        const typedItems: CartItem[] = validItems.map(item => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          products: Array.isArray(item.products) ? item.products[0] : item.products,
        }));
        setCart(typedItems);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCartItems();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchCartItems();
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const addToCart = async (productId: number, quantity = 1) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to add items to the cart.');
      return;
    }

    const { data: cartData, error: rpcError } = await supabase.rpc('get_or_create_user_cart');
     if (rpcError) {
        toast.error('Could not access your cart.');
        console.error("Error from get_or_create_user_cart RPC:", rpcError);
        return;
    }

    if (cartData) {
      const existingItem = cart.find(item => item.product_id === productId);
      if (existingItem) {
        await updateQuantity(existingItem.id, existingItem.quantity + quantity);
      } else {
        const { error } = await supabase.from('cart_items').insert({
          cart_id: cartData,
          product_id: productId,
          quantity,
        });
        if (error) {
          console.error('Error adding item to cart:', error);
          toast.error('Failed to add item to cart.');
        } else {
          toast.success('Item added to cart!');
          fetchCartItems();
        }
      }
    }
  };

  const removeFromCart = async (itemId: string) => {
    setCart(currentCart => currentCart.filter(item => item.id !== itemId));
    const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
    if (error) {
      toast.error('Failed to remove item from cart.');
      fetchCartItems();
    } else {
      toast.success('Item removed from cart.');
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      await removeFromCart(itemId);
      return;
    }
    setCart(currentCart =>
      currentCart.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
    const { error } = await supabase.from('cart_items').update({ quantity: newQuantity }).eq('id', itemId);
    if (error) {
      toast.error('Failed to update item quantity.');
      fetchCartItems();
    }
  };

  const clearCart = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
  
    const { data: cartData } = await supabase.rpc('get_or_create_user_cart');
    if (cartData) {
      await supabase.from('cart_items').delete().eq('cart_id', cartData);
      setCart([]);
    }
  };

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, cartItemCount, addToCart, removeFromCart, updateQuantity, clearCart, loading }}>
      {children}
    </CartContext.Provider>
  );
};