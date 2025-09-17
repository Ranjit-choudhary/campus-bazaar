import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import ThemeCard from '@/components/ThemeCard';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { ArrowRight, Instagram, Twitter, Facebook } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';

const Index = () => {
  const navigate = useNavigate();
  const [themes, setThemes] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const { addToCart } = useCart();

  async function getThemes() {
    const { data } = await supabase.from('themes').select().limit(3);
    setThemes(data || []);
  }

  async function getFeaturedProducts() {
    const { data } = await supabase.from('products').select().limit(8);
    setFeaturedProducts(data || []);
  }

  useEffect(() => {
    getThemes();
    getFeaturedProducts();
  }, []);

  const handleExploreThemes = () => {
    const themesSection = document.getElementById('themes-section');
    themesSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleThemeClick = (themeId: string) => {
    navigate(`/theme/${themeId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <HeroSection onExploreThemes={handleExploreThemes} />
      <section id="themes-section" className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Choose Your Theme
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From magical worlds to natural aesthetics, find the perfect theme that matches your personality
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {themes.map((theme) => (
              <ThemeCard
                key={theme.id}
                title={theme.name}
                image={theme.image}
                tag={theme.tag}
                onClick={() => handleThemeClick(theme.id)}
              />
            ))}
          </div>
          <div className="text-center mt-12">
            <Button variant="outline" onClick={() => navigate('/themes')}>
              View All Themes <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Top Picks
              </h2>
              <p className="text-muted-foreground">
                Popular items loved by students everywhere
              </p>
            </div>
            <Button variant="outline" className="hidden md:flex" onClick={() => navigate('/shop-all')}>
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                image={product.images[0]}
                tag={product.tag}
                onAddToCart={() => addToCart(product.id)}
              />
            ))}
          </div>
          <div className="text-center mt-8 md:hidden">
            <Button variant="outline" onClick={() => navigate('/shop-all')}>
              View All Products <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
      <footer className="bg-card border-t border-border py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold text-primary mb-4">Campus Bazaar</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Your one-stop destination for themed room decor. Transform your college space into a reflection of your personality.
              </p>
              <div className="flex space-x-4">
                <Button variant="ghost" size="sm">
                  <Instagram className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Twitter className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Facebook className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Quick Links</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="/about-us" className="hover:text-primary transition-colors">About Us</a></li>
                <li><a href="/help" className="hover:text-primary transition-colors">Help</a></li>
                <li><a href="/return-policy" className="hover:text-primary transition-colors">Return Policy</a></li>
                <li><a href="/terms-and-conditions" className="hover:text-primary transition-colors">Terms and Conditions</a></li>
              </ul>
            </div>
            
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2025 Campus Bazaar. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;