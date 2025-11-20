// src/pages/ThemePage.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
// IMPORT LOCAL DATA HELPER
import { getThemeById } from '@/data/themes';

const ThemePage = () => {
  const { themeId } = useParams<{ themeId: string }>();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchThemeAndProducts = async () => {
      if (themeId) {
        // 1. Try to find theme in local data first
        const localTheme = getThemeById(themeId);
        
        if (localTheme) {
           // Use local data
           setTheme(localTheme);
        } else {
           // Fallback to Supabase if not found locally
           const { data: themeData, error: themeError } = await supabase
             .from('themes')
             .select('*')
             .eq('id', themeId)
             .single();

           if (themeError || !themeData) {
             console.error('Error fetching theme:', themeError);
             navigate('/');
             return;
           }
           setTheme(themeData);
        }

        // 2. Fetch products (Keep fetching from Supabase, will show empty if none match)
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('theme_id', themeId);

        if (productsError) {
          console.error('Error fetching products:', productsError);
        } else {
          setProducts(productsData || []);
        }
      }
    };

    fetchThemeAndProducts();
  }, [themeId, navigate]);

  useEffect(() => {
    if (theme) {
        document.body.style.background = theme.background_color || theme.backgroundColor || 'hsl(var(--background))';
        
        if (theme.background_color || theme.backgroundColor) {
          const watermark = document.createElement('div');
          watermark.id = 'theme-watermark';
          watermark.style.position = 'fixed';
          watermark.style.top = '0';
          watermark.style.left = '0';
          watermark.style.width = '100%';
          watermark.style.height = '100%';
          watermark.style.background = theme.background_color || theme.backgroundColor;
          watermark.style.zIndex = '-1';
          watermark.style.pointerEvents = 'none';
          document.body.appendChild(watermark);
        }
    }

    return () => {
      document.body.style.background = '';
      const watermark = document.getElementById('theme-watermark');
      if (watermark) {
        document.body.removeChild(watermark);
      }
    };
  }, [theme]);

  if (!theme) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Loading theme...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Theme Header */}
      <div 
        className="relative bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${theme.header_image || theme.image || ''})` }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative container mx-auto px-4 py-12">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-6 text-white hover:bg-white/10 focus-visible:text-white"
          >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
          </Button>
          
          <div className="text-center text-white">
            <h1 className="text-5xl font-bold mb-4">{theme.name}</h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              {theme.description}
            </p>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-16">
        <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
          {products.length > 0 ? (
            <>
              <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
                {theme.name} Collection
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    price={product.price}
                    image={product.images?.[0] || '/placeholder.svg'}
                    onAddToCart={() => addToCart(product.id)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Coming Soon!
              </h2>
              <p className="text-muted-foreground mb-8">
                We're working on adding amazing {theme.name} themed products. Check back soon!
              </p>
              <Button onClick={() => navigate('/themes')}>
                Explore Other Themes
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThemePage;