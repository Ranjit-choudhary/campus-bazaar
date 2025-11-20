import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Package, DollarSign, TrendingUp, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  in_stock: boolean;
}

interface Retailer {
  id: string;
  name: string;
  email: string;
  city: string;
}

const RetailerDashboard = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRetailerData = async () => {
      setLoading(true);
      
      // 1. Get Current User Session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate('/login'); // Redirect if not logged in
        return;
      }

      const userEmail = session.user.email;

      // 2. Find the Retailer Profile using the Email
      // This connects the Auth User (UUID) to your Data Retailer ('ret-1')
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

      // 3. Fetch Products for THIS Retailer ID (e.g., 'ret-1')
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('retailer_id', retailerData.id) // Using 'ret-1', not UUID
        .order('name');

      if (productsError) {
        console.error('Error fetching inventory:', productsError);
        toast.error("Failed to load inventory.");
      } else {
        setProducts(productsData || []);
      }

      setLoading(false);
    };

    fetchRetailerData();
  }, [navigate]);

  // Calculate Stats
  const totalProducts = products.length;
  const lowStockItems = products.filter(p => p.stock < 10).length;
  // Calculate total value (mock calculation assuming all stock is worth the price)
  const totalValue = products.reduce((acc, curr) => acc + (curr.price * curr.stock), 0);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Store className="h-8 w-8 text-primary" />
              {retailer?.name || 'Retailer'} Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your inventory and track your store's performance.
              {retailer?.city && <span className="block text-sm mt-1 text-primary">📍 Location: {retailer.city}</span>}
            </p>
          </div>
          <Button onClick={() => toast.info("Add Product feature coming next!")}>
            <Plus className="mr-2 h-4 w-4" /> Add New Product
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-xs text-muted-foreground">Items in your catalog</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Estimated stock value</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${lowStockItems > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {lowStockItems}
              </div>
              <p className="text-xs text-muted-foreground">Items with less than 10 units</p>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle>Current Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            {products.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="capitalize">{product.category}</TableCell>
                      <TableCell>₹{product.price}</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell>
                        {product.stock > 10 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            In Stock
                          </span>
                        ) : product.stock > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Out of Stock
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => toast.info(`Edit ${product.name} clicked`)}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No products found assigned to your account.</p>
                <p className="text-sm text-muted-foreground">
                  (Ensure your login email matches one of the retailer emails in the database: e.g., madeeksuk468@gmail.com)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RetailerDashboard;