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

// Interfaces
interface Product {
  id: number;
  name: string;
  price: number;
  description: string | null;
  category: string | null;
  theme_id?: string | null;
  inStock: boolean;
  images: string[] | null;
  tag?: string | null;
}
interface Profile {
  full_name: string;
  email: string;
}
interface Address {
  hostel: string;
  room_number: string;
}
interface Theme {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  header_image?: string | null;
  tag?: string | null;
}
interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  user_id: string;
  profiles: Profile | null;
  addresses: Address | null;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

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

  // Fetch data on mount
  useEffect(() => {
    const checkUserAndFetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/admin/login');
      } else {
        fetchProducts();
        fetchThemes();
        fetchOrders();
      }
    }
    checkUserAndFetchData();
  }, [navigate]);

  // Data fetchers
  const fetchProducts = async () => setProducts((await supabase.from('products').select()).data || []);
  const fetchThemes = async () => setThemes((await supabase.from('themes').select()).data || []);
  const fetchOrders = async () => setOrders((await supabase.from('orders').select()).data || []);

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

  // Options
  const productCategories = ['posters', 'bedsheets', 'lighting', 'stationery', 'others'];
  const tags = ['hot', 'bestseller'];
  const orderStatuses = ['placed', 'out for delivery', 'delivered', 'cancelled'];

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
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="themes">Themes</TabsTrigger>
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
                          <div>{o.profiles?.full_name}</div>
                          <div className="text-muted-foreground text-sm">{o.profiles?.email}</div>
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
        </Tabs>
      </main>

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingProduct ? 'Edit' : 'Add'} Product</DialogTitle></DialogHeader>
          <form onSubmit={handleProductSubmit} className="space-y-4">
            <Input placeholder="Name" value={productFormData.name} onChange={e => setProductFormData({ ...productFormData, name: e.target.value })} required />
            <Input type="number" placeholder="Price" value={productFormData.price} onChange={e => setProductFormData({ ...productFormData, price: e.target.value })} required />
            <Textarea placeholder="Description" value={productFormData.description} onChange={e => setProductFormData({ ...productFormData, description: e.target.value })} required />
            <Textarea placeholder="Image URLs (comma-separated)" value={productFormData.images} onChange={e => setProductFormData({ ...productFormData, images: e.target.value })} required />
            <Select value={productFormData.category} onValueChange={value => setProductFormData({ ...productFormData, category: value })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{productCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
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
                {tags.map(tag => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="submit">Save</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Theme Dialog */}
      <Dialog open={isThemeDialogOpen} onOpenChange={setIsThemeDialogOpen}>
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
                {tags.map(tag => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
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
