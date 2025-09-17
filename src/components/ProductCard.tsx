import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  image: string;
  tag?: string;
  onAddToCart: () => void;
}

const ProductCard = ({ id, name, price, image, tag, onAddToCart }: ProductCardProps) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/product/${id}`);
  };

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart();
  };

  return (
    <Card className="overflow-hidden cursor-pointer group" onClick={handleCardClick}>
      <div className="relative">
        <img src={image} alt={name} className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        {tag && (
          <Badge className="absolute top-2 right-2" variant={tag === 'hot' ? 'destructive' : 'default'}>
            {tag.charAt(0).toUpperCase() + tag.slice(1)}
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg truncate">{name}</h3>
        <p className="text-primary font-bold mt-2">₹{price}</p>
        <Button className="w-full mt-4" onClick={handleAddToCartClick}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProductCard;