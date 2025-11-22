import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Plus, Store, Edit, MessageSquare, MapPin, Calendar as CalendarIcon, CheckCircle2, XCircle, Truck, Mail, Send, Trash2 } from 'lucide-react'; 
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCoordinatesFromAddress } from '@/lib/utils'; 
import { Calendar } from "@/components/ui/calendar"; 
import { format, isSameDay } from "date-fns"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Interfaces
interface OfflineOrder { id: string; customer_name: string; product_details: string; due_date: string; amount: number; status: 'pending' | 'completed'; is_paid: boolean; }

interface Product { 
    id: string; 
    name: string; 
    price: number; 
    stock: number; 
    wholesaler_stock?: number; // This comes from the Master Product
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
        email?: string;
    } 
}

interface Retailer { id: string; name: string; email: string; city: string; }
interface RestockOrder { id: string; created_at: string; quantity: number; status: string; product_id: string; product?: { name: string; price: number; }; wholesaler?: { name: string; }; }

interface FeedbackItem { 
    id: string; 
    created_at: string; 
    type: 'feedback' | 'query'; 
    content: string; 
    rating?: number; 
    user_id: string; 
    reply?: string | null; 
}

interface MainOrder {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  order_details: any[]; 
  user_id: string;
  user_email?: string;
}

const RetailerDashboard = () => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<Product[]>([]);
  const [wholesaleProducts, setWholesaleProducts] = useState<Product[]>([]);
  const [restockOrders, setRestockOrders] = useState<RestockOrder[]>([]);
  const [mainOrders, setMainOrders] = useState<MainOrder[]>([]); // All Customer Orders
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [orderQuantities, setOrderQuantities] = useState<{[productId: string]: number}>({});

  // Edit State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ price: 0, stock: 0 });

  // Feedback & Reply State
  const [viewFeedbackProduct, setViewFeedbackProduct] = useState<Product | null>(null);
  const [productFeedback, setProductFeedback] = useState<FeedbackItem[]>([]);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [replyValues, setReplyValues] = useState<{[feedbackId: string]: string}>({}); 

  // Location
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [locationForm, setLocationForm] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [savingLocation, setSavingLocation] = useState(false);

  // Calendar
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [offlineOrders, setOfflineOrders] = useState<OfflineOrder[]>([]);
  const [isAddOfflineOpen, setIsAddOfflineOpen] = useState(false);
  const [newOfflineOrder, setNewOfflineOrder] = useState({ customer_name: '', product_details: '', amount: '', status: 'pending' });

  useEffect(() => {
    const fetchRetailerData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate('/login'); return; }

      // 1. Profile
      const { data: retailerData, error: retailerError } = await supabase.from('retailers').select('*').eq('email', session.user.email).single();
      if (retailerError || !retailerData) { toast.error("Retailer account not found."); setLoading(false); return; }
      setRetailer(retailerData);
      setLocationForm(retailerData.city || ''); 

      // 2. Inventory (Your Local Products)
      const { data: inventoryData } = await supabase
        .from('products')
        .select(`
            *,
            wholesaler:wholesaler_id ( name, location, email )
        `)
        .eq('retailer_id', retailerData.id)
        .order('name');
      
      // 3. Marketplace (Master Catalog - Where Wholesaler Stock lives)
      const { data: marketData } = await supabase.from('products')
        .select(`*, wholesalers:wholesaler_id (id, name, location, email)`)
        .eq('retailer_id', 'ret-1').order('name');
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedMarketData = (marketData || []).map((item: any) => ({ ...item, wholesaler: item.wholesalers }));
      setWholesaleProducts(mappedMarketData);

      // 4. MAP Real Wholesaler Stock to Inventory
      // We find the matching Master Product by Name to get the true wholesaler_stock
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalInventory = (inventoryData || []).map((invItem: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const masterItem = mappedMarketData.find((m: any) => m.name === invItem.name);
          
          return {
              ...invItem,
              // Use Master Item stock if available, otherwise fallback to 0
              wholesaler_stock: masterItem ? masterItem.wholesaler_stock : 0,
              // Ensure wholesaler details are populated
              wholesaler: invItem.wholesaler || (masterItem ? masterItem.wholesaler : null)
          };
      });
      setInventory(finalInventory);

      // 5. Restock Orders
      const { data: rOrders } = await supabase.from('restock_orders').select(`*, product:product_id (name, price), wholesaler:wholesaler_id (name)`).eq('retailer_id', retailerData.id).order('created_at', { ascending: false });
      setRestockOrders(rOrders || []);

      // 6. Customer Orders
      const { data: cOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      const validProductIds = new Set(finalInventory.map(p => p.id));
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const relevantOrders = (cOrders || []).filter((order: any) => {
          if (!order.order_details || !Array.isArray(order.order_details)) return false;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return order.order_details.some((item: any) => validProductIds.has(item.product_id));
      });
      setMainOrders(relevantOrders);
      
      // 7. Offline Orders
      const { data: offlineData } = await supabase.from('offline_orders').select('*').eq('retailer_id', retailerData.id);
      setOfflineOrders(offlineData || []);

      setLoading(false);
    };
    fetchRetailerData();
  }, [navigate]);

  // --- STATUS EMAIL ---
  const triggerStatusUpdateEmail = async (order: MainOrder, newStatus: string) => {
      try {
          const { data: userData } = await supabase.from('users').select('email').eq('id', order.user_id).single();
          if (userData?.email && newStatus === 'delivered') {
              await supabase.auth.resetPasswordForEmail(userData.email, { redirectTo: window.location.origin + '/profile' });
              toast.success(`Delivery Email sent to user.`);
          } 
      } catch (e) { console.error("Email error:", e); }
  };

  // --- HANDLERS ---
  const updateMainOrderStatus = async (orderId: string, newStatus: string) => {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (!error) {
          toast.success(`Order updated to ${newStatus}`);
          setMainOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
          const order = mainOrders.find(o => o.id === orderId);
          if (order) triggerStatusUpdateEmail(order, newStatus);
      } else {
          toast.error("Failed to update status");
      }
  };

  const handleUpdateLocation = async () => { 
      if (!retailer || !locationForm) return; 
      setSavingLocation(true); 
      try { 
          const coords = await getCoordinatesFromAddress(locationForm); 
          const updates = { city: locationForm, latitude: coords?.lat || 17.5449, longitude: coords?.lng || 78.5718 }; 
          await supabase.from('retailers').update(updates).eq('id', retailer.id); 
          toast.success("Location updated."); 
          setRetailer({ ...retailer, city: locationForm }); 
          setIsLocationOpen(false); 
      } catch (e) { toast.error("Failed."); } 
      finally { setSavingLocation(false); } 
  };
  
  const handleQuantityChange = (productId: string, val: string) => { const num = parseInt(val); if (!isNaN(num) && num > 0) setOrderQuantities(prev => ({...prev, [productId]: num})); };
  
  const handleRestock = (product: Product) => { 
      if (!retailer) return; 
      const qty = orderQuantities[product.id] || 10; 
      if (!product.wholesaler_id) { toast.error("No wholesaler linked."); return; }
      const orderDetails = { 
          product: { id: product.id, name: product.name, price: product.price, category: product.category, description: product.description, images: product.images, theme_id: product.theme_id }, 
          wholesaler: { id: product.wholesaler_id, name: product.wholesaler?.name || 'Unknown', location: product.wholesaler?.location || '' }, 
          retailer: { id: retailer.id, name: retailer.name, email: retailer.email, city: retailer.city }, 
          quantity: qty 
      }; 
      setIsAddProductOpen(false); 
      navigate('/retailer/payment', { state: orderDetails }); 
  };

  const handleReceiveRestock = async (order: RestockOrder) => { 
      if (!retailer || order.status === 'delivered') return; 
      await supabase.from('restock_orders').update({ status: 'delivered' }).eq('id', order.id); 
      const { data: existing } = await supabase.from('products').select('*').eq('retailer_id', retailer.id).eq('name', order.product?.name); 
      if (existing?.[0]) { await supabase.from('products').update({ stock: (existing[0].stock||0)+order.quantity }).eq('id', existing[0].id); } 
      setRestockOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'delivered' } : o)); 
      toast.success("Stock updated"); 
  };

  // --- FEEDBACK & REPLY LOGIC ---
  const openFeedbackDialog = async (product: Product) => { 
      setViewFeedbackProduct(product); 
      setIsFeedbackOpen(true); 
      setReplyValues({}); 
      const { data } = await supabase
          .from('product_feedback')
          .select('*')
          .eq('product_id', product.id)
          .order('created_at', { ascending: false });
      setProductFeedback(data || []); 
  };

  const handleReplyChange = (id: string, value: string) => {
      setReplyValues(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmitReply = async (feedbackId: string) => {
      const replyText = replyValues[feedbackId];
      if (!replyText?.trim()) return;

      const { error } = await supabase
          .from('product_feedback')
          .update({ reply: replyText })
          .eq('id', feedbackId);

      if (error) {
          toast.error("Failed to send reply.");
      } else {
          toast.success("Reply sent!");
          setProductFeedback(prev => prev.map(item => 
              item.id === feedbackId ? { ...item, reply: replyText } : item
          ));
          setReplyValues(prev => {
              const newState = { ...prev };
              delete newState[feedbackId];
              return newState;
          });
      }
  };

  // --- OTHER ACTIONS ---
  const openEditDialog = (product: Product) => { setEditingProduct(product); setEditForm({ price: product.price, stock: product.stock }); setIsEditOpen(true); };
  const handleUpdateProduct = async () => { if (!editingProduct) return; await supabase.from('products').update({ price: editForm.price, stock: editForm.stock }).eq('id', editingProduct.id); setInventory(prev => prev.map(p => p.id === editingProduct.id ? { ...p, price: editForm.price, stock: editForm.stock } : p)); setIsEditOpen(false); };
  const handleAddOfflineOrder = async () => { if(!retailer || !selectedDate) return; const { data } = await supabase.from('offline_orders').insert({ retailer_id: retailer.id, customer_name: newOfflineOrder.customer_name, product_details: newOfflineOrder.product_details, amount: parseFloat(newOfflineOrder.amount)||0, status: 'pending', due_date: selectedDate.toISOString() }).select(); if(data) { setOfflineOrders([...offlineOrders, data[0]]); setIsAddOfflineOpen(false); toast.success("Added"); } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toggleOfflineStatus = async (id: string, status: string) => { const newS = status === 'pending' ? 'completed' : 'pending'; await supabase.from('offline_orders').update({ status: newS }).eq('id', id); setOfflineOrders(prev => prev.map(o => o.id === id ? { ...o, status: newS as any } : o)); };
  const handleDeleteOffline = async (id: string) => { await supabase.from('offline_orders').delete().eq('id', id); setOfflineOrders(prev => prev.filter(o => o.id !== id)); };

  const orderedDates = offlineOrders.map(o => new Date(o.due_date));
  const selectedDateOrders = offlineOrders.filter(o => selectedDate && isSameDay(new Date(o.due_date), selectedDate));
  const filteredWholesale = wholesaleProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const getStatusBadge = (status: string) => {
      switch (status) {
          case 'placed': return <Badge variant="outline" className="bg-blue-50 text-blue-700">New</Badge>;
          case 'processing': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Processing</Badge>;
          case 'shipped': return <Badge variant="outline" className="bg-purple-50 text-purple-700">Shipped</Badge>;
          case 'delivered': return <Badge variant="outline" className="bg-green-50 text-green-700">Delivered</Badge>;
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
          <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsLocationOpen(true)}><MapPin className="h-4 w-4 mr-2"/> {retailer?.city || 'Set Location'}</Button>
              <Button onClick={() => setIsAddProductOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add / Restock</Button>
          </div>
        </div>

        {/* DIALOGS */}
        <Dialog open={isLocationOpen} onOpenChange={setIsLocationOpen}><DialogContent><DialogHeader><DialogTitle>Update Location</DialogTitle></DialogHeader><Input value={locationForm} onChange={e=>setLocationForm(e.target.value)}/><DialogFooter><Button onClick={handleUpdateLocation}>Update</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}><DialogContent className="max-w-5xl h-[85vh]"><div className="p-6"><Input placeholder="Search..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/></div><div className="flex-1 overflow-auto p-6"><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Cost</TableHead><TableHead>Stock</TableHead><TableHead>Action</TableHead></TableRow></TableHeader><TableBody>{filteredWholesale.map(p=><TableRow key={p.id}><TableCell>{p.name}</TableCell><TableCell>₹{Math.floor(p.price*0.7)}</TableCell><TableCell>{p.wholesaler_stock}</TableCell><TableCell><Button size="sm" onClick={()=>handleRestock(p)}>Order</Button></TableCell></TableRow>)}</TableBody></Table></div></DialogContent></Dialog>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}><DialogContent><DialogHeader><DialogTitle>Edit</DialogTitle></DialogHeader><Input type="number" value={editForm.price} onChange={e=>setEditForm({...editForm, price:Number(e.target.value)})}/><Input type="number" value={editForm.stock} onChange={e=>setEditForm({...editForm, stock:Number(e.target.value)})}/><DialogFooter><Button onClick={handleUpdateProduct}>Save</Button></DialogFooter></DialogContent></Dialog>
        
        {/* UPDATED FEEDBACK & REPLY DIALOG */}
        <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        Feedback for {viewFeedbackProduct?.name}
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px] pr-4">
                    {productFeedback.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No queries or feedback yet.</div>
                    ) : (
                        productFeedback.map(item => (
                            <div key={item.id} className="mb-4 p-4 border rounded-lg bg-card shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={item.type === 'query' ? 'outline' : 'secondary'} className={item.type === 'query' ? 'border-orange-500 text-orange-600' : ''}>
                                            {item.type.toUpperCase()}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {item.rating && (
                                        <div className="text-yellow-500 text-xs font-bold">★ {item.rating}/5</div>
                                    )}
                                </div>
                                
                                <p className="text-sm mb-4">{item.content}</p>
                                
                                {/* Reply Section */}
                                {item.reply ? (
                                    <div className="bg-muted/50 p-3 rounded-md border-l-4 border-primary text-sm">
                                        <span className="font-semibold text-primary block mb-1">Your Reply:</span> 
                                        {item.reply}
                                    </div>
                                ) : (
                                    <div className="flex gap-2 mt-2 pt-2 border-t border-dashed">
                                        <Input 
                                            placeholder="Type a reply to customer..." 
                                            className="flex-1 h-9 text-sm"
                                            value={replyValues[item.id] || ''} 
                                            onChange={(e) => handleReplyChange(item.id, e.target.value)}
                                        />
                                        <Button size="sm" onClick={() => handleSubmitReply(item.id)}>
                                            <Send className="h-3 w-3 mr-1" /> Reply
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>

        <Tabs defaultValue="inventory">
            <TabsList>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
                <TabsTrigger value="sales">Incoming Orders</TabsTrigger> 
                <TabsTrigger value="planner">Planner</TabsTrigger>
                <TabsTrigger value="orders">Supply Chain</TabsTrigger>
            </TabsList>

            <TabsContent value="inventory">
               <Card><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>My Stock</TableHead><TableHead>Wholesaler & Stock</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{inventory.map(p => {
                   const isLow = p.stock < 10;
                   return (
                    <TableRow key={p.id} className={isLow ? "bg-red-50" : ""}>
                        <TableCell>
                            <div className="font-medium">{p.name}</div>
                            {isLow && <span className="text-[10px] text-red-500 font-bold">Low Stock!</span>}
                        </TableCell>
                        <TableCell>₹{p.price}</TableCell>
                        <TableCell>{p.stock}</TableCell>
                        <TableCell>
                            {p.wholesaler ? (
                                <div className="flex flex-col space-y-1">
                                    <div className="font-medium text-sm">{p.wholesaler.name}</div>
                                    {p.wholesaler.email && (
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Mail className="h-3 w-3" /> {p.wholesaler.email}
                                        </div>
                                    )}
                                    {/* Explicitly display Wholesaler Stock Availability */}
                                    <div className={`text-xs font-bold ${(p.wholesaler_stock || 0) > 0 ? "text-green-600" : "text-red-500"}`}>
                                        Avail: {p.wholesaler_stock ?? '0'}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-muted-foreground text-sm">N/A</span>
                            )}
                        </TableCell>
                        <TableCell className="text-right flex justify-end gap-2 items-center">
                            {/* Restock Button */}
                            {isLow && p.wholesaler_stock !== undefined && (
                                <div className="flex items-center gap-1 mr-2">
                                    <Input className="w-16 h-8" placeholder="Qty" onChange={(e) => handleQuantityChange(p.id, e.target.value)} />
                                    <Button size="sm" onClick={() => handleRestock(p)}>Buy</Button>
                                </div>
                            )}
                            <Button variant="ghost" size="icon" onClick={()=>openEditDialog(p)}><Edit className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon" onClick={()=>openFeedbackDialog(p)} title="View Queries/Feedback">
                                <MessageSquare className="h-4 w-4 text-blue-600"/>
                            </Button>
                        </TableCell>
                    </TableRow>
                   );
               })}</TableBody></Table></CardContent></Card>
            </TabsContent>

            {/* ... other tabs content ... */}
            <TabsContent value="sales">
                <Card>
                    <CardHeader><CardTitle>Incoming Orders</CardTitle><CardDescription>View and manage all orders.</CardDescription></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Order ID</TableHead><TableHead>Items</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Update</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {mainOrders.map(order => (
                                    <TableRow key={order.id}>
                                        <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-mono text-xs">{order.id.substring(0,8)}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                {Array.isArray(order.order_details) && order.order_details.map((item: any, idx: number) => (
                                                    <span key={idx} className="text-sm">{item.name} (x{item.quantity})</span>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>₹{order.total_amount}</TableCell>
                                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                                        <TableCell>
                                            <Select defaultValue={order.status} onValueChange={(val) => updateMainOrderStatus(order.id, val)}>
                                                <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="placed">Placed</SelectItem>
                                                    <SelectItem value="processing">Processing</SelectItem>
                                                    <SelectItem value="shipped">Shipped</SelectItem>
                                                    <SelectItem value="delivered">Delivered</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="planner">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
                    <Card className="md:col-span-1 flex flex-col"><CardHeader><CardTitle>Schedule</CardTitle></CardHeader><CardContent className="flex-1 flex justify-center"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border" modifiers={{ booked: orderedDates }} modifiersStyles={{ booked: { fontWeight: 'bold', textDecoration: 'underline', color: '#2563eb' } }} /></CardContent></Card>
                    <Card className="md:col-span-2 flex flex-col">
                        <CardHeader className="flex flex-row justify-between items-center"><CardTitle className="flex items-center gap-2">{selectedDate ? format(selectedDate, 'MMMM do, yyyy') : 'Select a Date'}</CardTitle><Dialog open={isAddOfflineOpen} onOpenChange={setIsAddOfflineOpen}><DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Order</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add Offline Order</DialogTitle></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label>Customer Name</Label><Input value={newOfflineOrder.customer_name} onChange={e => setNewOfflineOrder({...newOfflineOrder, customer_name: e.target.value})} /></div><div className="space-y-2"><Label>Product / Service Details</Label><Input value={newOfflineOrder.product_details} onChange={e => setNewOfflineOrder({...newOfflineOrder, product_details: e.target.value})} /></div><div className="space-y-2"><Label>Amount (₹)</Label><Input type="number" value={newOfflineOrder.amount} onChange={e => setNewOfflineOrder({...newOfflineOrder, amount: e.target.value})} /></div><div className="space-y-2"><Label>Due Date</Label><div className="p-2 border rounded bg-muted">{selectedDate ? format(selectedDate, 'PP') : 'No date selected'}</div></div></div><DialogFooter><Button onClick={handleAddOfflineOrder}>Save</Button></DialogFooter></DialogContent></Dialog></CardHeader>
                        <CardContent className="flex-1 overflow-y-auto">{selectedDateOrders.length === 0 ? (<div className="text-center py-12 text-muted-foreground">No offline orders.</div>) : (<div className="space-y-3">{selectedDateOrders.map(order => (<div key={order.id} className={`flex items-center justify-between p-4 border rounded-lg ${order.status === 'completed' ? 'bg-muted/50 opacity-70' : 'bg-card'}`}><div><div className="font-semibold flex items-center gap-2">{order.customer_name}{order.status === 'completed' && <Badge variant="secondary" className="text-[10px]">Done</Badge>}</div><div className="text-sm text-muted-foreground">{order.product_details}</div></div><div className="flex items-center gap-4"><div className="font-bold">₹{order.amount}</div><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => toggleOfflineStatus(order.id, order.status)}>{order.status === 'completed' ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}</Button><Button size="icon" variant="ghost" onClick={() => handleDeleteOffline(order.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div></div></div>))}</div>)}</CardContent>
                    </Card>
                </div>
            </TabsContent>
            <TabsContent value="orders"><Card><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader><TableBody>{restockOrders.map(o=>(<TableRow key={o.id}><TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell><TableCell>{o.product?.name}</TableCell><TableCell>{getStatusBadge(o.status)}</TableCell><TableCell>{o.status==='shipped'&&<Button size="sm" className="bg-green-600" onClick={()=>handleReceiveRestock(o)}>Receive</Button>}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RetailerDashboard;