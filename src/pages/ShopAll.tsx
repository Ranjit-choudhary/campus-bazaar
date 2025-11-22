import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Search, Filter, MapPin, Package, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';
import { useCart } from '@/contexts/CartContext'; 
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- CONFIGURATION: Hardcoded Retailer Distances ---
const RETAILER_DISTANCE_MAP: Record<string, number> = {
  'The Nerd Nook': 624,
  'Campus Decor Co.': 31,
  'Aesthetic Living': 1543,
  'Geek Galaxy': 742,
  'Retro Rewind': 648
};

const DEFAULT_DISTANCE = 3; // Fallback for any other retailer

const ShopAll = () => {
  const { addToCart } = useCart(); 
  
  const [products, setProducts] = useState<(Product & { distance?: number | null; deliveryDate?: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 10000]); 
  const [maxDistance, setMaxDistance] = useState([2000]); 
  const [enableLocationFilter, setEnableLocationFilter] = useState(false);
  
  const [showOutOfStock, setShowOutOfStock] = useState(true);
  const [minQuantity, setMinQuantity] = useState([0]); 

  // Sorting State
  const [sortOption, setSortOption] = useState('featured');

  const categories = ['all', 'mugs', 'posters', 'decor', 'lighting', 'tech', 'toys', 'general'];

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          retailer:retailers (
            id,
            name,
            city,
            latitude,
            longitude
          )
        `);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Could not load products');
    } finally {
      setLoading(false);
    }
  };

  // --- PROCESSING PRODUCTS ---
  const processedProducts = products.map(product => {
    let distance = DEFAULT_DISTANCE;
    let deliveryDate = null;

    // 1. Assign Distance based on Retailer Name
    if (product.retailer?.name) {
        const name = product.retailer.name;
        if (RETAILER_DISTANCE_MAP[name] !== undefined) {
            distance = RETAILER_DISTANCE_MAP[name];
        }
    }

    // 2. Assign Delivery Date based on City (Only if in stock)
    if (product.stock && product.stock > 0 && product.retailer?.city) {
        const city = product.retailer.city;
        if (city === 'Hyderabad') {
            deliveryDate = '25/11/25';
        } else if (city === 'Bengaluru' || city === 'Bangalore') {
            deliveryDate = '26/11/25';
        } else if (city === 'Mumbai' || city === 'Chennai') {
            deliveryDate = '27/11/25';
        } else if (city === 'New Delhi' || city === 'Delhi') {
            deliveryDate = '29/11/25';
        }
    }

    return { ...product, distance, deliveryDate };
  }).filter(product => {
    // Filter Logic
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    
    // Check if price is within range [min, max]
    const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
    
    let matchesLocation = true;
    if (enableLocationFilter) {
       if (product.distance === null) matchesLocation = false; 
       else matchesLocation = (product.distance as number) <= maxDistance[0];
    }

    const matchesAvailability = showOutOfStock ? true : (product.stock && product.stock > 0);
    const matchesQuantity = (product.stock || 0) >= minQuantity[0];

    return matchesSearch && matchesCategory && matchesPrice && matchesLocation && matchesAvailability && matchesQuantity;
  }).sort((a, b) => {
      // --- SORTING LOGIC ---
      switch (sortOption) {
        case 'price-asc': return a.price - b.price;
        case 'price-desc': return b.price - a.price;
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'stock-asc': return (a.stock || 0) - (b.stock || 0);
        case 'stock-desc': return (b.stock || 0) - (a.stock || 0);
        case 'distance-asc': return (a.distance || Infinity) - (b.distance || Infinity);
        default: // 'featured'
          if (enableLocationFilter && a.distance !== null && b.distance !== null) {
              return a.distance - b.distance;
          }
          return 0;
      }
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Shop All</h1>
          
          <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Sort Dropdown */}
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="name-asc">Name: A to Z</SelectItem>
                <SelectItem value="name-desc">Name: Z to A</SelectItem>
                <SelectItem value="stock-desc">Stock: High to Low</SelectItem>
                <SelectItem value="stock-asc">Stock: Low to High</SelectItem>
                <SelectItem value="distance-asc">Distance: Nearest</SelectItem>
              </SelectContent>
            </Select>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 w-full sm:w-auto">
                  <Filter className="h-4 w-4" /> Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filter Products</SheetTitle>
                  <SheetDescription>Refine your search results.</SheetDescription>
                </SheetHeader>
                
                <div className="grid gap-6 py-4">
                  <div className="space-y-2">
                    <Label className="text-base">Category</Label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(category => (
                        <Badge 
                          key={category}
                          variant={selectedCategory === category ? "default" : "outline"}
                          className="cursor-pointer capitalize"
                          onClick={() => setSelectedCategory(category)}
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Cost Range Slider with Double Thumbs */}
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4"/> Cost Range</Label>
                      <span className="text-sm text-muted-foreground">₹{priceRange[0]} - ₹{priceRange[1]}</span>
                    </div>
                    <Slider
                      value={priceRange}
                      max={10000}
                      step={100}
                      onValueChange={setPriceRange}
                      min={0}
                    />
                  </div>

                  <div className="space-y-4 border-t pt-4">
                      <Label className="text-base flex items-center gap-2"><Package className="h-4 w-4"/> Inventory</Label>
                      
                      <div className="flex items-center justify-between">
                          <Label htmlFor="show-oos" className="text-sm font-normal">Show Out of Stock</Label>
                          <Switch 
                              id="show-oos"
                              checked={showOutOfStock}
                              onCheckedChange={setShowOutOfStock}
                          />
                      </div>
                      <div className="space-y-3">
                         <div className="flex justify-between">
                            <Label className="text-sm font-normal">Min Quantity</Label>
                            <span className="text-sm text-muted-foreground">{minQuantity[0]}+</span>
                         </div>
                         <Slider
                            value={minQuantity}
                            max={50}
                            step={1}
                            onValueChange={setMinQuantity}
                         />
                      </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                     <div className="flex justify-between items-center">
                        <Label className="text-base flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> Nearby Only
                        </Label>
                        <Button 
                            variant={enableLocationFilter ? "default" : "outline"} 
                            size="sm"
                            onClick={() => setEnableLocationFilter(!enableLocationFilter)}
                        >
                            {enableLocationFilter ? 'On' : 'Off'}
                        </Button>
                     </div>
                     
                     {enableLocationFilter && (
                         <div className="space-y-3">
                             <div className="flex justify-between">
                                <Label className="text-sm">Max Distance</Label>
                                <span className="text-sm text-muted-foreground">{maxDistance[0]} km</span>
                             </div>
                             <Slider
                                value={maxDistance}
                                max={2000}
                                step={50}
                                onValueChange={setMaxDistance}
                             />
                         </div>
                     )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
            {selectedCategory !== 'all' && (
                <Badge variant="secondary" onClick={() => setSelectedCategory('all')} className="cursor-pointer">
                    Category: {selectedCategory} ✕
                </Badge>
            )}
            
            {(priceRange[0] > 0 || priceRange[1] < 10000) && (
                <Badge variant="secondary" onClick={() => setPriceRange([0, 10000])} className="cursor-pointer">
                    Price: ₹{priceRange[0]} - ₹{priceRange[1]} ✕
                </Badge>
            )}

            {enableLocationFilter && (
                <Badge variant="secondary" onClick={() => setEnableLocationFilter(false)} className="cursor-pointer">
                    Within {maxDistance[0]}km ✕
                </Badge>
            )}
            {showOutOfStock && (
                <Badge variant="secondary" onClick={() => setShowOutOfStock(false)} className="cursor-pointer">
                    Including Out of Stock ✕
                </Badge>
            )}
            {minQuantity[0] > 0 && (
                <Badge variant="secondary" onClick={() => setMinQuantity([0])} className="cursor-pointer">
                    Min Qty: {minQuantity[0]} ✕
                </Badge>
            )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="h-[300px] bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : processedProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">No products found matching your criteria.</p>
            <Button variant="link" onClick={() => {
                    setSelectedCategory('all');
                    setPriceRange([0, 10000]); 
                    setEnableLocationFilter(false);
                }}>
                Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {processedProducts.map((product) => (
              <div key={product.id} className="relative group">
                  <ProductCard 
                    id={product.id}
                    name={product.name}
                    price={product.price}
                    image={product.images && product.images.length > 0 ? product.images[0] : '/placeholder.svg'}
                    tag={product.tag || undefined}
                    retailerName={product.retailer?.name}
                    stock={product.stock}
                    distance={product.distance}
                    deliveryDate={product.deliveryDate} 
                    onAddToCart={() => addToCart(product.id)} 
                  />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopAll;