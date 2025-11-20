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
import { DollarSign, ShoppingBag, Package, LogOut, Store, Plus, Pencil, Trash2, Warehouse } from 'lucide-react';
import { toast } from 'sonner';

// Interfaces
interface WholesalerMetrics {
  totalOrders: number;
  totalRevenue: number;
  monthlyOrders: number;
  monthlyRevenue: number;
}

interface Product {
    id: string;
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

const defaultMetrics: WholesalerMetrics = {
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

const WholesalerDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<WholesalerMetrics>(defaultMetrics);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Business Settings State
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Product Modal State
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Categories for dropdown (Wholesaler oriented)
  const categories = ['electronics', 'furniture', 'supplies', 'clothing', 'bulk-food', 'textbooks', 'lab-equipment'];
  
  // Themes could be less relevant for wholesalers, but keeping structure compatible
  const themes = [
      { id: 'category-movies', name: 'Movies' },
      { id: 'category-tv-series', name: 'TV Series' },
      { id: 'category-gaming', name: 'Gaming' },
      { id: 'category-anime', name: 'Anime' },
      { id: 'category-motivation', name: 'Motivation' },
      { id: 'category-nature', name: 'Nature' },
  ];

  const fetchDashboardData = async (sellerId: string) => {
    try {
      // Fetch products owned by this wholesaler (using retailer_id column as generic seller_id)
      const { data: myProducts } = await supabase
        .from('products')
        .select('id')
        .eq('retailer_id', sellerId);
        
      const myProductIds = myProducts?.map(p => p.id) || [];

      const { data: allOrders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (allOrders && myProductIds.length > 0) {
          const myOrders = allOrders.filter(order => {
              const details = order.order_details as OrderItem[];
              return details.some(item => myProductIds.includes(item.product_id) || myProductIds.includes(String(item.product_id)));
          });

          setOrders(myOrders);

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

  const fetchWholesalerProducts = async (sellerId: string) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('retailer_id', sellerId) // Reusing the column
            .order('name', { ascending: true });
        
        if (error) throw error;
        setProducts(data || []);
    } catch (e) {
        console.error("Products error:", e);
        toast.error("Failed to load inventory");
    }
  };

  const fetchWholesalerProfile = async (sellerId: string) => {
      try {
          // Assuming wholesalers are stored in the same 'retailers' table or a generic 'sellers' logic
          // If you have a separate 'wholesalers' table, change this. 
          // For now, reusing 'retailers' table structure for simplicity as it links to auth.id
          const { data, error } = await supabase
            .from('retailers')
            .select('address, name')
            .eq('id', sellerId)
            .maybeSingle(); 
          
          if (data) {
              setBusinessAddress(data.address || '');
              setBusinessName(data.name || '');
          }
      } catch (error) {
          console.error("Error fetching profile", error);
      }
  };

  const handleSaveSettings = async () => {
      if (!user) return;
      setIsSavingSettings(true);
      
      // Upsert into 'retailers' table (acting as generic seller profile table)
      const { error } = await supabase
        .from('retailers')
        .upsert({ 
            id: user.id, 
            address: businessAddress,
            name: businessName || user.user_metadata.full_name
        }, { onConflict: 'id' });

      if (error) {
          console.error("Save Settings Error:", error);
          toast.error(`Failed to save: ${error.message}`);
      } else {
          toast.success("Business settings updated!");
      }
      setIsSavingSettings(false);
  };

  // --- Product CRUD ---

  const openAddProduct = () => {
      setCurrentProduct({
          name: '',
          price: 0,
          stock: 100, // Wholesalers likely start with higher stock
          category: 'electronics',
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
      if (!confirm("Are you sure you want to delete this inventory item?")) return;

      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) {
          toast.error("Failed to delete item");
      } else {
          toast.success("Item removed from inventory");
          if (user) fetchWholesalerProducts(user.id);
      }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      setIsSavingProduct(true);

      try {
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
              retailer_id: user.id, // Using this ID to link to the wholesaler
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

          toast.success(`Item ${isEditing ? 'updated' : 'added'} successfully!`);
          setIsProductDialogOpen(false);
          fetchWholesalerProducts(user.id);
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
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
           if (mounted) {
             setLoading(false);
             navigate('/login');
           }
           return;
        }
        
        const currentUser = session.user;

        // Verify role is 'wholesaler'
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', currentUser.id)
          .single();
        
        if (userError || userData?.role !== 'wholesaler') {
            if (mounted) {
                toast.error("Access restricted: Wholesaler account required.");
                navigate('/'); // Redirect unauthorized users
                setLoading(false);
            }
            return;
        }

        if (mounted) {
            setUser(currentUser);
            await Promise.all([
                fetchDashboardData(currentUser.id),
                fetchWholesalerProducts(currentUser.id),
                fetchWholesalerProfile(currentUser.id)
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
        <p className="text-muted-foreground">Loading Wholesaler Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
              <Warehouse className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Wholesaler Portal</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground hidden md:block">
                {businessName || user?.email}
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>View Marketplace</Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Logout</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Metrics */}
        <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Business Overview</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard title="Monthly Revenue" value={`₹${metrics.monthlyRevenue?.toFixed(2) || '0.00'}`} icon={DollarSign} description="This month" />
                <MetricCard title="Total Revenue" value={`₹${metrics.totalRevenue?.toFixed(2) || '0.00'}`} icon={DollarSign} description="Lifetime" />
                <MetricCard title="Total Orders" value={metrics.totalOrders.toString()} icon={ShoppingBag} description={`${metrics.monthlyOrders} this month`} />
                <MetricCard title="Inventory Items" value={products.length.toString()} icon={Package} description="Stock Keeping Units" />
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2">
                <Tabs defaultValue="products" className="w-full">
                    <div className="flex items-center justify-between mb-4">
                        <TabsList>
                            <TabsTrigger value="products">Inventory</TabsTrigger>
                            <TabsTrigger value="orders">Bulk Orders</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="products">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Bulk Inventory</CardTitle>
                                    <CardDescription>Manage wholesale product listings</CardDescription>
                                </div>
                                <Button onClick={openAddProduct}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Item
                                </Button> 
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Item Name</TableHead>
                                                <TableHead>Unit Price</TableHead>
                                                <TableHead>Stock Level</TableHead>
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
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.stock > 100 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
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
                                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No inventory items found.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="orders">
                        <Card>
                            <CardHeader><CardTitle>Order Requests</CardTitle></CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Order Ref</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Total Value</TableHead>
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
                                                        ₹{order.total_amount}
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No orders found.</TableCell></TableRow>
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
                        <CardTitle>Business Settings</CardTitle>
                        <CardDescription>Manage company details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="businessName">Company Name</Label>
                            <Input 
                                id="businessName" 
                                placeholder="Global Wholesale Ltd." 
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="businessAddress">Warehouse Address</Label>
                            <Textarea 
                                id="businessAddress" 
                                placeholder="Warehouse 42, Industrial District" 
                                value={businessAddress}
                                onChange={(e) => setBusinessAddress(e.target.value)}
                            />
                        </div>
                        <Button 
                            className="w-full" 
                            onClick={handleSaveSettings} 
                            disabled={isSavingSettings}
                        >
                            {isSavingSettings ? 'Saving...' : 'Update Business Profile'}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="mt-4 bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-900">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                                <Store className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-purple-900 dark:text-purple-100">Connect with Retailers</h3>
                                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                                    Your products are automatically listed in the marketplace for campus retailers to browse.
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
                  <DialogTitle>{isEditing ? 'Edit Inventory Item' : 'Add New Item'}</DialogTitle>
                  <DialogDescription>
                      Fill in the details for your wholesale listing.
                  </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveProduct} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                          <Label htmlFor="name">Item Name</Label>
                          <Input 
                              id="name" 
                              required 
                              value={currentProduct.name || ''} 
                              onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} 
                          />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="price">Unit Price (₹)</Label>
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
                          <Label htmlFor="stock">Total Stock</Label>
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
                          {isSavingProduct ? 'Saving...' : (isEditing ? 'Update Item' : 'Create Item')}
                      </Button>
                  </DialogFooter>
              </form>
          </DialogContent>
      </Dialog>
    </div>
  );
};

export default WholesalerDashboard;