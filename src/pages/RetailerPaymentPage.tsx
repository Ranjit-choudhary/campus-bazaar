import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CreditCard, CheckCircle, Truck, Store } from 'lucide-react';
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
    
    // Get order details passed from dashboard
    const orderDetails = location.state as OrderDetails;

    useEffect(() => {
        if (!orderDetails) {
            toast.error("Invalid order details. Redirecting...");
            navigate('/retailer/dashboard');
        }
    }, [orderDetails, navigate]);

    if (!orderDetails) return null;

    const { product, wholesaler, retailer, quantity } = orderDetails;
    const subtotal = product.price * quantity;
    const shipping = 500; // Flat shipping rate for demo
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + shipping + tax;

    const handlePayment = async () => {
        setIsProcessing(true);
        
        // Simulate Payment Gateway Delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 1. Create Restock Order Record
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
            toast.error("Payment failed. Please try again.");
            console.error(orderError);
            setIsProcessing(false);
            return;
        }

        // 2. Update Inventory Logic
        // First, check if the retailer already has a version of this product in their own inventory.
        // We check by matching the name (or you could have a 'source_product_id' column for stricter linking).
        const { data: existingProducts } = await supabase
            .from('products')
            .select('*')
            .eq('retailer_id', retailer.id)
            .eq('name', product.name); // Matching by name to see if we already sell this

        const existingProduct = existingProducts && existingProducts.length > 0 ? existingProducts[0] : null;

        if (existingProduct) {
            // UPDATE existing inventory
            const { error: updateError } = await supabase
                .from('products')
                .update({ stock: (existingProduct.stock || 0) + quantity })
                .eq('id', existingProduct.id);

            if (updateError) {
                console.error("Stock update failed:", updateError);
                toast.error("Order placed, but inventory update failed.");
            }
        } else {
            // INSERT new product to retailer's inventory
            // We create a new product ID (letting Supabase gen_random_uuid handle it or creating a unique string)
            // Note: Our ID column is text. Let's generate a simple unique ID.
            const newId = `ret-prod-${Date.now()}-${Math.floor(Math.random()*1000)}`;
            
            // We need to fetch the full product details from the source to copy them properly if they weren't passed fully
            // But for now, we'll use what we have in orderDetails + defaults.
            
            const { error: insertError } = await supabase
                .from('products')
                .insert({
                    id: newId,
                    name: product.name,
                    price: product.price, // Retailer initially sells at same MSRP/Wholesale price until they edit it
                    description: product.description || `Product sourced from ${wholesaler.name}`,
                    category: product.category,
                    theme_id: product.theme_id, // Ideally passed in orderDetails
                    retailer_id: retailer.id,
                    stock: quantity,
                    in_stock: true,
                    images: product.images || ['/placeholder.svg'],
                    wholesaler_id: wholesaler.id 
                });

            if (insertError) {
                console.error("Inventory add failed:", insertError);
                toast.error("Order placed, but failed to add item to inventory.");
            }
        }

        setIsProcessing(false);
        setIsSuccess(true);
        toast.success("Payment successful! Inventory updated.");
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container mx-auto px-4 py-16 flex flex-col items-center text-center">
                    <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">Order Confirmed!</h1>
                    <p className="text-muted-foreground mb-8 max-w-md">
                        Your payment of ₹{total.toLocaleString()} has been processed successfully. 
                        {quantity} units of <strong>{product.name}</strong> have been added to your inventory.
                    </p>
                    <Button onClick={() => navigate('/retailer/dashboard')}>
                        Return to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Cancel Order
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
                    
                    {/* Order Summary */}
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Review & Pay</h1>
                            <p className="text-muted-foreground">Complete your purchase to replenish stock.</p>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Order Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold text-lg">{product.name}</h3>
                                        <p className="text-sm text-muted-foreground capitalize">{product.category}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">₹{product.price} / unit</p>
                                        <p className="text-sm text-muted-foreground">Qty: {quantity}</p>
                                    </div>
                                </div>
                                
                                <Separator />
                                
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2 text-muted-foreground">
                                        <Truck className="h-4 w-4" /> Supplied by
                                    </span>
                                    <span className="font-medium text-foreground">{wholesaler.name}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2 text-muted-foreground">
                                        <Store className="h-4 w-4" /> Ship to
                                    </span>
                                    <span className="font-medium text-foreground">{retailer.name} ({retailer.city})</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Method Mock */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Payment Method</CardTitle>
                                <CardDescription>Select how you want to pay.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-4">
                                    <div className="border-2 border-primary rounded-lg p-4 flex-1 cursor-pointer bg-primary/5">
                                        <CreditCard className="h-6 w-6 mb-2 text-primary" />
                                        <p className="font-medium">Credit Balance</p>
                                        <p className="text-xs text-muted-foreground">Instant Transfer</p>
                                    </div>
                                    <div className="border rounded-lg p-4 flex-1 cursor-not-allowed opacity-50">
                                        <span className="text-xl mb-2 block">🏦</span>
                                        <p className="font-medium">Net Banking</p>
                                        <p className="text-xs text-muted-foreground">Unavailable</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Checkout Panel */}
                    <div>
                        <Card className="sticky top-24 shadow-lg border-primary/20">
                            <CardHeader className="bg-muted/20">
                                <CardTitle>Payment Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal ({quantity} items)</span>
                                    <span>₹{subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Shipping & Handling</span>
                                    <span>₹{shipping.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tax (18% GST)</span>
                                    <span>₹{tax.toLocaleString()}</span>
                                </div>
                                
                                <Separator className="my-2" />
                                
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold">Total Payable</span>
                                    <span className="text-2xl font-bold text-primary">₹{total.toLocaleString()}</span>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button 
                                    size="lg" 
                                    className="w-full text-lg h-12" 
                                    onClick={handlePayment}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? (
                                        <span className="flex items-center gap-2">Processing...</span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            Pay Now <CreditCard className="h-5 w-5" />
                                        </span>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RetailerPaymentPage;