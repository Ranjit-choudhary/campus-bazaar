// src/pages/ShopAll.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';

const ShopAll = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<string>('name');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const { addToCart } = useCart();

  async function getProducts() {
    let query = supabase.from('products').select();
    if (filterCategory !== 'all') {
      query = query.eq('category', filterCategory);
    }
    const { data } = await query;
    setProducts(data || []);
  }

  useEffect(() => {
    getProducts();
  }, [filterCategory]);

  const categories = [
    'all',
    'posters',
    'bedsheets',
    'artificial-plants',
    'stationery',
    'lighting',
    'water-bottles',
    'others'
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
          {sortedProducts.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              image={product.images[0]}
              onAddToCart={() => addToCart(product.id)}
            />
          ))}
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
