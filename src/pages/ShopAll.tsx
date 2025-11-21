import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Search, Filter, MapPin, Package, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';
import { useLocation } from '@/contexts/LocationContext';
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

// FALLBACK: BITS Pilani Hyderabad Campus
const FALLBACK_LOCATION = {
    lat: 17.5449,
    lng: 78.5718
};

const ShopAll = () => {
  const { userLocation, calculateDistance, error: locationError } = useLocation();
  const { addToCart } = useCart(); 
  const [products, setProducts] = useState<(Product & { distance?: number | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- FILTERS STATE ---
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([5000]); // Max Price
  const [maxDistance, setMaxDistance] = useState([50]); 
  const [enableLocationFilter, setEnableLocationFilter] = useState(false);
  
  // New Filters
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [minQuantity, setMinQuantity] = useState([0]); // Min Stock

  const categories = ['all', 'mugs', 'posters', 'decor', 'lighting', 'tech', 'toys', 'general'];

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // REMOVED .eq('in_stock', true) so we can filter it client-side instead
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

  // --- FILTER LOGIC ---
  const filteredProducts = products.map(product => {
    let distance = null;
    
    // 1. Try to use Retailer's Real Location
    let retailerLat = product.retailer?.latitude;
    let retailerLng = product.retailer?.longitude;

    // 2. If missing, use Fallback (BITS Pilani)
    if (!retailerLat || !retailerLng) {
        retailerLat = FALLBACK_LOCATION.lat;
        retailerLng = FALLBACK_LOCATION.lng;
    }

    if (userLocation) {
      distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        retailerLat,
        retailerLng
      );
    }
    return { ...product, distance };
  }).filter(product => {
    // 1. Search
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Category
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    
    // 3. Price (Cost)
    const matchesPrice = product.price <= priceRange[0];
    
    // 4. Location
    let matchesLocation = true;
    if (enableLocationFilter && userLocation) {
       if (product.distance === null) matchesLocation = false; 
       else matchesLocation = (product.distance as number) <= maxDistance[0];
    }

    // 5. Stock Availability
    // If showOutOfStock is FALSE, we ONLY show items where in_stock is TRUE (or stock > 0)
    const matchesAvailability = showOutOfStock ? true : (product.stock && product.stock > 0);

    // 6. Min Quantity (Stock Level)
    const matchesQuantity = (product.stock || 0) >= minQuantity[0];

    return matchesSearch && matchesCategory && matchesPrice && matchesLocation && matchesAvailability && matchesQuantity;
  }).sort((a, b) => {
      if (enableLocationFilter && a.distance !== null && b.distance !== null) {
          return (a.distance as number) - (b.distance as number);
      }
      return 0;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Shop All</h1>
          
          <div className="flex w-full md:w-auto gap-2">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" /> Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filter Products</SheetTitle>
                  <SheetDescription>Refine your search results.</SheetDescription>
                </SheetHeader>
                
                <div className="grid gap-6 py-4">
                  {/* Category */}
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

                  {/* Price Filter */}
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4"/> Max Cost</Label>
                      <span className="text-sm text-muted-foreground">₹{priceRange[0]}</span>
                    </div>
                    <Slider
                      value={priceRange}
                      max={10000}
                      step={100}
                      onValueChange={setPriceRange}
                    />
                  </div>

                  {/* Stock & Availability Filters */}
                  <div className="space-y-4 border-t pt-4">
                      <Label className="text-base flex items-center gap-2"><Package className="h-4 w-4"/> Inventory</Label>
                      
                      {/* Availability Toggle */}
                      <div className="flex items-center justify-between">
                          <Label htmlFor="show-oos" className="text-sm font-normal">Show Out of Stock</Label>
                          <Switch 
                              id="show-oos"
                              checked={showOutOfStock}
                              onCheckedChange={setShowOutOfStock}
                          />
                      </div>

                      {/* Min Quantity Slider */}
                      <div className="space-y-3">
                         <div className="flex justify-between">
                            <Label className="text-sm font-normal">Min Quantity Available</Label>
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

                  {/* Location Filter */}
                  <div className="space-y-4 border-t pt-4">
                     <div className="flex justify-between items-center">
                        <Label className="text-base flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> Nearby Only
                        </Label>
                        <Button 
                            variant={enableLocationFilter ? "default" : "outline"} 
                            size="sm"
                            onClick={() => setEnableLocationFilter(!enableLocationFilter)}
                            disabled={!userLocation}
                        >
                            {enableLocationFilter ? 'On' : 'Off'}
                        </Button>
                     </div>
                     
                     {!userLocation && (
                         <p className="text-xs text-red-500">
                             {locationError || "Enable location to use this filter."}
                         </p>
                     )}

                     {enableLocationFilter && userLocation && (
                         <div className="space-y-3">
                             <div className="flex justify-between">
                                <Label className="text-sm">Distance</Label>
                                <span className="text-sm text-muted-foreground">{maxDistance[0]} km</span>
                             </div>
                             <Slider
                                value={maxDistance}
                                max={100}
                                step={1}
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

        {/* Filters Summary */}
        <div className="flex flex-wrap gap-2 mb-6">
            {selectedCategory !== 'all' && (
                <Badge variant="secondary" onClick={() => setSelectedCategory('all')} className="cursor-pointer">
                    Category: {selectedCategory} ✕
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
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">No products found matching your criteria.</p>
            <Button 
                variant="link" 
                onClick={() => {
                    setSelectedCategory('all');
                    setPriceRange([10000]);
                    setMinQuantity([0]);
                    setShowOutOfStock(true);
                    setEnableLocationFilter(false);
                }}
            >
                Clear all filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="relative group">
                  <ProductCard 
                    id={product.id}
                    name={product.name}
                    price={product.price}
                    image={product.images && product.images.length > 0 ? product.images[0] : '/placeholder.svg'}
                    tag={product.tag || undefined}
                    retailerName={product.retailer?.name}
                    stock={product.stock}
                    onAddToCart={() => addToCart(product.id)} 
                  />
                  {/* Distance Badge Overlay */}
                  {product.distance !== null && (
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                          <MapPin className="h-3 w-3" />
                          {product.distance.toFixed(1)} km
                      </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopAll;