import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { DollarSign, ShoppingBag, Package, LogOut, Store, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Interfaces
interface RetailerMetrics {
  totalOrders: number;
  totalRevenue: number;
  monthlyOrders: number;
  monthlyRevenue: number;
}

interface Product {
    id: string; // Changed to string to support UUIDs
    name: string;
    price: number;
    stock: number;
    category: string;
    description?: string;
    images?: string[];
    theme_id?: string;
}

interface OrderItem {
    product_id: number | string;
    name: string;
    quantity: number;
    price: number;
}

interface Order {
    id: string;
    created_at: string;
    total_amount: number;
    status: string;
    order_details: OrderItem[];
    user_id: string;
}

const defaultMetrics: RetailerMetrics = {
  totalOrders: 0,
  totalRevenue: 0.00,
  monthlyOrders: 0,
  monthlyRevenue: 0.00,
};

const MetricCard = ({ title, value, icon: Icon, description }: { title: string, value: string, icon: React.ElementType, description: string }) => (
    <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

const RetailerDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<RetailerMetrics>(defaultMetrics);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true); // Start loading true
  const [user, setUser] = useState<any>(null);
  
  // Store Settings State
  const [storeAddress, setStoreAddress] = useState('');
  const [storeName, setStoreName] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Product Modal State
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Categories for dropdown
  const categories = ['posters', 'mugs', 'decor', 'lighting', 'tech', 'toys', 'kitchen', 'stationery', 'clothing', 'accessories'];
  const themes = [
      { id: 'category-movies', name: 'Movies' },
      { id: 'category-tv-series', name: 'TV Series' },
      { id: 'category-gaming', name: 'Gaming' },
      { id: 'category-anime', name: 'Anime' },
      { id: 'category-motivation', name: 'Motivation' },
      { id: 'category-nature', name: 'Nature' },
  ];

  const fetchDashboardData = async (retailerId: string) => {
    try {
      // Fetch retailer products to identify relevant orders
      const { data: myProducts } = await supabase
        .from('products')
        .select('id')
        .eq('retailer_id', retailerId);
        
      const myProductIds = myProducts?.map(p => p.id) || [];

      // Fetch all orders (filtering client side for simplicity)
      const { data: allOrders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (allOrders && myProductIds.length > 0) {
          const myOrders = allOrders.filter(order => {
              // Check if order_details contains any of my products
              const details = order.order_details as OrderItem[];
              return details.some(item => myProductIds.includes(item.product_id) || myProductIds.includes(String(item.product_id)));
          });

          setOrders(myOrders);

          // Calculate Metrics
          const totalRev = myOrders.reduce((acc, order) => {
               const details = order.order_details as OrderItem[];
               const myItemsTotal = details
                .filter(item => myProductIds.includes(item.product_id) || myProductIds.includes(String(item.product_id)))
                .reduce((sum, item) => sum + (item.price * item.quantity), 0);
               return acc + myItemsTotal;
          }, 0);

          setMetrics({
              totalOrders: myOrders.length,
              totalRevenue: totalRev,
              monthlyOrders: myOrders.filter(o => new Date(o.created_at).getMonth() === new Date().getMonth()).length,
              monthlyRevenue: totalRev
          });
      } else {
          setOrders([]);
          setMetrics(defaultMetrics);
      }

    } catch (e) {
      console.error("Metrics error:", e);
    }
  };

  const fetchRetailerProducts = async (retailerId: string) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('retailer_id', retailerId)
            .order('name', { ascending: true });
        
        if (error) throw error;
        setProducts(data || []);
    } catch (e) {
        console.error("Products error:", e);
        toast.error("Failed to load products");
    }
  };

  const fetchRetailerProfile = async (retailerId: string) => {
      try {
          const { data } = await supabase
            .from('retailers')
            .select('address, name')
            .eq('id', retailerId)
            .single();
          
          if (data) {
              setStoreAddress(data.address || '');
              setStoreName(data.name || '');
          }
      } catch (error) {
          // Silent error if profile doesn't exist yet
          console.log("Profile not found or error:", error);
      }
  };

  const handleSaveSettings = async () => {
      if (!user) return;
      setIsSavingSettings(true);
      
      // Explicitly creating the retailer record if it doesn't exist
      const { error } = await supabase
        .from('retailers')
        .upsert({ 
            id: user.id, 
            address: storeAddress,
            name: storeName || user.user_metadata.full_name
        }, { onConflict: 'id' });

      if (error) {
          console.error("Save Settings Error:", error);
          toast.error(`Failed to save: ${error.message}`);
      } else {
          toast.success("Store settings updated!");
      }
      setIsSavingSettings(false);
  };

  // --- Product CRUD ---

  const openAddProduct = () => {
      setCurrentProduct({
          name: '',
          price: 0,
          stock: 10,
          category: 'posters',
          description: '',
          images: [],
          theme_id: ''
      });
      setIsEditing(false);
      setIsProductDialogOpen(true);
  };

  const openEditProduct = (product: Product) => {
      setCurrentProduct({ ...product });
      setIsEditing(true);
      setIsProductDialogOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
      if (!confirm("Are you sure you want to delete this product?")) return;

      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) {
          toast.error("Failed to delete product");
      } else {
          toast.success("Product deleted");
          if (user) fetchRetailerProducts(user.id);
      }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      setIsSavingProduct(true);

      try {
          // Ensure images is an array
          let imageArray = currentProduct.images;
          if (typeof currentProduct.images === 'string') {
              // @ts-ignore
              imageArray = currentProduct.images.split(',').map(s => s.trim()).filter(s => s);
          } else if (!imageArray || imageArray.length === 0) {
              imageArray = ['/placeholder.svg'];
          }

          const productData = {
              ...currentProduct,
              images: imageArray,
              retailer_id: user.id,
              price: Number(currentProduct.price),
              stock: Number(currentProduct.stock),
              theme_id: currentProduct.theme_id || null,
          };
          
          if (!isEditing) {
             delete (productData as any).id; 
          }

          let error;
          if (isEditing && currentProduct.id) {
              const { error: updateError } = await supabase
                  .from('products')
                  .update(productData)
                  .eq('id', currentProduct.id);
              error = updateError;
          } else {
              const { error: insertError } = await supabase
                  .from('products')
                  .insert(productData);
              error = insertError;
          }

          if (error) throw error;

          toast.success(`Product ${isEditing ? 'updated' : 'created'} successfully!`);
          setIsProductDialogOpen(false);
          fetchRetailerProducts(user.id);
          fetchDashboardData(user.id);
          
      } catch (error: any) {
          console.error("Save error:", error);
          toast.error(`Error: ${error.message}`);
      } finally {
          setIsSavingProduct(false);
      }
  };

  // --------------------

  useEffect(() => {
    let mounted = true;

    const checkUserAndFetchData = async () => {
      try {
        // 1. Direct session check (Best for page reloads)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
           if (mounted) {
             toast.error('Please log in to access the dashboard.');
             navigate('/login');
             setLoading(false);
           }
           return;
        }
        
        const currentUser = session.user;

        // 2. Verify role
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', currentUser.id)
          .single();
        
        if (userError || userData?.role !== 'retailer') {
            console.error("Role verification failed:", userError);
            if (mounted) {
                toast.error("Access restricted: Retailer account required.");
                navigate('/');
                setLoading(false);
            }
            return;
        }

        if (mounted) {
            setUser(currentUser);
            // 3. Fetch Data only after confirming user & role
            await Promise.all([
                fetchDashboardData(currentUser.id),
                fetchRetailerProducts(currentUser.id),
                fetchRetailerProfile(currentUser.id)
            ]);
            setLoading(false);
        }
      } catch (err) {
          console.error("Unexpected error during auth check:", err);
          if (mounted) setLoading(false);
      }
    };

    checkUserAndFetchData();

    return () => { mounted = false; };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Retailer Portal</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground hidden md:block">
                {storeName || user?.email}
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>View Store</Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Logout</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Metrics */}
        <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Overview</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard title="Monthly Revenue" value={`₹${metrics.monthlyRevenue?.toFixed(2) || '0.00'}`} icon={DollarSign} description="This month" />
                <MetricCard title="Total Revenue" value={`₹${metrics.totalRevenue?.toFixed(2) || '0.00'}`} icon={DollarSign} description="Lifetime" />
                <MetricCard title="Orders" value={metrics.totalOrders.toString()} icon={ShoppingBag} description={`${metrics.monthlyOrders} this month`} />
                <MetricCard title="Active Products" value={products.length.toString()} icon={Package} description="In your catalog" />
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2">
                <Tabs defaultValue="products" className="w-full">
                    <div className="flex items-center justify-between mb-4">
                        <TabsList>
                            <TabsTrigger value="products">My Products</TabsTrigger>
                            <TabsTrigger value="orders">Recent Orders</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="products">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Inventory</CardTitle>
                                    <CardDescription>Manage your product listings</CardDescription>
                                </div>
                                <Button onClick={openAddProduct}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Product
                                </Button> 
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Price</TableHead>
                                                <TableHead>Stock</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {products.length > 0 ? products.map(p => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex flex-col">
                                                            <span>{p.name}</span>
                                                            <span className="text-xs text-muted-foreground capitalize">{p.category}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>₹{p.price}</TableCell>
                                                    <TableCell>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                            {p.stock} units
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="ghost" size="icon" onClick={() => openEditProduct(p)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteProduct(p.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No products listed yet.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="orders">
                        <Card>
                            <CardHeader><CardTitle>Order History</CardTitle></CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Order ID</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {orders.length > 0 ? orders.map(order => (
                                                <TableRow key={order.id}>
                                                    <TableCell className="font-mono">{order.id.substring(0, 8)}</TableCell>
                                                    <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                                                    <TableCell>
                                                        <span className="capitalize px-2 py-1 bg-secondary rounded text-xs">
                                                            {order.status}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {/* Note: This total might show full order total, complex to show split total in simplified view */}
                                                        ₹{order.total_amount}
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No orders found containing your products.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Sidebar / Settings */}
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Store Settings</CardTitle>
                        <CardDescription>Manage your visible store details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="storeName">Store Name</Label>
                            <Input 
                                id="storeName" 
                                placeholder="My Awesome Store" 
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Pickup Address</Label>
                            <Textarea 
                                id="address" 
                                placeholder="e.g. Shop 12, Student Center" 
                                value={storeAddress}
                                onChange={(e) => setStoreAddress(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Shown to customers choosing "Pickup".
                            </p>
                        </div>
                        <Button 
                            className="w-full" 
                            onClick={handleSaveSettings} 
                            disabled={isSavingSettings}
                        >
                            {isSavingSettings ? 'Saving...' : 'Update Settings'}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="mt-4 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Need bulk stock?</h3>
                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                    Check the wholesaler marketplace to restock popular items.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </main>

      {/* Add/Edit Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                  <DialogTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                  <DialogDescription>
                      Fill in the details for your product listing.
                  </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveProduct} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                          <Label htmlFor="name">Product Name</Label>
                          <Input 
                              id="name" 
                              required 
                              value={currentProduct.name || ''} 
                              onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} 
                          />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="price">Price (₹)</Label>
                          <Input 
                              id="price" 
                              type="number" 
                              min="0" 
                              required 
                              value={currentProduct.price || ''} 
                              onChange={e => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value)})} 
                          />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="stock">Stock Quantity</Label>
                          <Input 
                              id="stock" 
                              type="number" 
                              min="0" 
                              required 
                              value={currentProduct.stock || ''} 
                              onChange={e => setCurrentProduct({...currentProduct, stock: parseInt(e.target.value)})} 
                          />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Select 
                            value={currentProduct.category} 
                            onValueChange={(val) => setCurrentProduct({...currentProduct, category: val})}
                          >
                              <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                  {categories.map(c => (
                                      <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="theme">Theme (Optional)</Label>
                          <Select 
                            value={currentProduct.theme_id || "none"} 
                            onValueChange={(val) => setCurrentProduct({...currentProduct, theme_id: val === "none" ? "" : val})}
                          >
                              <SelectTrigger>
                                  <SelectValue placeholder="Select theme" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="none">No Theme</SelectItem>
                                  {themes.map(t => (
                                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-2 col-span-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea 
                              id="description" 
                              value={currentProduct.description || ''} 
                              onChange={e => setCurrentProduct({...currentProduct, description: e.target.value})} 
                          />
                      </div>
                      <div className="space-y-2 col-span-2">
                          <Label htmlFor="image">Image URL</Label>
                          <div className="flex gap-2">
                            <Input 
                                id="image" 
                                placeholder="https://example.com/image.jpg"
                                value={currentProduct.images?.[0] || ''} 
                                onChange={e => setCurrentProduct({...currentProduct, images: [e.target.value]})} 
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Enter a direct link to an image (or leave blank for placeholder)</p>
                      </div>
                  </div>
                  <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsProductDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={isSavingProduct}>
                          {isSavingProduct ? 'Saving...' : (isEditing ? 'Update Product' : 'Create Product')}
                      </Button>
                  </DialogFooter>
              </form>
          </DialogContent>
      </Dialog>
    </div>
  );
};

export default RetailerDashboard;