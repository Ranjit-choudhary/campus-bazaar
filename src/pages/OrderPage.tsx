import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error || !data) {
        console.error('Error fetching order:', error);
        navigate('/');
      } else {
        setOrder(data);
      }
      setLoading(false);
    };
    fetchOrder();
  }, [orderId, navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Complete Your Order</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                {/* Placeholder for QR code */}
                <img src="/placeholder.svg" alt="QR Code for payment" className="w-64 h-64 mx-auto bg-gray-200 rounded-lg" />
              </div>
              <div className="text-left space-y-4">
                <p className="font-semibold text-lg">
                  Please pay ₹{order.total_amount.toFixed(2)} on this QR code.
                </p>
                <p className="text-muted-foreground">
                  Once we verify your purchase, your order will be placed. In case something is wrong, contact us at:
                </p>
                <div>
                  <p><strong>Email:</strong> ranjit.choudhary0123@gmail.com</p>
                  <p><strong>Phone:</strong> 8793081978</p>
                </div>
              </div>
            </div>
            <Button className="mt-8" onClick={() => navigate('/profile')}>
              Go to My Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderPage;