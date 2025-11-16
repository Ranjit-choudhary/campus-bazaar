// src/pages/AdminDashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
// --- NEW ---
// Import all our types from the central types file
import { Product, Theme, Order, User, UserData, Address } from '@/types'; 
// --- END NEW ---


// --- REMOVED ALL LOCAL INTERFACES (Product, Profile, Address, Theme, Order, User) ---


const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true); 
  const [products, setProducts] = useState<Product[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]); 
  const [currentUser, setCurrentUser] = useState<any>(null); 

  // Dialog states
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productFormData, setProductFormData] = useState({
    name: '', price: '', description: '', category: '', theme_id: '', images: '', tag: ''
  });

  const [isThemeDialogOpen, setIsThemeDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [themeFormData, setThemeFormData] = useState({
    name: '', description: '', image: '', header_image: '', tag: ''
  });

  // Define available roles
  const userRoles = ['user', 'admin', 'wholesaler', 'retailer']; // 'user' is your "customer"

  // Fetch all data on mount
  useEffect(() => {
    const checkUserAndFetchAllData = async () => {
      setLoading(true); 
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/admin/login');
          return; 
        }
        setCurrentUser(user);
        
        // Fetch all data in parallel
        // Fetch all data in parallel
        const [productsRes, themesRes, ordersRes, usersRes] = await Promise.all([
          supabase.from('products').select(),
          supabase.from('themes').select(),
          supabase.from('orders').select('*, users!inner(*), addresses(*)'), // Correctly join users
          supabase.from('users').select('id, email, role') // <-- THIS IS THE FIX
        ]);

        // Handle products
        if (productsRes.error) toast.error(`Products Error: ${productsRes.error.message}`);
        setProducts(productsRes.data || []);

        // Handle themes
        if (themesRes.error) toast.error(`Themes Error: ${themesRes.error.message}`);
        setThemes(themesRes.data || []);

        // Handle orders
        if (ordersRes.error) toast.error(`Orders Error: ${ordersRes.error.message}`);
        setOrders(ordersRes.data || []);

        // Handle users
        if (usersRes.error) {
          toast.error(`Users Error: ${usersRes.error.message}`);
        } else {
          setUsers((usersRes.data as User[]) || []);
        }

      } catch (e: any) {
        toast.error(`An unexpected error occurred: ${e.message}`);
      } finally {
        setLoading(false); 
      }
    }
    checkUserAndFetchAllData();
  }, [navigate]);

  // Data fetchers for single refresh
  const fetchProducts = async () => setProducts((await supabase.from('products').select()).data || []);
  const fetchThemes = async () => setThemes((await supabase.from('themes').select()).data || []);
  const fetchOrders = async () => setOrders((await supabase.from('orders').select('*, users!inner(*), addresses(*)')).data || []);
  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('id, email, role'); // <-- THIS IS THE FIX
    if (error) toast.error(`Failed to refresh users: ${error.message}`);
    else setUsers(data as User[]);
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  // Reset dialogs
  const closeProductDialog = () => {
    setEditingProduct(null);
    setProductFormData({ name: '', price: '', description: '', category: '', theme_id: '', images: '', tag: '' });
    setIsProductDialogOpen(false);
  };
  const closeThemeDialog = () => {
    setEditingTheme(null);
    setThemeFormData({ name: '', description: '', image: '', header_image: '', tag: '' });
    setIsThemeDialogOpen(false);
  };

  // Product handlers
  const handleAddProduct = () => {
    setEditingProduct(null);
    setProductFormData({ name: '', price: '', description: '', category: '', theme_id: '', images: '', tag: '' });
    setIsProductDialogOpen(true);
  };
  // This function will now work as 'product' will have the correct type
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductFormData({
      name: product.name || '',
      price: String(product.price || 0),
      description: product.description || '',
      category: product.category || '',
      theme_id: product.theme_id || '',
      images: Array.isArray(product.images) ? product.images.join(', ') : '',
      tag: product.tag || ''
    });
    setIsProductDialogOpen(true);
  };
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const imageArray = productFormData.images.split(',').map(url => url.trim()).filter(Boolean);
    const productData = { ...productFormData, price: parseFloat(productFormData.price), images: imageArray, theme_id: productFormData.theme_id || null, tag: productFormData.tag || null };

    const { error } = editingProduct
      ? await supabase.from('products').update(productData).eq('id', editingProduct.id)
      : await supabase.from('products').insert({ ...productData, inStock: true });

    if (error) toast.error(error.message);
    else {
      toast.success(`Product ${editingProduct ? 'updated' : 'added'} successfully`);
      fetchProducts();
      closeProductDialog();
    }
  };
  const handleDeleteProduct = async (id: number) => {
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
    toast.success('Product deleted');
  };

  // Theme handlers
  // This function will now work as 'theme' will have the correct type
  const handleAddTheme = () => {
    setEditingTheme(null);
    setThemeFormData({ name: '', description: '', image: '', header_image: '', tag: '' });
    setIsThemeDialogOpen(true);
  };
  const handleEditTheme = (theme: Theme) => {
    setEditingTheme(theme);
    setThemeFormData({
      name: theme.name || '',
      description: theme.description || '',
      image: theme.image || '',
      header_image: theme.header_image || '',
      tag: theme.tag || ''
    });
    setIsThemeDialogOpen(true);
  };
  const handleThemeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const themeData = { ...themeFormData, tag: themeFormData.tag || null, header_image: themeFormData.header_image || null };

    const { error } = editingTheme
      ? await supabase.from('themes').update(themeData).eq('id', editingTheme.id)
      : await supabase.from('themes').insert(themeData);

    if (error) toast.error(error.message);
    else {
      toast.success(`Theme ${editingTheme ? 'updated' : 'added'} successfully`);
      fetchThemes();
      closeThemeDialog();
    }
  };
  const handleDeleteTheme = async (id: string) => {
    await supabase.from('themes').delete().eq('id', id);
    fetchThemes();
    toast.success('Theme deleted');
  };

  // Orders
  const handleOrderStatusChange = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) toast.error(`Failed to update status: ${error.message}`);
    else {
      toast.success('Order status updated successfully');
      fetchOrders();
    }
  };

  // User Role Handler
  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === currentUser.id && newRole !== 'admin') {
      toast.error("You cannot remove your own admin role.");
      fetchUsers(); // Revert UI
      return;
    }

    const { error } = await supabase
      .from('users') // This is public.users
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      toast.error(`Failed to update role: ${error.message}`);
      fetchUsers(); // Revert UI
    } else {
      toast.success('User role updated!');
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    }
  };

  // Options
  const productCategories = ['posters', 'bedsheets', 'lighting', 'stationery', 'others'];
  const tags = ['hot', 'bestseller'];
  const orderStatuses = ['placed', 'out for delivery', 'delivered', 'cancelled'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading Admin Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
          <div>
            <Button variant="outline" onClick={() => navigate('/')}>View Store</Button>
            <Button variant="ghost" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Logout</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="products">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="themes">Themes</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Product Management</CardTitle>
                <Button onClick={handleAddProduct}><Plus className="mr-2 h-4 w-4" />Add Product</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>Actions</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>₹{p.price}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleEditProduct(p)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(p.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader><CardTitle>Order Management</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Delivery Location</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map(o => (
                      <TableRow key={o.id}>
                        <TableCell>{o.id.substring(0, 8)}</TableCell>
                        <TableCell>
                          {/* This now correctly uses 'users' which is imported */}
                          <div>{o.users?.full_name}</div>
                          <div className="text-muted-foreground text-sm">{o.users?.email}</div>
                        </TableCell>
                        <TableCell>{o.addresses?.hostel}, Room {o.addresses?.room_number}</TableCell>
                        <TableCell>₹{o.total_amount}</TableCell>
                        <TableCell>
                          <Select value={o.status} onValueChange={(newStatus) => handleOrderStatusChange(o.id, newStatus)}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Update status" />
                            </SelectTrigger>
                            <SelectContent>
                              {orderStatuses.map(status => (
                                <SelectItem key={status} value={status}>
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </SelectItem>
                              ))}
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

          {/* Themes Tab */}
          <TabsContent value="themes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Theme Management</CardTitle>
                <Button onClick={handleAddTheme}><Plus className="mr-2 h-4 w-4" />Add Theme</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Name</TableHead><TableHead>Actions</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {themes.map(t => (
                      <TableRow key={t.id}>
                        <TableCell>{t.name}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleEditTheme(t)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteTheme(t.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Role Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="font-mono text-xs">{user.id}</TableCell>
                        <TableCell>
                          <Select 
                            value={user.role || 'user'} 
                            onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                            disabled={user.id === currentUser?.id} // Disable changing your own role
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {userRoles.map(role => (
                                <SelectItem key={role} value={role}>
                                  {role.charAt(0).toUpperCase() + role.slice(1)}
                                </SelectItem>
                              ))}
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

        </Tabs>
      </main>

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={closeProductDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingProduct ? 'Edit' : 'Add'} Product</DialogTitle></DialogHeader>
          <form onSubmit={handleProductSubmit} className="space-y-4">
            <Input placeholder="Name" value={productFormData.name} onChange={e => setProductFormData({ ...productFormData, name: e.target.value })} required />
            <Input type="number" placeholder="Price" value={productFormData.price} onChange={e => setProductFormData({ ...productFormData, price: e.target.value })} required />
            <Textarea placeholder="Description" value={productFormData.description} onChange={e => setProductFormData({ ...productFormData, description: e.target.value })} required />
            <Textarea placeholder="Image URLs (comma-separated)" value={productFormData.images} onChange={e => setProductFormData({ ...productFormData, images: e.target.value })} required />
            <Select value={productFormData.category} onValueChange={value => setProductFormData({ ...productFormData, category: value })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{productCategories.map(cat => <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={productFormData.theme_id} onValueChange={value => setProductFormData({ ...productFormData, theme_id: value })}>
              <SelectTrigger><SelectValue placeholder="Select theme" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Theme</SelectItem>
                {themes.map(theme => <SelectItem key={theme.id} value={theme.id}>{theme.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={productFormData.tag} onValueChange={value => setProductFormData({ ...productFormData, tag: value })}>
              <SelectTrigger><SelectValue placeholder="Select tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {tags.map(tag => <SelectItem key={tag} value={tag}>{tag.charAt(0).toUpperCase() + tag.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="submit">Save</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Theme Dialog */}
      <Dialog open={isThemeDialogOpen} onOpenChange={closeThemeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTheme ? 'Edit' : 'Add'} Theme</DialogTitle></DialogHeader>
          <form onSubmit={handleThemeSubmit} className="space-y-4">
            <Input placeholder="Name" value={themeFormData.name} onChange={e => setThemeFormData({ ...themeFormData, name: e.target.value })} required />
            <Textarea placeholder="Description" value={themeFormData.description} onChange={e => setThemeFormData({ ...themeFormData, description: e.target.value })} required />
            <Input placeholder="Image URL" value={themeFormData.image} onChange={e => setThemeFormData({ ...themeFormData, image: e.target.value })} required />
            <Input placeholder="Header Image URL" value={themeFormData.header_image} onChange={e => setThemeFormData({ ...themeFormData, header_image: e.target.value })} />
            <Select value={themeFormData.tag} onValueChange={value => setThemeFormData({ ...themeFormData, tag: value })}>
              <SelectTrigger><SelectValue placeholder="Select tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {tags.map(tag => <SelectItem key={tag} value={tag}>{tag.charAt(0).toUpperCase() + tag.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="submit">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;