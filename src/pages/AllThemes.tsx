import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import ThemeCard from '@/components/ThemeCard';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const AllThemes = () => {
  const navigate = useNavigate();
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchThemes = async () => {
      const { data, error } = await supabase.from('themes').select('*');
      if (error) {
        console.error('Error fetching themes:', error);
      } else {
        setThemes(data || []);
      }
      setLoading(false);
    };
    fetchThemes();
  }, []);

  const handleThemeClick = (themeId: string) => {
    navigate(`/theme/${themeId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar /> {/* Removed cartItemCount prop */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">All Themes</h1>
                <p className="text-xl text-muted-foreground">
                    Explore our complete collection of room themes.
                </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
            </Button>
        </div>

        {loading ? (
          <p>Loading themes...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {themes.map((theme) => (
              <ThemeCard
                key={theme.id}
                title={theme.name}
                image={theme.image}
                onClick={() => handleThemeClick(theme.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllThemes;
