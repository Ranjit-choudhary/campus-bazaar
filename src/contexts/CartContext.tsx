import { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface ProductDetails {
  name: string;
  price: number;
  images: string[];
  description?: string;
  retailer_id?: string;
  wholesaler_id?: string; // Added to track wholesaler source
}

interface CartItem {
  id: string;
  product_id: string | number;
  quantity: number;
  products: ProductDetails | null;
}

interface CartContextType {
  cart: CartItem[];
  cartItemCount: number;
  addToCart: (productId: string | number, quantity?: number) => Promise<void>;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false);

  const addToCart = async (productId: string | number, quantity = 1) => {
    try {
        // 1. Fetch product details including wholesaler_id
        const { data: product, error } = await supabase
            .from('products')
            .select('*, retailer_id, wholesaler_id') 
            .eq('id', productId)
            .single();

        if (error || !product) {
            console.error("Error fetching product for cart:", error);
            toast.error("Could not load product details.");
            return;
        }

        // 2. Update Cart State
        setCart(prev => {
            const existingIndex = prev.findIndex(item => item.product_id === productId);
            
            if (existingIndex >= 0) {
                const newCart = [...prev];
                newCart[existingIndex].quantity += quantity;
                return newCart;
            } else {
                return [...prev, { 
                    id: crypto.randomUUID(), 
                    product_id: productId, 
                    quantity, 
                    products: { 
                        name: product.name, 
                        price: product.price, 
                        images: product.images || ['/placeholder.svg'],
                        description: product.description,
                        retailer_id: product.retailer_id,
                        wholesaler_id: product.wholesaler_id // Store this for checkout logic
                    }
                }];
            }
        });

        toast.success(`${product.name} added to cart`, {
            description: `You have ${quantity} in your cart.`,
            duration: 3000,
        });

    } catch (error) {
        console.error("Add to cart error:", error);
        toast.error("Failed to add item to cart.");
    }
  };

  const removeFromCart = async (itemId: string) => {
      setCart(prev => prev.filter(i => i.id !== itemId));
      toast.info('Item removed from cart');
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
      setCart(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newQuantity } : i));
  };

  const clearCart = async () => {
      setCart([]);
  };

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, cartItemCount, addToCart, removeFromCart, updateQuantity, clearCart, loading }}>
      {children}
    </CartContext.Provider>
  );
};