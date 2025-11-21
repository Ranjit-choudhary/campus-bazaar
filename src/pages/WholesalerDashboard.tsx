import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, DollarSign, TrendingUp, Store, Truck, ShoppingCart, CheckCircle, XCircle, Edit, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input'; // Import Input

interface Wholesaler {
    id: string;
    name: string;
    email: string;
    location: string;
}

interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
    category: string;
}

interface RestockOrder {
    id: string;
    created_at: string;
    quantity: number;
    status: string;
    total_amount?: number;
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
    
    // Stock Edit State
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

            const userEmail = session.user.email;

            // 1. Identify Wholesaler
            const { data: wholesalerData, error: wholesalerError } = await supabase
                .from('wholesalers')
                .select('*')
                .eq('email', userEmail)
                .single();

            if (wholesalerError || !wholesalerData) {
                console.error("Wholesaler lookup failed", wholesalerError);
                toast.error("Access Denied. You are not a registered wholesaler.");
                navigate('/'); 
                setLoading(false);
                return;
            }

            setWholesaler(wholesalerData);

            // 2. Fetch My Catalog
            // We filter products that are linked to this wholesaler AND presumably are the "master" stock
            // For this prototype, we assume any product with this wholesaler_id is part of their catalog to manage.
            const { data: catalogData } = await supabase
                .from('products')
                .select('*')
                .eq('wholesaler_id', wholesalerData.id)
                // We might want to filter out retailer-specific copies if they exist in the same table
                // but for now, let's assume the wholesaler manages the 'source' products.
                .order('name');
            
            setMyCatalog(catalogData || []);

            // 3. Fetch Incoming Orders
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
        const { error } = await supabase
            .from('restock_orders')
            .update({ status: newStatus })
            .eq('id', orderId);

        if (error) {
            toast.error("Failed to update status");
        } else {
            toast.success(`Order marked as ${newStatus}`);
            setIncomingOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        }
    };

    // Update Stock Function
    const handleSaveStock = async (productId: string) => {
        if (newStockValue < 0) {
            toast.error("Stock cannot be negative");
            return;
        }

        const { error } = await supabase
            .from('products')
            .update({ stock: newStockValue })
            .eq('id', productId);

        if (error) {
            toast.error("Failed to update stock");
            console.error(error);
        } else {
            toast.success("Stock updated successfully");
            setMyCatalog(prev => prev.map(p => p.id === productId ? { ...p, stock: newStockValue } : p));
            setEditingStockId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid': return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Paid - To Ship</Badge>;
            case 'shipped': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Shipped</Badge>;
            case 'delivered': return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">Completed</Badge>;
            case 'pending': return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const totalProducts = myCatalog.length;
    const activeOrders = incomingOrders.filter(o => o.status !== 'delivered').length;
    const totalRevenue = incomingOrders
        .filter(o => o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered')
        .reduce((acc, o) => acc + ((o.product?.price || 0) * 0.7 * o.quantity), 0);

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Portal...</div>;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                            <Truck className="h-8 w-8 text-orange-600" />
                            {wholesaler?.name} Portal
                        </h1>
                        <p className="text-muted-foreground">
                            {wholesaler?.location} Distribution Center
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Catalog Size</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalProducts} SKUs</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{activeOrders}</div>
                            <p className="text-xs text-muted-foreground">Pending fulfillment</p>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="catalog" className="w-full">
                    <TabsList className="mb-8">
                        <TabsTrigger value="catalog">My Catalog & Inventory</TabsTrigger>
                        <TabsTrigger value="orders">Retailer Orders</TabsTrigger>
                    </TabsList>

                    <TabsContent value="catalog">
                        <Card>
                            <CardHeader>
                                <CardTitle>Product Catalog</CardTitle>
                                <CardDescription>Manage your stock levels. Retailers buy from this inventory.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product Name</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>MSRP</TableHead>
                                            <TableHead>Current Stock</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {myCatalog.map((product) => (
                                            <TableRow key={product.id}>
                                                <TableCell className="font-medium">{product.name}</TableCell>
                                                <TableCell className="capitalize">{product.category}</TableCell>
                                                <TableCell>₹{product.price}</TableCell>
                                                <TableCell>
                                                    {editingStockId === product.id ? (
                                                        <Input 
                                                            type="number" 
                                                            className="w-24 h-8" 
                                                            value={newStockValue} 
                                                            onChange={(e) => setNewStockValue(parseInt(e.target.value) || 0)}
                                                        />
                                                    ) : (
                                                        <span className={product.stock < 20 ? "text-red-500 font-bold" : ""}>
                                                            {product.stock} units
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {editingStockId === product.id ? (
                                                        <div className="flex justify-end gap-2">
                                                            <Button size="icon" variant="ghost" onClick={() => setEditingStockId(null)}><X className="h-4 w-4" /></Button>
                                                            <Button size="icon" variant="ghost" className="text-green-600" onClick={() => handleSaveStock(product.id)}><Save className="h-4 w-4" /></Button>
                                                        </div>
                                                    ) : (
                                                        <Button size="icon" variant="ghost" onClick={() => {
                                                            setEditingStockId(product.id);
                                                            setNewStockValue(product.stock);
                                                        }}>
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
                            <CardHeader>
                                <CardTitle>Incoming Orders</CardTitle>
                                <CardDescription>Manage stock requests from retailers.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {incomingOrders.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Retailer</TableHead>
                                                <TableHead>Items</TableHead>
                                                <TableHead>Total Value</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {incomingOrders.map((order) => (
                                                <TableRow key={order.id}>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {new Date(order.created_at).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{order.retailer?.name || 'Unknown'}</div>
                                                        <div className="text-xs text-muted-foreground">{order.retailer?.city}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {order.quantity}x {order.product?.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        ₹{((order.product?.price || 0) * 0.7 * order.quantity).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {order.status === 'paid' && (
                                                                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(order.id, 'shipped')}>
                                                                    <Truck className="h-3 w-3 mr-1" /> Ship
                                                                </Button>
                                                            )}
                                                            {order.status === 'shipped' && (
                                                                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(order.id, 'delivered')}>
                                                                    <CheckCircle className="h-3 w-3 mr-1" /> Deliver
                                                                </Button>
                                                            )}
                                                            {order.status === 'delivered' && (
                                                                <span className="text-xs text-green-600 font-medium flex items-center justify-end gap-1">
                                                                    <CheckCircle className="h-3 w-3" /> Done
                                                                </span>
                                                            )}
                                                            {/* If we had payment pending status */}
                                                            {order.status === 'pending' && (
                                                                 <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'paid')}>
                                                                    Mark Paid
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        <p>No active orders.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default WholesalerDashboard;