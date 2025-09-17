import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext'; // Added this line

const ThemePage = () => {
  const { themeId } = useParams<{ themeId: string }>();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchThemeAndProducts = async () => {
      if (themeId) {
        // Fetch theme details
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

        // Fetch products for the theme
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
        style={{ backgroundImage: `url(${theme.header_image || ''})` }}
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
                    image={product.images[0]}
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
              <Button onClick={() => navigate('/')}>
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