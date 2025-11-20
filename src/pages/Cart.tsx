import { useCart } from '../contexts/CartContext';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, loading } = useCart();
  const navigate = useNavigate();

  // --- Price Calculation Fix ---
  const subtotal = cart.reduce((total, item) => {
    if (item.products) {
      // Ensure we are treating these as numbers
      const price = Number(item.products.price) || 0;
      const quantity = Number(item.quantity) || 0;
      return total + (price * quantity);
    }
    return total;
  }, 0);
  
  const shipping = subtotal > 0 ? 50 : 0; // Only charge shipping if cart is not empty
  const total = subtotal + shipping;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex justify-center">
           <p>Loading Cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">Your Cart</h1>
        
        {cart.length === 0 ? (
          <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed">
            <div className="bg-background p-4 rounded-full w-fit mx-auto mb-6 border">
                <ShoppingCart className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-8">
              Looks like you haven't added anything to your cart yet.
            </p>
            <Button size="lg" onClick={() => navigate('/shop-all')}>
                Start Shopping <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items List */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map(item => (
                item.products && (
                  <Card key={item.id} className="overflow-hidden">
                    <CardContent className="flex items-start sm:items-center p-4 gap-4">
                      {/* Image */}
                      <div className="flex-shrink-0 border rounded-md overflow-hidden">
                        <img 
                          src={item.products.images?.[0] || '/placeholder.svg'} 
                          alt={item.products.name}
                          className="w-24 h-24 object-cover"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-grow min-w-0">
                        <h3 className="font-semibold text-foreground text-lg truncate">{item.products.name}</h3>
                        <p className="text-primary font-bold mt-1">₹{item.products.price}</p>
                      </div>

                      {/* Controls */}
                      <div className="flex flex-col items-end gap-3">
                          <div className="flex items-center gap-2 border rounded-md bg-background">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8" onClick={() => removeFromCart(item.id)}>
                            <Trash2 className="h-4 w-4 mr-1" /> Remove
                          </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              ))}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Order Summary</h2>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <p className="text-muted-foreground">Subtotal</p>
                        <p className="font-medium">₹{subtotal.toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between text-sm">
                        <p className="text-muted-foreground">Shipping Estimate</p>
                        <p className="font-medium">₹{shipping.toFixed(2)}</p>
                    </div>
                  </div>

                  <Separator />
                  
                  <div className="flex justify-between items-end">
                    <p className="font-bold text-lg">Total</p>
                    <div className="text-right">
                        <p className="font-bold text-2xl text-primary">₹{total.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Inclusive of all taxes</p>
                    </div>
                  </div>
                  
                  <Button className="w-full py-6 text-lg shadow-md" onClick={() => navigate('/checkout')}>
                    Proceed to Checkout
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground mt-4">Secure Checkout</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;