import { Badge } from './ui/badge';

interface ThemeCardProps {
  title: string;
  image: string;
  tag?: string;
  onClick: () => void;
}

const ThemeCard = ({ title, image, tag, onClick }: ThemeCardProps) => {
  return (
    <div 
      className="theme-card group"
      onClick={onClick}
    >
      <div className="relative overflow-hidden">
        <img 
          src={image} 
          alt={title}
          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
        />
        {tag && (
          <Badge className="absolute top-2 right-2" variant={tag === 'hot' ? 'destructive' : 'default'}>
            {tag.charAt(0).toUpperCase() + tag.slice(1)}
          </Badge>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-white text-xl font-semibold">{title}</h3>
        </div>
      </div>
    </div>
  );
};

export default ThemeCard;