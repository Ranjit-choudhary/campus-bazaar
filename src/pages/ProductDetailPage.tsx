// src/pages/ProductDetailPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const ProductDetailPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error || !data) {
        console.error('Error fetching product:', error);
        navigate('/not-found');
      } else {
        setProduct(data);
        if (data.images && data.images.length > 0) {
          setSelectedImage(data.images[0]);
        }
      }
      setLoading(false);
    };
    fetchProduct();
  }, [productId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <p>Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images Gallery */}
          <div>
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <img 
                  src={selectedImage || '/placeholder.svg'} 
                  alt={product.name}
                  className="w-full h-auto max-h-[500px] object-cover rounded-t-lg"
                />
              </CardContent>
            </Card>
            <div className="flex gap-2 mt-4">
              {product.images && product.images.map((img: string, index: number) => (
                <button 
                  key={index} 
                  onClick={() => setSelectedImage(img)}
                  className={`border-2 rounded-lg overflow-hidden ${selectedImage === img ? 'border-primary' : 'border-transparent'}`}
                >
                  <img 
                    src={img} 
                    alt={`${product.name} thumbnail ${index + 1}`}
                    className="w-20 h-20 object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Details */}
          <div className="flex flex-col">
            <h1 className="text-4xl font-bold text-foreground mb-4">{product.name}</h1>
            <p className="text-3xl font-semibold text-primary mb-6">₹{product.price}</p>
            <p className="text-muted-foreground mb-6 flex-grow">{product.description}</p>
            
            <div className="flex items-center gap-4">
              <Button size="lg" onClick={() => addToCart(product.id)}>
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
