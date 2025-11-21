import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CreditCard, CheckCircle, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface OrderDetails {
    product: {
        id: string;
        name: string;
        price: number;
        category: string;
        description?: string;
        images?: string[];
        theme_id?: string;
    };
    wholesaler: {
        id: string;
        name: string;
        location: string;
    };
    retailer: {
        id: string;
        name: string;
        email: string;
        city: string;
    };
    quantity: number;
}

const RetailerPaymentPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    const orderDetails = location.state as OrderDetails;

    useEffect(() => {
        if (!orderDetails) {
            toast.error("Invalid order details.");
            navigate('/retailer/dashboard');
        }
    }, [orderDetails, navigate]);

    if (!orderDetails) return null;

    const { product, wholesaler, retailer, quantity } = orderDetails;
    const subtotal = product.price * quantity;
    const shipping = 500; 
    const tax = subtotal * 0.18;
    const total = subtotal + shipping + tax;

    const handlePayment = async () => {
        setIsProcessing(true);
        
        // 1. Check Wholesaler Stock on SOURCE Product
        const { data: sourceProduct } = await supabase
            .from('products')
            .select('wholesaler_stock') // CHECK WHOLESALER STOCK
            .eq('id', product.id)
            .single();
            
        if (sourceProduct && (sourceProduct.wholesaler_stock || 0) < quantity) {
            toast.error(`Wholesaler only has ${sourceProduct.wholesaler_stock} units available.`);
            setIsProcessing(false);
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

        // 2. Create Restock Order Record
        const { error: orderError } = await supabase
            .from('restock_orders')
            .insert({
                retailer_id: retailer.id,
                wholesaler_id: wholesaler.id,
                product_id: product.id,
                quantity: quantity,
                status: 'paid'
            });

        if (orderError) {
            toast.error("Payment failed.");
            console.error(orderError);
            setIsProcessing(false);
            return;
        }

        // 3. DEDUCT FROM WHOLESALER STOCK (ON MASTER PRODUCT)
        const { error: decreaseError } = await supabase
            .from('products')
            .update({ wholesaler_stock: (sourceProduct?.wholesaler_stock || 0) - quantity })
            .eq('id', product.id);

        if (decreaseError) {
            console.error("Failed to decrease wholesaler stock:", decreaseError);
        }

        setIsProcessing(false);
        setIsSuccess(true);
        toast.success("Order placed successfully!");
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container mx-auto px-4 py-16 flex flex-col items-center text-center">
                    <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">Order Placed!</h1>
                    <p className="text-muted-foreground mb-8 max-w-md">
                        Your payment has been processed. The order has been sent to <strong>{wholesaler.name}</strong>.
                    </p>
                    <Button onClick={() => navigate('/retailer/dashboard')}>Return to Dashboard</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6"><ArrowLeft className="mr-2 h-4 w-4" /> Cancel Order</Button>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
                    <div className="space-y-6">
                        <div><h1 className="text-3xl font-bold mb-2">Review & Pay</h1><p className="text-muted-foreground">Reserving stock from {wholesaler.name}.</p></div>
                        <Card>
                            <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div><h3 className="font-semibold text-lg">{product.name}</h3><p className="text-sm text-muted-foreground capitalize">{product.category}</p></div>
                                    <div className="text-right"><p className="font-medium">₹{product.price} / unit</p><p className="text-sm text-muted-foreground">Qty: {quantity}</p></div>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center text-sm"><span className="flex items-center gap-2 text-muted-foreground"><Truck className="h-4 w-4" /> Supplier</span><span className="font-medium text-foreground">{wholesaler.name}</span></div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle>Payment Method</CardTitle><CardDescription>Select how you want to pay.</CardDescription></CardHeader>
                            <CardContent>
                                <div className="flex gap-4">
                                    <div className="border-2 border-primary rounded-lg p-4 flex-1 cursor-pointer bg-primary/5"><CreditCard className="h-6 w-6 mb-2 text-primary" /><p className="font-medium">Credit Balance</p><p className="text-xs text-muted-foreground">Instant</p></div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div>
                        <Card className="sticky top-24 shadow-lg border-primary/20">
                            <CardHeader className="bg-muted/20"><CardTitle>Payment Summary</CardTitle></CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>₹{shipping.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>₹{tax.toLocaleString()}</span></div>
                                <Separator className="my-2" />
                                <div className="flex justify-between items-center"><span className="text-lg font-bold">Total</span><span className="text-2xl font-bold text-primary">₹{total.toLocaleString()}</span></div>
                            </CardContent>
                            <CardFooter><Button size="lg" className="w-full text-lg h-12" onClick={handlePayment} disabled={isProcessing}>{isProcessing ? 'Processing...' : 'Confirm Order'}</Button></CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RetailerPaymentPage;