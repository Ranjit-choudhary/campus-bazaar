import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import ThemeCard from '@/components/ThemeCard';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';

const SearchResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [productResults, setProductResults] = useState<any[]>([]);
  const [themeResults, setThemeResults] = useState<any[]>([]);
  const { addToCart } = useCart();

  useEffect(() => {
    const performSearch = async () => {
        if (query.trim()) {
            // Search for products
            const { data: products } = await supabase
                .from('products')
                .select()
                .textSearch('fts', query.trim());
            setProductResults(products || []);

            // Search for themes
            const { data: themes } = await supabase
                .from('themes')
                .select()
                .textSearch('fts', query.trim());
            setThemeResults(themes || []);
        } else {
            setProductResults([]);
            setThemeResults([]);
        }
    }
    performSearch();
  }, [query]);

  const totalResults = productResults.length + themeResults.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Search className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Search Results</h1>
          </div>
          {query && (
            <p className="text-xl text-muted-foreground">
              Results for "<span className="text-foreground font-medium">{query}</span>"
            </p>
          )}
        </div>

        {/* Results Count */}
        {query && (
          <div className="mb-6">
            <p className="text-muted-foreground">
              Found {totalResults} result{totalResults !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Theme Results */}
        {query && themeResults.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Themes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {themeResults.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  title={theme.name}
                  image={theme.image}
                  onClick={() => navigate(`/theme/${theme.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Product Results */}
        {query && productResults.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {productResults.map((product) => (
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
          </div>
        )}

        {/* No Results */}
        {query && totalResults === 0 && (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              No results found
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              We couldn't find any themes or products matching "{query}".
            </p>
            <Button onClick={() => navigate('/shop-all')}>
              Browse All Products
            </Button>
          </div>
        )}

        {/* No Query */}
        {!query && (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Enter a search term
            </h2>
            <p className="text-muted-foreground mb-6">
              Use the search bar above to find themes and products.
            </p>
            <Button onClick={() => navigate('/')}>
              Back to Home
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;