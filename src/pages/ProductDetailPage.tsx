// src/pages/ProductDetailPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingCart, Send, Package, Store, Star, Bell, Tag } from 'lucide-react'; // Added Bell, Tag
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge'; // Added Badge

// Interface for Feedback matching Supabase table
interface Feedback {
  id: string;
  user_id: string;
  product_id: string;
  type: 'feedback' | 'query';
  content: string;
  rating?: number;
  created_at: string;
  user_email?: string;
}

const ProductDetailPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [retailer, setRetailer] = useState<any>(null);

  // Feedback State
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [newFeedbackType, setNewFeedbackType] = useState<'feedback' | 'query'>('feedback');
  const [newFeedbackContent, setNewFeedbackContent] = useState('');
  const [newRating, setNewRating] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Notify Me State
  const [notified, setNotified] = useState(false);

  // Function to fetch feedback from Supabase
  const fetchFeedback = async (prodId: string) => {
    const { data, error } = await supabase
      .from('product_feedback')
      .select('*')
      .eq('product_id', prodId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feedback:', error);
    } else {
      setFeedbackList(data || []);
    }
  };

  useEffect(() => {
    const fetchProductAndUser = async () => {
      if (!productId) return;
      setLoading(true);

      // 1. Fetch Product, Retailer, AND Theme from Supabase
      const { data: foundProduct, error } = await supabase
        .from('products')
        .select(`
            *,
            retailers (
                name,
                rating,
                description
            ),
            themes (
                name
            )
        `)
        .eq('id', productId)
        .single();

      if (error || !foundProduct) {
        console.error('Error fetching product:', error);
        setLoading(false);
        return;
      }
      
      setProduct(foundProduct);
      if (foundProduct.images && foundProduct.images.length > 0) {
        setSelectedImage(foundProduct.images[0]);
      }

      if (foundProduct.retailers) {
          setRetailer(foundProduct.retailers);
      }

      // 2. Fetch User Session
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      // 3. Fetch Real Feedback
      await fetchFeedback(foundProduct.id);

      setLoading(false);
    };
    fetchProductAndUser();
  }, [productId, navigate]);
  
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to submit feedback.');
      navigate('/login');
      return;
    }
    if (!newFeedbackContent.trim()) {
      toast.error('Content cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    
    const { error } = await supabase
      .from('product_feedback')
      .insert({
        user_id: user.id,
        product_id: product.id,
        type: newFeedbackType,
        content: newFeedbackContent.trim(),
        rating: newFeedbackType === 'feedback' ? newRating : null,
      });

    if (error) {
      console.error("Submission error:", error);
      if (error.code === '23505') {
          toast.error("You have already submitted feedback for this product.");
      } else {
          toast.error("Failed to submit. Please try again.");
      }
    } else {
      toast.success(`${newFeedbackType === 'feedback' ? 'Feedback' : 'Query'} submitted successfully!`);
      setNewFeedbackContent('');
      setNewRating(5);
      await fetchFeedback(product.id);
    }
    setIsSubmitting(false);
  };

  const handleNotifyMe = () => {
      if (notified) return;
      
      // Here you would typically save the notification request to a database
      toast.success("We'll notify you!", {
          description: "You will receive an email when this item is back in stock."
      });
      setNotified(true);
  };

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

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  
  const ratings = feedbackList
    .filter(f => f.type === 'feedback' && f.rating)
    .map(f => f.rating as number);
    
  const averageRating = ratings.length > 0 
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) 
    : null;

  let stockStatus = null;
  if (product.stock === 0) {
      stockStatus = <span className="text-destructive font-semibold flex items-center gap-2"><Package className="h-4 w-4"/> Out of Stock</span>;
  } else if (product.stock < 10) {
      stockStatus = <span className="text-orange-600 font-semibold flex items-center gap-2"><Package className="h-4 w-4"/> Only {product.stock} left in stock - order soon.</span>;
  } else {
      stockStatus = <span className="text-green-600 font-semibold flex items-center gap-2"><Package className="h-4 w-4"/> In Stock ({product.stock} units)</span>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 mb-12">
          {/* Images */}
          <div>
            <Card className="overflow-hidden border-none shadow-none">
              <CardContent className="p-0">
                <img 
                  src={selectedImage || '/placeholder.svg'} 
                  alt={product.name}
                  className="w-full h-auto max-h-[500px] object-cover rounded-lg shadow-md"
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

          {/* Details */}
          <div className="flex flex-col">
            <h1 className="text-4xl font-bold text-foreground mb-2">{product.name}</h1>
            
            {/* Theme and Retailer Info */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                {product.themes && (
                    <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1 text-sm">
                        <Tag className="h-3 w-3" />
                        {product.themes.name} Theme
                    </Badge>
                )}
                
                {retailer && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground border-l pl-3 ml-1">
                        <Store className="h-4 w-4" />
                        <span>Sold by <span className="font-semibold text-foreground">{retailer.name}</span></span>
                        <span className="text-yellow-500 flex items-center gap-1">★ {retailer.rating}</span>
                    </div>
                )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-6">
                {averageRating ? (
                    <>
                        <div className="flex text-yellow-500">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className={cn("h-5 w-5", i < Math.round(Number(averageRating)) ? "fill-current" : "text-muted-foreground/30")} />
                            ))}
                        </div>
                        <span className="text-lg font-medium">{averageRating}</span>
                        <span className="text-muted-foreground text-sm">({ratings.length} ratings)</span>
                    </>
                ) : (
                    <span className="text-muted-foreground text-sm">No ratings yet</span>
                )}
            </div>

            <Separator className="mb-6" />

            <p className="text-3xl font-semibold text-primary mb-4">₹{product.price}</p>
            
            <div className="mb-6">
                {stockStatus}
            </div>

            <p className="text-muted-foreground mb-8 flex-grow text-lg leading-relaxed">{product.description}</p>
            
            {/* Actions - "Add to Cart" or "Notify Me" */}
            <div className="flex items-center gap-4 mt-auto">
              <Button 
                size="lg" 
                className="w-full md:w-auto text-lg py-6" 
                onClick={() => product.stock === 0 ? handleNotifyMe() : addToCart(product.id)}
                variant={product.stock === 0 ? "outline" : "default"}
                disabled={product.stock === 0 && notified}
              >
                {product.stock === 0 ? (
                    <Bell className={cn("mr-2 h-5 w-5", notified && "fill-current")} />
                ) : (
                    <ShoppingCart className="mr-2 h-5 w-5" />
                )}
                {product.stock === 0 ? (notified ? 'Notified' : 'Notify Me') : 'Add to Cart'}
              </Button>
            </div>
          </div>
        </div>

        <Separator className="my-12" />

        {/* Feedback Section */}
        <div className="mt-8 max-w-4xl">
          <h2 className="text-3xl font-bold text-foreground mb-6">Feedback & Queries</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Ask or Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitFeedback} className="space-y-4">
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select 
                        value={newFeedbackType} 
                        onValueChange={(value) => setNewFeedbackType(value as 'feedback' | 'query')}
                      >
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="feedback">Feedback (Review)</SelectItem>
                          <SelectItem value="query">Query (Question)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {newFeedbackType === 'feedback' && (
                        <div>
                            <Label className="mb-2 block">Rating</Label>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setNewRating(star)}
                                        className={cn(
                                            "p-1 transition-colors",
                                            star <= newRating ? "text-yellow-500" : "text-muted-foreground"
                                        )}
                                    >
                                        <Star className={cn("h-6 w-6", star <= newRating && "fill-current")} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div>
                      <Label htmlFor="content">Content</Label>
                      <Textarea 
                        id="content"
                        value={newFeedbackContent}
                        onChange={(e) => setNewFeedbackContent(e.target.value)}
                        placeholder={newFeedbackType === 'feedback' ? "Share your experience..." : "Ask a question..."}
                        required
                        className="min-h-[100px]"
                      />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      <Send className="mr-2 h-4 w-4" />
                      {isSubmitting ? 'Submitting...' : 'Submit'}
                    </Button>
                    {!user && <p className="text-xs text-red-500 mt-2">You must log in to post.</p>}
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {feedbackList.length > 0 ? (
                feedbackList.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "font-semibold capitalize px-2 py-0.5 rounded text-xs",
                                    item.type === 'query' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                                )}>
                                    {item.type}
                                </span>
                                {item.type === 'feedback' && item.rating && (
                                    <div className="flex text-yellow-500">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={cn("h-3 w-3", i < item.rating! ? "fill-current" : "text-muted-foreground/30")} />
                                        ))}
                                    </div>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {formatTime(item.created_at)}
                            </span>
                        </div>
                        <p className="text-sm text-foreground mb-3">{item.content}</p>
                        <div className="text-right text-xs text-muted-foreground font-medium">
                            — User {item.user_id.substring(0, 6)}...
                        </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="bg-muted/30 border-dashed">
                    <CardContent className="p-12 text-center text-muted-foreground">
                    <p>No feedback or queries yet.</p>
                    <p className="text-sm">Be the first to review this product!</p>
                </CardContent></Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;