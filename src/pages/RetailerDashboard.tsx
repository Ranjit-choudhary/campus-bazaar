import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, ShoppingBag, Truck, Package, Clock, LogOut, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

// Interfaces for data structure
interface RetailerMetrics {
  totalOrders: number;
  totalRevenue: number;
  monthlyOrders: number;
  monthlyRevenue: number;
}

interface RetailerProduct {
    id: number;
    name: string;
    price: number;
    inStock: boolean;
    category: string;
}

const defaultMetrics: RetailerMetrics = {
  totalOrders: 0,
  totalRevenue: 0.00,
  monthlyOrders: 0,
  monthlyRevenue: 0.00,
};

// Metric Card Component
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
  const [products, setProducts] = useState<RetailerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null); // To store the authenticated user

  // Function to simulate fetching dashboard data from Supabase RPC (SQL function)
  const fetchDashboardData = async (retailerId: string) => {
    try {
      // NOTE: Using the RPC function we defined in SQL setup
      const { data, error } = await supabase.rpc('get_retailer_dashboard_data', { p_retailer_id: retailerId });

      if (error) {
        console.error("Error fetching metrics:", error);
        toast.error("Failed to fetch dashboard metrics.");
        setMetrics(defaultMetrics);
        return;
      }

      setMetrics(data as RetailerMetrics);
    } catch (e) {
      console.error("Error processing metrics data:", e);
      setMetrics(defaultMetrics);
    }
  };

  // Function to fetch the retailer's products
  const fetchRetailerProducts = async (retailerId: string) => {
    try {
        // Assuming products table has 'retailer_id' column
        const { data, error } = await supabase
            .from('products')
            .select('id, name, price, inStock, category')
            .eq('retailer_id', retailerId);
        
        if (error) {
            console.error("Error fetching retailer products:", error);
            setProducts([]);
            return;
        }
        setProducts(data || []);
    } catch (e) {
        console.error("Error loading products:", e);
        setProducts([]);
    }
  };

  useEffect(() => {
    const checkUserAndFetchData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error('You must be logged in to view the retailer dashboard.');
        navigate('/login');
        return;
      }
      
      // In a real app, you would check if currentUser has role 'retailer'
      // For this step, we assume the logged-in user is the retailer.
      setUser(currentUser);
      
      const retailerId = currentUser.id;
      
      await fetchDashboardData(retailerId);
      await fetchRetailerProducts(retailerId);
      
      setLoading(false);
    };

    checkUserAndFetchData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    navigate('/');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-green-600">Retailer Dashboard</h1>
          <div>
            <Button variant="outline" onClick={() => navigate('/')}>View Store</Button>
            <Button variant="ghost" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Logout</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* 1. Metrics Overview */}
        <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Performance Overview</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard 
                    title="Monthly Revenue"
                    value={`₹${metrics.monthlyRevenue.toFixed(2)}`}
                    icon={DollarSign}
                    description={`+15% from last month`}
                />
                <MetricCard 
                    title="Total Revenue"
                    value={`₹${metrics.totalRevenue.toFixed(2)}`}
                    icon={DollarSign}
                    description={`Since account creation`}
                />
                <MetricCard 
                    title="Orders Received (Month)"
                    value={metrics.monthlyOrders.toString()}
                    icon={ShoppingBag}
                    description={`+5 new orders this week`}
                />
                 <MetricCard 
                    title="Total Products Listed"
                    value={products.length.toString()}
                    icon={Package}
                    description={`${products.filter(p => p.inStock).length} currently in stock`}
                />
            </div>
        </div>

        {/* 2. Main Tabs: Orders vs. Products */}
        <Tabs defaultValue="products">
            <TabsList className="grid w-full grid-cols-2 lg:w-96">
                <TabsTrigger value="products">My Products</TabsTrigger>
                <TabsTrigger value="orders">Recent Orders</TabsTrigger>
            </TabsList>

            {/* Products Tab Content */}
            <TabsContent value="products" className="mt-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Manage Inventory ({products.length})</CardTitle>
                        {/* Placeholder action for adding product */}
                        <Button variant="default">Add New Product</Button> 
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.length > 0 ? products.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>₹{p.price.toFixed(2)}</TableCell>
                                        <TableCell className="capitalize">{p.category}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {p.inStock ? 'In Stock' : 'Out of Stock'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">Edit</Button>
                                            <Button variant="ghost" size="sm" className="text-destructive">Delete</Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No products listed yet.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Orders Tab Content (Mock Data) */}
            <TabsContent value="orders" className="mt-4">
                <Card>
                    <CardHeader><CardTitle>Pending Orders</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Customer ID</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* Mock Orders */}
                                <TableRow>
                                    <TableCell className="font-medium">#C2E9A1B</TableCell>
                                    <TableCell>User X5D9</TableCell>
                                    <TableCell>₹1,299</TableCell>
                                    <TableCell><span className="text-orange-500">Processing</span></TableCell>
                                    <TableCell className="text-right"><Button variant="secondary" size="sm">Fulfill</Button></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">#B4F7C8D</TableCell>
                                    <TableCell>User Y1A4</TableCell>
                                    <TableCell>₹5,400</TableCell>
                                    <TableCell><span className="text-green-600">Shipped</span></TableCell>
                                    <TableCell className="text-right"><Button variant="ghost" size="sm" disabled>Track</Button></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">#A9G6H3Z</TableCell>
                                    <TableCell>User Z9B2</TableCell>
                                    <TableCell>₹799</TableCell>
                                    <TableCell><span className="text-orange-500">Processing</span></TableCell>
                                    <TableCell className="text-right"><Button variant="secondary" size="sm">Fulfill</Button></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default RetailerDashboard;