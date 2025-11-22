import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ShoppingCart, MapPin, Calendar } from 'lucide-react'; // Added Calendar icon
import { useNavigate } from 'react-router-dom';

interface ProductCardProps {
  id: string | number;
  name: string;
  price: number;
  image: string;
  tag?: string;
  retailerName?: string;
  stock?: number;
  distance?: number | null;
  deliveryDate?: string | null; // New Prop
  onAddToCart: () => void;
  onClick?: () => void;
}

const ProductCard = ({ 
  id, 
  name, 
  price, 
  image, 
  tag, 
  retailerName, 
  stock, 
  distance, 
  deliveryDate, // Destructure new prop
  onAddToCart,
  onClick 
}: ProductCardProps) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/product/${id}`);
    }
  };

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart();
  };

  let stockDisplay = null;
  if (stock !== undefined) {
    if (stock === 0) {
      stockDisplay = <span className="text-destructive text-xs font-medium">Out of Stock</span>;
    } else if (stock < 10) {
      stockDisplay = <span className="text-orange-600 text-xs font-medium">Only {stock} left in stock!</span>;
    } else {
      stockDisplay = <span className="text-green-600 text-xs font-medium">In Stock ({stock})</span>;
    }
  }

  return (
    <Card className="overflow-hidden cursor-pointer group flex flex-col h-full" onClick={handleCardClick}>
      <div className="relative aspect-square overflow-hidden">
        <img 
          src={image} 
          alt={name} 
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" 
        />
        
        {tag && (
          <Badge className="absolute top-2 right-2" variant={tag === 'hot' ? 'destructive' : 'default'}>
            {tag.charAt(0).toUpperCase() + tag.slice(1)}
          </Badge>
        )}

        {distance != null && (
          <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm shadow-sm">
            <MapPin className="h-3 w-3" />
            {distance.toFixed(0)} km
          </div>
        )}
      </div>

      <CardContent className="p-4 flex flex-col flex-grow">
        <h3 className="font-semibold text-lg truncate" title={name}>{name}</h3>
        
        {retailerName && (
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            Sold by <span className="text-blue-600 hover:underline">{retailerName}</span>
          </p>
        )}

        <div className="mt-auto">
          {/* Delivery Date Display (Only if stock > 0) */}
          {deliveryDate && stock !== 0 && (
             <div className="flex items-center gap-1.5 mb-3 text-xs text-emerald-700 bg-emerald-50 p-1.5 rounded w-fit">
                <Calendar className="h-3 w-3" />
                <span>Available by {deliveryDate}</span>
             </div>
          )}

          <div className="flex items-baseline justify-between mb-2">
            <p className="text-primary font-bold text-xl">₹{price}</p>
            {stockDisplay}
          </div>
          
          <Button 
            className="w-full" 
            onClick={handleAddToCartClick}
            disabled={stock === 0}
            variant={stock === 0 ? "secondary" : "default"}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;