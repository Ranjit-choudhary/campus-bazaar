import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
// Added CheckCircle to imports
import { Plus, Package, DollarSign, TrendingUp, Store, Search, Truck, ShoppingCart, Edit, Trash2, Users, Receipt, MessageSquare, User, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

// ... (Rest of the file remains unchanged)

// --- Interfaces ---
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  in_stock: boolean;
  description?: string;
  images?: string[];
  theme_id?: string;
  wholesaler_id?: string;
  wholesaler?: {
      name: string;
      location: string;
      id?: string;
  }
}

interface Retailer {
  id: string;
  name: string;
  email: string;
  city: string;
}

interface RestockOrder {
    id: string;
    created_at: string;
    quantity: number;
    status: string;
    product_id: string;
    product?: {
        name: string;
        price: number;
    };
    wholesaler?: {
        name: string;
    };
}

interface CustomerOrder {
  id: string;
  created_at: string;
  user_id: string;
  quantity: number;
  total_price: number;
  status: string;
  product: {
      name: string;
  };
}

interface FeedbackItem {
    id: string;
    created_at: string;
    type: 'feedback' | 'query';
    content: string;
    rating?: number;
    user_id: string;
}

const RetailerDashboard = () => {
  const navigate = useNavigate();
  
  // State Management
  const [inventory, setInventory] = useState<Product[]>([]);
  const [wholesaleProducts, setWholesaleProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<RestockOrder[]>([]);
  const [customerSales, setCustomerSales] = useState<CustomerOrder[]>([]);
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [orderQuantities, setOrderQuantities] = useState<{[productId: string]: number}>({});

  // Edit Product State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ price: 0, stock: 0 });

  // Feedback View State
  const [viewFeedbackProduct, setViewFeedbackProduct] = useState<Product | null>(null);
  const [productFeedback, setProductFeedback] = useState<FeedbackItem[]>([]);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Customer History View State (NEW)
  const [viewCustomerHistory, setViewCustomerHistory] = useState<string | null>(null); 
  const [customerHistoryOpen, setCustomerHistoryOpen] = useState(false);

  useEffect(() => {
    const fetchRetailerData = async () => {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate('/login');
        return;
      }

      const userEmail = session.user.email;

      // 1. Get Retailer Profile
      const { data: retailerData, error: retailerError } = await supabase
        .from('retailers')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (retailerError || !retailerData) {
        console.error('Retailer lookup failed:', retailerError);
        toast.error("Could not find a retailer account linked to this email.");
        setLoading(false);
        return;
      }

      setRetailer(retailerData);

      // 2. Fetch Current Inventory
      const { data: inventoryData } = await supabase
        .from('products')
        .select('*')
        .eq('retailer_id', retailerData.id) 
        .order('name');
      
      setInventory(inventoryData || []);

      // 3. Fetch Wholesale Catalog
      const { data: marketData } = await supabase
        .from('products')
        .select(`
            *,
            wholesalers:wholesaler_id (
                id,
                name,
                location
            )
        `)
        .order('name');
        
      const mappedMarketData = (marketData || []).map((item: any) => ({
          ...item,
          wholesaler: item.wholesalers
      }));

      setWholesaleProducts(mappedMarketData);

      // 4. Fetch Supply Chain Orders
      const { data: ordersData } = await supabase
        .from('restock_orders')
        .select(`
            *,
            product:product_id (name, price),
            wholesaler:wholesaler_id (name)
        `)
        .eq('retailer_id', retailerData.id)
        .order('created_at', { ascending: false });

      setOrders(ordersData || []);

      // 5. Fetch Customer Sales
      const { data: salesData, error: salesError } = await supabase
        .from('customer_orders')
        .select(`
            *,
            product:product_id (name)
        `)
        .eq('retailer_id', retailerData.id)
        .order('created_at', { ascending: false });
      
      if (!salesError) {
          setCustomerSales(salesData || []);
      }

      setLoading(false);
    };

    fetchRetailerData();
  }, [navigate]);

  // --- Handlers ---

  const handleQuantityChange = (productId: string, val: string) => {
      const num = parseInt(val);
      if (!isNaN(num) && num > 0) {
          setOrderQuantities(prev => ({...prev, [productId]: num}));
      }
  };

  // Navigates to payment page to complete restock order
  const handleRestock = (product: Product) => {
      if (!retailer) return;
      const qty = orderQuantities[product.id] || 10;
      
      if (!product.wholesaler_id || !product.wholesaler) {
          toast.error("This product has no wholesaler linked.");
          return;
      }

      const orderDetails = {
          product: {
              id: product.id,
              name: product.name,
              price: product.price, 
              category: product.category,
              description: product.description,
              images: product.images,
              theme_id: product.theme_id
          },
          wholesaler: {
              id: product.wholesaler_id, 
              name: product.wholesaler.name,
              location: product.wholesaler.location
          },
          retailer: {
              id: retailer.id,
              name: retailer.name,
              email: retailer.email,
              city: retailer.city
          },
          quantity: qty
      };

      setIsAddProductOpen(false);
      navigate('/retailer/payment', { state: orderDetails });
  };

  // Handles receiving a shipment from a wholesaler -> updates inventory
  const handleReceiveOrder = async (order: RestockOrder) => {
      if (!retailer || order.status === 'delivered') return;

      // 1. Update Order Status
      const { error: statusError } = await supabase
          .from('restock_orders')
          .update({ status: 'delivered' })
          .eq('id', order.id);
      
      if (statusError) {
          toast.error("Failed to update order status.");
          return;
      }

      // 2. Increase Retailer Inventory
      const { data: existingProducts } = await supabase
          .from('products')
          .select('*')
          .eq('retailer_id', retailer.id)
          .eq('name', order.product?.name);
      
      const existingProduct = existingProducts?.[0];

      if (existingProduct) {
          const newStock = (existingProduct.stock || 0) + order.quantity;
          await supabase
              .from('products')
              .update({ stock: newStock })
              .eq('id', existingProduct.id);
          
          setInventory(prev => prev.map(p => p.id === existingProduct.id ? { ...p, stock: newStock } : p));
          toast.success(`Stock updated. New total: ${newStock}`);
      } else {
           // If product not found in inventory (unlikely if restock flow creates it, but good safety)
           const { data: sourceProduct } = await supabase
              .from('products')
              .select('*')
              .eq('id', order.product_id)
              .single();

           if (sourceProduct) {
               const newId = `ret-prod-${Date.now()}-${Math.floor(Math.random()*1000)}`;
               const { error: insertError } = await supabase.from('products').insert({
                   id: newId,
                   name: sourceProduct.name,
                   price: sourceProduct.price, 
                   description: sourceProduct.description,
                   category: sourceProduct.category,
                   theme_id: sourceProduct.theme_id,
                   retailer_id: retailer.id,
                   stock: order.quantity,
                   in_stock: true,
                   images: sourceProduct.images,
                   wholesaler_id: sourceProduct.wholesaler_id
               });
               
               if (!insertError) {
                   toast.success("New product added to inventory.");
                   const { data: newInv } = await supabase.from('products').select('*').eq('retailer_id', retailer.id).order('name');
                   if (newInv) setInventory(newInv);
               }
           }
      }
      
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'delivered' } : o));
  };

  const openFeedbackDialog = async (product: Product) => {
      setViewFeedbackProduct(product);
      setIsFeedbackOpen(true);
      setFeedbackLoading(true);

      const { data, error } = await supabase
          .from('product_feedback')
          .select('*')
          .eq('product_id', product.id)
          .order('created_at', { ascending: false });

      if (error) {
          console.error("Error fetching feedback:", error);
          toast.error("Failed to load feedback.");
      } else {
          setProductFeedback(data || []);
      }
      setFeedbackLoading(false);
  };

  const openCustomerHistory = (userId: string) => {
      setViewCustomerHistory(userId);
      setCustomerHistoryOpen(true);
  };

  const openEditDialog = (product: Product) => {
      setEditingProduct(product);
      setEditForm({ price: product.price, stock: product.stock });
      setIsEditOpen(true);
  };

  const handleUpdateProduct = async () => {
      if (!editingProduct) return;
      const { error } = await supabase
          .from('products')
          .update({ 
              price: editForm.price, 
              stock: editForm.stock,
              in_stock: editForm.stock > 0
          })
          .eq('id', editingProduct.id);

      if (error) {
          toast.error("Failed to update product.");
      } else {
          toast.success("Product updated successfully!");
          setInventory(prev => prev.map(p => 
              p.id === editingProduct.id 
                  ? { ...p, price: editForm.price, stock: editForm.stock, in_stock: editForm.stock > 0 } 
                  : p
          ));
          setIsEditOpen(false);
      }
  };

  const handleDeleteProduct = async (productId: string) => {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) {
          toast.error("Failed to delete product.");
      } else {
          toast.success("Product removed from inventory.");
          setInventory(prev => prev.filter(p => p.id !== productId));
      }
  };

  // --- Stats & Filters ---
  const totalProducts = inventory.length;
  const lowStockItems = inventory.filter(p => p.stock < 10).length;
  const totalValue = inventory.reduce((acc, curr) => acc + (curr.price * curr.stock), 0);
  const totalSalesRevenue = customerSales.reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0);

  const filteredWholesale = wholesaleProducts.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.wholesaler?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
      switch (status) {
          case 'paid': return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Paid</Badge>;
          case 'shipped': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Shipped</Badge>;
          case 'delivered': return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Delivered</Badge>;
          case 'payment_pending': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Payment Pending</Badge>;
          default: return <Badge variant="outline">{status}</Badge>;
      }
  };

  const selectedCustomerHistory = customerSales.filter(s => s.user_id === viewCustomerHistory);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Store className="h-8 w-8 text-primary" />
              {retailer?.name} Dashboard
            </h1>
            <p className="text-muted-foreground">{retailer?.city ? `📍 ${retailer.city} Branch` : 'Retailer Portal'}</p>
          </div>
          
          {/* ADD PRODUCT DIALOG (Keep existing code) */}
           <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
            <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Add / Restock Product</Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
                <div className="p-6 border-b">
                    <DialogHeader>
                        <DialogTitle>Wholesale Marketplace</DialogTitle>
                        <DialogDescription>Browse products from approved wholesalers. Enter quantity to order.</DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-4 mt-4">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search catalog..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1" />
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[300px]">Product</TableHead>
                                <TableHead>Wholesaler</TableHead>
                                <TableHead>Wholesale Cost</TableHead>
                                <TableHead>Order Qty</TableHead>
                                <TableHead>Total Cost</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredWholesale.map((product) => {
                                const qty = orderQuantities[product.id] || 0;
                                const wholesalePrice = Math.floor(product.price * 0.7);
                                return (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-xs text-muted-foreground capitalize">{product.category}</div>
                                        </TableCell>
                                        <TableCell>
                                            {product.wholesaler ? (
                                                <div className="flex flex-col text-sm">
                                                    <span className="font-medium text-blue-600">{product.wholesaler.name}</span>
                                                    <span className="text-xs text-muted-foreground">{product.wholesaler.location}</span>
                                                </div>
                                            ) : <span className="italic text-muted-foreground">Direct</span>}
                                        </TableCell>
                                        <TableCell>₹{wholesalePrice}</TableCell>
                                        <TableCell>
                                            <Input type="number" min="1" placeholder="0" className="w-20" value={qty || ''} onChange={(e) => handleQuantityChange(product.id, e.target.value)} />
                                        </TableCell>
                                        <TableCell className="font-bold">{qty > 0 ? `₹${(qty * wholesalePrice).toLocaleString()}` : '-'}</TableCell>
                                        <TableCell>
                                            <Button size="sm" onClick={() => handleRestock({...product, price: wholesalePrice})} disabled={!qty || qty <= 0}>
                                                Proceed to Pay
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* EDIT DIALOG (Keep existing code) */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Product: {editingProduct?.name}</DialogTitle>
                    <DialogDescription>Update stock levels and customer pricing.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">Retail Price (₹)</Label>
                        <Input 
                            id="price" 
                            type="number"
                            value={editForm.price} 
                            onChange={(e) => setEditForm({...editForm, price: Number(e.target.value)})}
                            className="col-span-3" 
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock" className="text-right">Stock Quantity</Label>
                        <Input 
                            id="stock" 
                            type="number"
                            value={editForm.stock} 
                            onChange={(e) => setEditForm({...editForm, stock: Number(e.target.value)})}
                            className="col-span-3" 
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateProduct}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* FEEDBACK DIALOG (NEW) */}
        <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Customer Feedback: {viewFeedbackProduct?.name}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 p-4 border rounded-md mt-2">
                    {feedbackLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : productFeedback.length > 0 ? (
                        <div className="space-y-4">
                            {productFeedback.map((item) => (
                                <div key={item.id} className="p-4 border rounded-lg bg-card">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant={item.type === 'query' ? 'outline' : 'default'}>
                                                {item.type.toUpperCase()}
                                            </Badge>
                                            {item.rating && <span className="text-yellow-500 font-medium text-sm">★ {item.rating}</span>}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-foreground">{item.content}</p>
                                    <div className="mt-2 text-xs text-muted-foreground font-mono">Customer: {item.user_id.substring(0, 8)}...</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground"><MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" /><p>No feedback yet.</p></div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
        
        {/* CUSTOMER HISTORY DIALOG (NEW) */}
        <Dialog open={customerHistoryOpen} onOpenChange={setCustomerHistoryOpen}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Customer Purchase History</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-auto p-2 border rounded-md mt-2">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedCustomerHistory.length > 0 ? (
                                selectedCustomerHistory.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="text-muted-foreground text-xs">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">{order.product?.name || 'Unknown'}</TableCell>
                                        <TableCell>{order.quantity}</TableCell>
                                        <TableCell>₹{order.total_price}</TableCell>
                                        <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No history.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>

        {/* --- TABS --- */}
        <Tabs defaultValue="inventory" className="w-full">
            <TabsList className="mb-8">
                <TabsTrigger value="inventory">My Inventory</TabsTrigger>
                <TabsTrigger value="sales">Customer Sales</TabsTrigger>
                <TabsTrigger value="restock">Marketplace</TabsTrigger>
                <TabsTrigger value="orders">Supply Chain Orders</TabsTrigger>
            </TabsList>

            <TabsContent value="inventory">
                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{totalProducts} Items</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Stock Value (Retail)</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">₹{totalValue.toLocaleString()}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent><div className={`text-2xl font-bold ${lowStockItems > 0 ? 'text-red-500' : 'text-green-500'}`}>{lowStockItems} Alerts</div></CardContent>
                    </Card>
                </div>
                
                {/* Inventory Table */}
                <Card>
                    <CardHeader><CardTitle>Current Inventory</CardTitle><CardDescription>Manage prices, stock, and view customer feedback.</CardDescription></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Retail Price</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inventory.length > 0 ? (
                                    inventory.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell className="capitalize">{product.category}</TableCell>
                                            <TableCell>₹{product.price}</TableCell>
                                            <TableCell>{product.stock}</TableCell>
                                            <TableCell>
                                                {product.stock > 10 ? <Badge className="bg-green-500">In Stock</Badge> : product.stock > 0 ? <Badge className="bg-yellow-500">Low Stock</Badge> : <Badge variant="destructive">Out of Stock</Badge>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="icon" title="View Feedback" onClick={() => openFeedbackDialog(product)}>
                                                        <MessageSquare className="h-4 w-4 text-purple-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" title="Edit Product" onClick={() => openEditDialog(product)}>
                                                        <Edit className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button></AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle><AlertDialogDescription>Cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-500" onClick={() => handleDeleteProduct(product.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No products found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="sales">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">₹{totalSalesRevenue.toLocaleString()}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Orders</CardTitle>
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{customerSales.length}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{new Set(customerSales.map(s => s.user_id)).size}</div></CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader><CardTitle>Customer Purchase History</CardTitle><CardDescription>View what customers are buying from you.</CardDescription></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Customer ID</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customerSales.length > 0 ? (
                                    customerSales.map((sale) => (
                                        <TableRow key={sale.id}>
                                            <TableCell className="text-muted-foreground text-xs">{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-xs font-mono">{sale.user_id.substring(0, 8)}...</TableCell>
                                            <TableCell className="font-medium">{sale.product?.name || 'Unknown'}</TableCell>
                                            <TableCell>{sale.quantity}</TableCell>
                                            <TableCell>₹{sale.total_price}</TableCell>
                                            <TableCell><Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{sale.status}</Badge></TableCell>
                                            <TableCell>
                                                <Button size="sm" variant="ghost" onClick={() => openCustomerHistory(sale.user_id)}>
                                                    <User className="h-4 w-4 mr-2" /> View History
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No sales yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="restock">
                {/* (Reused Wholesale Market Component from previous step) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Wholesale Market</CardTitle>
                        <CardDescription>Search for products and order replenishments from wholesalers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 mb-6">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search for products or wholesalers..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="max-w-md"
                            />
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>Supplied By (Wholesaler)</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>My Current Stock</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredWholesale.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>
                                            {product.wholesaler ? (
                                                <span className="flex items-center gap-2">
                                                    <Truck className="h-3 w-3 text-blue-500" /> 
                                                    {product.wholesaler.name}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground italic">Direct Supplier</span>
                                            )}
                                        </TableCell>
                                        <TableCell>{product.wholesaler?.location || '-'}</TableCell>
                                        <TableCell>
                                            <span className={product.stock < 10 ? "text-red-500 font-bold" : ""}>
                                                {product.stock}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => {
                                                    setOrderQuantities(prev => ({...prev, [product.id]: 10}));
                                                    handleRestock(product);
                                                }}>
                                                    Order Stock
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="orders">
                {/* (Reused Orders Component from previous step) */}
                <Card>
                    <CardHeader><CardTitle>Supply Chain Orders</CardTitle><CardDescription>Track payment status and deliveries.</CardDescription></CardHeader>
                    <CardContent>
                        {orders.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Wholesaler</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead>Total Cost</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="text-muted-foreground text-xs">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell className="font-medium">{order.product?.name || 'Unknown Item'}</TableCell>
                                            <TableCell>{order.wholesaler?.name || '-'}</TableCell>
                                            <TableCell>{order.quantity}</TableCell>
                                            <TableCell>₹{((order.product?.price || 0) * 0.7 * order.quantity).toLocaleString()}</TableCell>
                                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                                            <TableCell>
                                                {order.status === 'shipped' && (
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleReceiveOrder(order)}>
                                                        <CheckCircle className="h-4 w-4 mr-2" /> Receive
                                                    </Button>
                                                )}
                                                {order.status === 'paid' && <span className="text-xs text-muted-foreground">Awaiting Shipment</span>}
                                                {order.status === 'delivered' && <span className="text-xs text-green-600 font-medium">Stock Added</span>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground"><ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-20" /><p>No restock orders placed yet.</p></div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RetailerDashboard;