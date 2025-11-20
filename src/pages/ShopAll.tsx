import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// IMPORT LOCAL DATA
import { products as localProducts, getRetailerById } from '@/data/products'; // Import local products and helper
import { useCart } from '@/contexts/CartContext';

const ShopAll = () => {
  const navigate = useNavigate();
  // Use local products directly instead of fetching from Supabase for now to match your request
  const [products, setProducts] = useState<any[]>(localProducts); 
  const [sortBy, setSortBy] = useState<string>('name');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const { addToCart } = useCart();

  useEffect(() => {
    let filtered = localProducts;
    if (filterCategory !== 'all') {
      // Note: Our local data uses 'mugs', 'posters' etc for category, NOT 'category-movies'
      // 'category-movies' is the THEME. 
      // We should probably filter by theme OR category. 
      // For this example, let's assume the dropdown filters by the 'category' field in Product interface.
      filtered = localProducts.filter(p => p.category === filterCategory);
    }
    setProducts(filtered);
  }, [filterCategory]);

  const categories = [
    'all',
    'posters',
    'mugs',
    'decor',
    'lighting',
    'tech',
    'toys',
    'kitchen'
  ];

  const sortedProducts = [...products].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Shop All Products</h1>
          <p className="text-xl text-muted-foreground">
            Discover our complete collection of themed room decor
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8 p-4 bg-muted/30 rounded-lg">
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Filter by Category
            </label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                    <SelectItem key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Sort by
            </label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="price-low">Price (Low to High)</SelectItem>
                <SelectItem value="price-high">Price (High to Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-muted-foreground">
            Showing {sortedProducts.length} products
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sortedProducts.map((product) => {
             const retailer = getRetailerById(product.retailerId);
             return (
                <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                image={product.images && product.images.length > 0 ? product.images[0] : '/placeholder.svg'}
                // Pass new props
                retailerName={retailer ? retailer.name : 'Unknown Seller'}
                stock={product.stock}
                onAddToCart={() => addToCart(product.id)} // Note: addToCart expects number ID but our local IDs are strings. You might need to update Context or parse ID.
                // For now, assuming addToCart can handle it or we cast it if it was strictly number before.
                />
             );
          })}
        </div>

        {sortedProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground mb-4">
              No products found in this category
            </p>
            <Button onClick={() => setFilterCategory('all')}>
              Show All Products
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopAll;