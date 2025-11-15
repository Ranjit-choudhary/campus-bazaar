// src/pages/ProductDetailPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingCart, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

// New Interface for Feedback
interface Feedback {
  id: string;
  user_id: string;
  product_id: number;
  type: 'feedback' | 'query';
  content: string;
  created_at: string;
  // This nested property will now be null due to the simplified fetch
  users: {
    raw_user_meta_data: {
        full_name?: string;
        user_name?: string;
    } | null;
  } | null;
}

const ProductDetailPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // New state for Feedback/Queries
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [newFeedbackType, setNewFeedbackType] = useState<'feedback' | 'query'>('feedback');
  const [newFeedbackContent, setNewFeedbackContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);


  const fetchFeedback = async (id: number) => {
    // FIX: Simplified the select statement by removing the join.
    // This bypasses potential RLS issues with the auth.users table on read.
    const { data, error } = await supabase
      .from('product_feedback')
      .select(`
        id, product_id, user_id, type, content, created_at
      `)
      .eq('product_id', id)
      .order('created_at', { ascending: false });
    // END FIX

    if (error) {
      console.error('Error fetching feedback:', error);
    } else {
      // NOTE: We cast the result, knowing 'users' property will be missing/null.
      setFeedbackList(data as unknown as Feedback[]);
    }
  };

  useEffect(() => {
    const fetchProductAndUser = async () => {
      if (!productId) return;
      setLoading(true);

      // 1. Fetch Product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError || !productData) {
        console.error('Error fetching product:', productError);
        navigate('/not-found');
        setLoading(false);
        return;
      }
      setProduct(productData);
      if (productData.images && productData.images.length > 0) {
        setSelectedImage(productData.images[0]);
      }

      // 2. Fetch User (for submission logic)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      
      // 3. Fetch Feedback
      await fetchFeedback(productData.id);

      setLoading(false);
    };
    fetchProductAndUser();
  }, [productId, navigate]);
  
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to submit feedback or queries.');
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
        product_id: product.id,
        user_id: user.id,
        type: newFeedbackType,
        content: newFeedbackContent.trim(),
      });

    if (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit. Please try again.');
    } else {
      toast.success(`${newFeedbackType === 'feedback' ? 'Feedback' : 'Query'} submitted successfully!`);
      setNewFeedbackContent('');
      fetchFeedback(product.id); // Refresh the list
    }
    setIsSubmitting(false);
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

  // Helper to format date and time
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  // Helper to get display name (now relies on fallback since the join is removed)
  const getDisplayName = (feedbackItem: Feedback) => {
      const rawMetadata = feedbackItem.users?.raw_user_meta_data;
      const userName = rawMetadata?.full_name || rawMetadata?.user_name;
      
      if (userName) {
          return userName;
      }

      // Fallback to truncated user ID
      return feedbackItem.user_id ? `User ${feedbackItem.user_id.substring(0, 8)}` : 'Anonymous';
  }


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        {/* Product Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 mb-12">
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

        {/* --- Visual Break --- */}
        <Separator className="my-12" />

        {/* Feedback and Queries Section */}
        <div className="mt-8">
          <h2 className="text-3xl font-bold text-foreground mb-6">Feedback & Queries</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Submission Form */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Submit Yours</CardTitle>
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
                          <SelectItem value="feedback">Feedback</SelectItem>
                          <SelectItem value="query">Query</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="content">Content</Label>
                      <Textarea 
                        id="content"
                        value={newFeedbackContent}
                        onChange={(e) => setNewFeedbackContent(e.target.value)}
                        placeholder="Share your thoughts or ask a question..."
                        required
                        className="min-h-[100px]"
                      />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isSubmitting || !user}>
                      <Send className="mr-2 h-4 w-4" />
                      {isSubmitting ? 'Submitting...' : 'Submit'}
                    </Button>
                    {!user && (
                        <p className="text-sm text-center text-red-500">You must be logged in to submit.</p>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Display List */}
            <div className="lg:col-span-2 space-y-4">
              {feedbackList.length > 0 ? (
                feedbackList.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className={cn(
                                "font-semibold capitalize",
                                item.type === 'query' ? 'text-orange-500' : 'text-green-600'
                            )}>
                                {item.type}:
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {formatTime(item.created_at)}
                            </span>
                        </div>
                        <p className="text-sm text-foreground mb-3">{item.content}</p>
                        {/* Now using the fallback logic to display the user ID or 'Anonymous' */}
                        <div className="text-right text-xs text-muted-foreground">
                            — Submitted by {getDisplayName(item)}
                        </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card><CardContent className="p-6 text-center text-muted-foreground">
                    Be the first to leave a feedback or ask a query!
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