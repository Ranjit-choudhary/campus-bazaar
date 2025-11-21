import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Clock, Package, MapPin, ArrowRight } from 'lucide-react';

const OrderPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        navigate('/');
        return;
      }
      // Fetch order AND address if needed
      const { data, error } = await supabase
        .from('orders')
        .select('*') // You can join addresses here if your schema allows: select('*, addresses(*)')
        .eq('id', orderId)
        .single();

      if (error || !data) {
        console.error('Error fetching order:', error);
        // Don't redirect immediately, user might see 404 logic
      } else {
        setOrder(data);
      }
      setLoading(false);
    };
    fetchOrder();
  }, [orderId, navigate]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading Order Details...</div>;
  }

  if (!order) {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-2xl font-bold text-red-500">Order not found</h1>
                <Button onClick={() => navigate('/')} className="mt-4">Go Home</Button>
            </div>
        </div>
    );
  }

  // Determine status display
  const isPaid = order.payment_status === 'paid';
  const isCod = order.payment_method === 'cod';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto border-t-4 border-t-green-500 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-3xl text-green-700">Order Confirmed!</CardTitle>
            <p className="text-muted-foreground">
                Thank you for your purchase. Your order has been received.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-6">
            {/* Status Badge */}
            <div className="flex justify-center gap-2">
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80">
                    Order #{order.id.slice(0, 8).toUpperCase()}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${isPaid ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                    {isPaid ? 'Payment Received' : (isCod ? 'Cash on Delivery' : 'Payment Pending')}
                </span>
            </div>

            <Separator />

            {/* Order Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2"><Package className="h-4 w-4"/> Items</h3>
                    <div className="space-y-2">
                        {order.order_details && Array.isArray(order.order_details) ? (
                            order.order_details.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-sm">
                                    <span>{item.name} <span className="text-muted-foreground">x{item.quantity}</span></span>
                                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">Order details unavailable</p>
                        )}
                    </div>
                    <div className="mt-3 pt-2 border-t flex justify-between font-bold">
                        <span>Total</span>
                        <span>₹{order.total_amount.toFixed(2)}</span>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2"><MapPin className="h-4 w-4"/> Delivery Info</h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                        <p>Method: <span className="capitalize text-foreground">{order.order_type}</span></p>
                        <p>Payment: <span className="uppercase text-foreground">{order.payment_method}</span></p>
                        <p className="mt-2 text-xs">You will receive an email confirmation shortly.</p>
                    </div>
                </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center bg-muted/20 py-6">
            <Button variant="outline" onClick={() => navigate('/profile')}>View Order History</Button>
            <Button onClick={() => navigate('/shop-all')}>Continue Shopping <ArrowRight className="ml-2 h-4 w-4"/></Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default OrderPage;