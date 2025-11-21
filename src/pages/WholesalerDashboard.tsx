import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, DollarSign, TrendingUp, Truck, ShoppingCart, CheckCircle, Edit, Save, X, Mail, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// 1. Update Interface to match the JOIN result structure
interface RetailerStockInfo {
    stock: number;
    // We use 'retailers' (plural) here because that matches the table name usually, 
    // but we'll alias it in the query if needed.
    retailers: {
        name: string;
        email: string;
        city: string;
    } | null;
}

interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
    wholesaler_stock: number;
    category: string;
    retailersWithStock?: RetailerStockInfo[];
}

interface Wholesaler {
    id: string;
    name: string;
    email: string;
    location: string;
}

interface RestockOrder {
    id: string;
    created_at: string;
    quantity: number;
    status: string;
    retailer?: {
        name: string;
        city: string;
    };
    product?: {
        name: string;
        price: number;
    };
}

const WholesalerDashboard = () => {
    const navigate = useNavigate();
    const [wholesaler, setWholesaler] = useState<Wholesaler | null>(null);
    const [myCatalog, setMyCatalog] = useState<Product[]>([]);
    const [incomingOrders, setIncomingOrders] = useState<RestockOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingStockId, setEditingStockId] = useState<string | null>(null);
    const [newStockValue, setNewStockValue] = useState<number>(0);

    useEffect(() => {
        const fetchWholesalerData = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session?.user) {
                navigate('/login');
                return;
            }

            // 1. Identify Wholesaler
            const { data: wholesalerData, error: wholesalerError } = await supabase
                .from('wholesalers')
                .select('*')
                .eq('email', session.user.email)
                .single();

            if (wholesalerError || !wholesalerData) {
                toast.error("Access Denied. Not a registered wholesaler.");
                navigate('/'); 
                setLoading(false);
                return;
            }
            setWholesaler(wholesalerData);

            // 2. Fetch Catalog & Distributed Stock
            try {
                // A. Get MASTER products (owned by Central Warehouse 'ret-1')
                const { data: masterData } = await supabase
                    .from('products')
                    .select('*')
                    .eq('wholesaler_id', wholesalerData.id)
                    .eq('retailer_id', 'ret-1') 
                    .order('name');

                // B. Get RETAILER copies (owned by actual retailers)
                // IMPORTANT: We use !retailer_id to force the foreign key join
                const { data: distData } = await supabase
                    .from('products')
                    .select(`
                        name,
                        stock,
                        retailers!retailer_id (
                            name,
                            email,
                            city
                        )
                    `)
                    .eq('wholesaler_id', wholesalerData.id)
                    .neq('retailer_id', 'ret-1'); 

                // C. Merge Logic
                const combinedCatalog = (masterData || []).map((masterItem) => {
                    // Find all instances of this product held by retailers
                    const holders = (distData || []).filter((d: any) => 
                        d.name === masterItem.name && d.retailers
                    );
                    
                    return {
                        ...masterItem,
                        retailersWithStock: holders
                    };
                });

                setMyCatalog(combinedCatalog);

            } catch (error) {
                console.error("Catalog fetch error:", error);
                toast.error("Could not load catalog.");
            }

            // 3. Fetch Orders
            const { data: ordersData } = await supabase
                .from('restock_orders')
                .select(`
                    *,
                    retailer:retailer_id (name, city),
                    product:product_id (name, price)
                `)
                .eq('wholesaler_id', wholesalerData.id)
                .order('created_at', { ascending: false });

            setIncomingOrders(ordersData || []);
            setLoading(false);
        };

        fetchWholesalerData();
    }, [navigate]);

    const handleUpdateStatus = async (orderId: string, newStatus: string) => {
        const { error } = await supabase.from('restock_orders').update({ status: newStatus }).eq('id', orderId);
        if (error) toast.error("Update failed");
        else {
            toast.success(`Order updated to ${newStatus}`);
            setIncomingOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        }
    };

    const handleSaveStock = async (productId: string) => {
        if (newStockValue < 0) return toast.error("Invalid stock");
        
        const { error } = await supabase
            .from('products')
            .update({ wholesaler_stock: newStockValue })
            .eq('id', productId);

        if (error) toast.error("Update failed");
        else {
            toast.success("Master stock updated");
            setMyCatalog(prev => prev.map(p => p.id === productId ? { ...p, wholesaler_stock: newStockValue } : p));
            setEditingStockId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid': return <Badge className="bg-green-100 text-green-800">Paid - To Ship</Badge>;
            case 'shipped': return <Badge className="bg-blue-100 text-blue-800">Shipped</Badge>;
            case 'delivered': return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
                    <Truck className="h-8 w-8 text-orange-600" /> {wholesaler?.name} Portal
                </h1>

                <Tabs defaultValue="catalog" className="w-full">
                    <TabsList className="mb-8">
                        <TabsTrigger value="catalog">Master Catalog & Distribution</TabsTrigger>
                        <TabsTrigger value="orders">Incoming Orders</TabsTrigger>
                    </TabsList>

                    <TabsContent value="catalog">
                        <Card>
                            <CardHeader>
                                <CardTitle>Inventory Overview</CardTitle>
                                <CardDescription>View your master stock and tracking where your products are.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead>Master Stock</TableHead>
                                            <TableHead>Retailer Stock Distribution</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {myCatalog.map((product) => (
                                            <TableRow key={product.id}>
                                                <TableCell className="font-medium">{product.name}</TableCell>
                                                <TableCell>₹{product.price}</TableCell>
                                                
                                                {/* Master Stock Cell */}
                                                <TableCell>
                                                    {editingStockId === product.id ? (
                                                        <Input type="number" className="w-20 h-8" value={newStockValue} onChange={(e) => setNewStockValue(parseInt(e.target.value)||0)} />
                                                    ) : (
                                                        <span className={(product.wholesaler_stock || 0) < 20 ? "text-red-500 font-bold" : ""}>
                                                            {product.wholesaler_stock || 0} units
                                                        </span>
                                                    )}
                                                </TableCell>

                                                {/* Retailer Distribution Cell */}
                                                <TableCell>
                                                    {product.retailersWithStock && product.retailersWithStock.length > 0 ? (
                                                        <ScrollArea className="h-24 w-72 rounded border bg-muted/10 p-2">
                                                            <div className="space-y-3">
                                                                {product.retailersWithStock.map((info, i) => (
                                                                    <div key={i} className="text-sm border-b border-dashed pb-2 last:border-0">
                                                                        <div className="flex justify-between items-center font-medium">
                                                                            <span className="text-foreground">{info.retailers?.name || 'Unknown'}</span>
                                                                            <Badge variant="secondary" className="h-5 text-[10px]">{info.stock} in stock</Badge>
                                                                        </div>
                                                                        <div className="flex flex-col gap-0.5 mt-1 text-xs text-muted-foreground">
                                                                            <div className="flex items-center gap-1">
                                                                                <Mail className="h-3 w-3" /> {info.retailers?.email}
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <MapPin className="h-3 w-3" /> {info.retailers?.city}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </ScrollArea>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">No retailer currently holds this stock.</span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    {editingStockId === product.id ? (
                                                        <div className="flex justify-end gap-2">
                                                            <Button size="icon" variant="ghost" onClick={() => setEditingStockId(null)}><X className="h-4 w-4" /></Button>
                                                            <Button size="icon" variant="ghost" className="text-green-600" onClick={() => handleSaveStock(product.id)}><Save className="h-4 w-4" /></Button>
                                                        </div>
                                                    ) : (
                                                        <Button size="icon" variant="ghost" onClick={() => { setEditingStockId(product.id); setNewStockValue(product.wholesaler_stock || 0); }}>
                                                            <Edit className="h-4 w-4 text-blue-500" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="orders">
                        <Card>
                            <CardContent className="pt-6">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Retailer</TableHead><TableHead>Product</TableHead><TableHead>Qty</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {incomingOrders.map(o => (
                                            <TableRow key={o.id}>
                                                <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{o.retailer?.name}</div>
                                                    <div className="text-xs text-muted-foreground">{o.retailer?.city}</div>
                                                </TableCell>
                                                <TableCell>{o.product?.name}</TableCell>
                                                <TableCell>{o.quantity}</TableCell>
                                                <TableCell>{getStatusBadge(o.status)}</TableCell>
                                                <TableCell>
                                                    {o.status === 'paid' && <Button size="sm" onClick={() => handleUpdateStatus(o.id, 'shipped')}>Ship</Button>}
                                                    {o.status === 'shipped' && <Button size="sm" onClick={() => handleUpdateStatus(o.id, 'delivered')}>Deliver</Button>}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default WholesalerDashboard;