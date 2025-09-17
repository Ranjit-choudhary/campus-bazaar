import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-dorm-room.jpg';

interface HeroSectionProps {
  onExploreThemes: () => void;
}

const HeroSection = ({ onExploreThemes }: HeroSectionProps) => {
  return (
    <div className="relative h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          Your Vibe, Your Space
        </h1>
        <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
          Curated room decor themes for every fan. Transform your dorm into your dream space.
        </p>
        
        <Button 
          className="hero-button text-lg px-8 py-4"
          onClick={onExploreThemes}
        >
          Explore Themes
        </Button>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
};

export default HeroSection;