import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Plus, Package, DollarSign, TrendingUp, Store, Search, Truck, ShoppingCart, Edit, Trash2, Users, Receipt, MessageSquare, User, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

// Types defined locally for completeness
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;            // Retailer's local stock
  wholesaler_stock?: number; // Wholesaler's master stock
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
  const [inventory, setInventory] = useState<Product[]>([]);
  const [wholesaleProducts, setWholesaleProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<RestockOrder[]>([]);
  const [customerSales, setCustomerSales] = useState<CustomerOrder[]>([]);
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [orderQuantities, setOrderQuantities] = useState<{[productId: string]: number}>({});

  // Edit State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ price: 0, stock: 0 });

  // Feedback & History State
  const [viewFeedbackProduct, setViewFeedbackProduct] = useState<Product | null>(null);
  const [productFeedback, setProductFeedback] = useState<FeedbackItem[]>([]);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [viewCustomerHistory, setViewCustomerHistory] = useState<string | null>(null); 
  const [customerHistoryOpen, setCustomerHistoryOpen] = useState(false);

  useEffect(() => {
    const fetchRetailerData = async () => {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate('/login'); return; }

      // 1. Get Retailer Profile
      const { data: retailerData, error: retailerError } = await supabase
        .from('retailers')
        .select('*')
        .eq('email', session.user.email)
        .single();

      if (retailerError || !retailerData) {
        toast.error("Retailer account not found.");
        setLoading(false);
        return;
      }
      setRetailer(retailerData);

      // 2. Fetch Retailer Inventory
      // Matches items owned by THIS retailer. Uses 'stock' column.
      const { data: inventoryData } = await supabase
        .from('products')
        .select('*')
        .eq('retailer_id', retailerData.id)
        .order('name');
      setInventory(inventoryData || []);

      // 3. Fetch Wholesale Marketplace
      // Matches items owned by 'ret-1' (Central/Master). Uses 'wholesaler_stock' column.
      const { data: marketData } = await supabase
        .from('products')
        .select(`*, wholesalers:wholesaler_id (id, name, location)`)
        .eq('retailer_id', 'ret-1') // Central Store / Master Catalog
        .order('name');
        
      const mappedMarketData = (marketData || []).map((item: any) => ({
          ...item,
          wholesaler: item.wholesalers
      }));
      setWholesaleProducts(mappedMarketData);

      // 4. Fetch Orders & Sales
      const { data: ordersData } = await supabase.from('restock_orders').select(`*, product:product_id (name, price), wholesaler:wholesaler_id (name)`).eq('retailer_id', retailerData.id).order('created_at', { ascending: false });
      setOrders(ordersData || []);

      const { data: salesData } = await supabase.from('customer_orders').select(`*, product:product_id (name)`).eq('retailer_id', retailerData.id).order('created_at', { ascending: false });
      setCustomerSales(salesData || []);

      setLoading(false);
    };
    fetchRetailerData();
  }, [navigate]);

  const handleQuantityChange = (productId: string, val: string) => {
      const num = parseInt(val);
      if (!isNaN(num) && num > 0) setOrderQuantities(prev => ({...prev, [productId]: num}));
  };

  const handleRestock = (product: Product) => {
      if (!retailer) return;
      const qty = orderQuantities[product.id] || 10;
      
      if (!product.wholesaler_id || !product.wholesaler) {
          toast.error("No wholesaler linked.");
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

  const handleReceiveOrder = async (order: RestockOrder) => {
      if (!retailer || order.status === 'delivered') return;

      const { error: statusError } = await supabase.from('restock_orders').update({ status: 'delivered' }).eq('id', order.id);
      if (statusError) { toast.error("Failed to update status."); return; }

      // Increase Retailer Inventory (Local 'stock')
      // We check if we already have this product from the marketplace in our inventory
      const { data: existingProducts } = await supabase
        .from('products')
        .select('*')
        .eq('retailer_id', retailer.id)
        .eq('name', order.product?.name); // Matching by name is a simple check, ideally use a 'master_product_id' link if available
      
      const existingProduct = existingProducts?.[0];

      if (existingProduct) {
          const newStock = (existingProduct.stock || 0) + order.quantity;
          await supabase.from('products').update({ stock: newStock }).eq('id', existingProduct.id);
          setInventory(prev => prev.map(p => p.id === existingProduct.id ? { ...p, stock: newStock } : p));
          toast.success(`Stock updated. New total: ${newStock}`);
      } else {
           // Create new inventory item for retailer based on the master product
           const { data: sourceProduct } = await supabase.from('products').select('*').eq('id', order.product_id).single();
           if (sourceProduct) {
               const newId = `ret-prod-${Date.now()}-${Math.floor(Math.random()*1000)}`;
               const { error: insertError } = await supabase.from('products').insert({
                   id: newId,
                   name: sourceProduct.name,
                   price: sourceProduct.price, // Retailer can change this later
                   description: sourceProduct.description,
                   category: sourceProduct.category,
                   theme_id: sourceProduct.theme_id,
                   retailer_id: retailer.id,
                   stock: order.quantity, // Initial stock from order
                   in_stock: true,
                   images: sourceProduct.images,
                   wholesaler_id: sourceProduct.wholesaler_id
               });
               if (!insertError) {
                   toast.success("New product added to your inventory.");
                   // Refresh inventory to show new item
                   const { data: newInv } = await supabase.from('products').select('*').eq('retailer_id', retailer.id).order('name');
                   if (newInv) setInventory(newInv);
               }
           }
      }
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'delivered' } : o));
  };

  const openFeedbackDialog = async (product: Product) => {
      setViewFeedbackProduct(product); setIsFeedbackOpen(true); setFeedbackLoading(true);
      const { data } = await supabase.from('product_feedback').select('*').eq('product_id', product.id).order('created_at', { ascending: false });
      setProductFeedback(data || []); setFeedbackLoading(false);
  };

  const openEditDialog = (product: Product) => {
      setEditingProduct(product); setEditForm({ price: product.price, stock: product.stock }); setIsEditOpen(true);
  };

  const handleUpdateProduct = async () => {
      if (!editingProduct) return;
      const { error } = await supabase.from('products').update({ price: editForm.price, stock: editForm.stock, in_stock: editForm.stock > 0 }).eq('id', editingProduct.id);
      if (!error) {
          toast.success("Updated!");
          setInventory(prev => prev.map(p => p.id === editingProduct.id ? { ...p, price: editForm.price, stock: editForm.stock, in_stock: editForm.stock > 0 } : p));
          setIsEditOpen(false);
      }
  };

  const handleDeleteProduct = async (productId: string) => {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (!error) { toast.success("Deleted."); setInventory(prev => prev.filter(p => p.id !== productId)); }
  };

  const totalProducts = inventory.length;
  const lowStockItems = inventory.filter(p => p.stock < 10).length;
  const totalValue = inventory.reduce((acc, curr) => acc + (curr.price * curr.stock), 0);
  
  const filteredWholesale = wholesaleProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const selectedCustomerHistory = customerSales.filter(s => s.user_id === viewCustomerHistory);

  const getStatusBadge = (status: string) => {
      switch (status) {
          case 'paid': return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
          case 'shipped': return <Badge className="bg-blue-100 text-blue-800">Shipped</Badge>;
          case 'delivered': return <Badge className="bg-gray-100 text-gray-800">Delivered</Badge>;
          default: return <Badge variant="outline">{status}</Badge>;
      }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2"><Store className="h-8 w-8 text-primary" /> {retailer?.name} Dashboard</h1>
          
          <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add / Restock</Button></DialogTrigger>
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
                <div className="p-6 border-b">
                    <DialogHeader><DialogTitle>Wholesale Marketplace</DialogTitle><DialogDescription>Order stock from wholesalers.</DialogDescription></DialogHeader>
                    <div className="flex items-center gap-4 mt-4"><Search className="h-4 w-4 text-muted-foreground" /><Input placeholder="Search catalog..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1" /></div>
                </div>
                <div className="flex-1 overflow-auto p-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Wholesaler</TableHead>
                                <TableHead>Wholesale Cost</TableHead>
                                <TableHead>Available Stock</TableHead>
                                <TableHead>Order Qty</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredWholesale.map((product) => {
                                const qty = orderQuantities[product.id] || 0;
                                const wholesalePrice = Math.floor(product.price * 0.7);
                                return (
                                    <TableRow key={product.id}>
                                        <TableCell><div>{product.name}</div><div className="text-xs text-muted-foreground">{product.category}</div></TableCell>
                                        <TableCell>{product.wholesaler?.name}</TableCell>
                                        <TableCell>₹{wholesalePrice}</TableCell>
                                        {/* Display Wholesaler Stock */}
                                        <TableCell>
                                            <span className={(product.wholesaler_stock || 0) < 20 ? "text-orange-600 font-bold" : "text-green-600"}>
                                                {product.wholesaler_stock || 0}
                                            </span>
                                        </TableCell>
                                        <TableCell><Input type="number" min="1" placeholder="0" className="w-20" value={qty || ''} onChange={(e) => handleQuantityChange(product.id, e.target.value)} /></TableCell>
                                        <TableCell><Button size="sm" onClick={() => handleRestock({...product, price: wholesalePrice})} disabled={!qty || qty <= 0}>Order</Button></TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Price</Label><Input type="number" value={editForm.price} onChange={(e) => setEditForm({...editForm, price: Number(e.target.value)})} className="col-span-3" /></div>
                    <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Stock</Label><Input type="number" value={editForm.stock} onChange={(e) => setEditForm({...editForm, stock: Number(e.target.value)})} className="col-span-3" /></div>
                </div>
                <DialogFooter><Button onClick={handleUpdateProduct}>Save</Button></DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Feedback Dialog */}
        <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader><DialogTitle>Feedback</DialogTitle></DialogHeader>
                <ScrollArea className="flex-1 p-4 border rounded-md mt-2">
                    {feedbackLoading ? "Loading..." : productFeedback.length > 0 ? productFeedback.map(i => <div key={i.id} className="p-4 border rounded mb-2"><p>{i.content}</p></div>) : "No feedback."}
                </ScrollArea>
            </DialogContent>
        </Dialog>

        {/* Customer History Dialog */}
        <Dialog open={customerHistoryOpen} onOpenChange={setCustomerHistoryOpen}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader><DialogTitle>History</DialogTitle></DialogHeader>
                <div className="flex-1 overflow-auto p-2 border rounded mt-2">
                    <Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Qty</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                        <TableBody>{selectedCustomerHistory.map(o => <TableRow key={o.id}><TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell><TableCell>{o.product?.name}</TableCell><TableCell>{o.quantity}</TableCell><TableCell>₹{o.total_price}</TableCell></TableRow>)}</TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>

        <Tabs defaultValue="inventory">
            <TabsList>
                <TabsTrigger value="inventory">My Inventory</TabsTrigger>
                <TabsTrigger value="sales">Customer Sales</TabsTrigger>
                <TabsTrigger value="orders">Supply Chain</TabsTrigger>
            </TabsList>

            <TabsContent value="inventory">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Stock Items</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totalProducts}</div></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Value</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">₹{totalValue.toLocaleString()}</div></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Low Stock</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{lowStockItems}</div></CardContent></Card>
                </div>
                <Card><CardHeader><CardTitle>Inventory</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>Stock</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>{inventory.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.name}</TableCell><TableCell>₹{p.price}</TableCell>
                                    <TableCell>{p.stock}</TableCell>
                                    <TableCell className="text-right flex justify-end gap-2">
                                        <Button variant="outline" size="icon" onClick={() => openFeedbackDialog(p)}><MessageSquare className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(p)}><Edit className="h-4 w-4" /></Button>
                                        <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogFooter><AlertDialogAction onClick={() => handleDeleteProduct(p.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}</TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="sales">
                <Card><CardHeader><CardTitle>Sales History</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Product</TableHead><TableHead>Qty</TableHead><TableHead>Total</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                            <TableBody>{customerSales.map(s => (
                                <TableRow key={s.id}>
                                    <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>{s.user_id.substring(0, 8)}...</TableCell>
                                    <TableCell>{s.product?.name}</TableCell><TableCell>{s.quantity}</TableCell><TableCell>₹{s.total_price}</TableCell>
                                    <TableCell><Button size="sm" variant="ghost" onClick={() => { setViewCustomerHistory(s.user_id); setCustomerHistoryOpen(true); }}><User className="h-4 w-4 mr-2" /> History</Button></TableCell>
                                </TableRow>
                            ))}</TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="orders">
                <Card><CardHeader><CardTitle>Restock Orders</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Wholesaler</TableHead><TableHead>Qty</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                            <TableBody>{orders.map(o => (
                                <TableRow key={o.id}>
                                    <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>{o.product?.name}</TableCell><TableCell>{o.wholesaler?.name}</TableCell><TableCell>{o.quantity}</TableCell>
                                    <TableCell>{getStatusBadge(o.status)}</TableCell>
                                    <TableCell>{o.status === 'shipped' && <Button size="sm" className="bg-green-600" onClick={() => handleReceiveOrder(o)}>Receive</Button>}</TableCell>
                                </TableRow>
                            ))}</TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RetailerDashboard;