import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import ThemeCard from '@/components/ThemeCard';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext, PaginationLink, PaginationEllipsis } from '@/components/ui/pagination';

const ITEMS_PER_PAGE = 6; // Set to 6 items per page

const AllThemes = () => {
  const navigate = useNavigate();
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchThemes = async () => {
      // Fetch all themes to handle local pagination
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

  // --- Pagination Logic ---
  const totalPages = Math.ceil(themes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentThemes = themes.slice(startIndex, endIndex);

  const setPageAndScroll = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setPageAndScroll(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setPageAndScroll(currentPage - 1);
    }
  };
  // -------------------------

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
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
          <>
            {/* Theme Grid (showing only current page themes) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentThemes.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  title={theme.name}
                  image={theme.image}
                  onClick={() => handleThemeClick(theme.id)}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="mt-12">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious 
                                    onClick={goToPreviousPage} 
                                    aria-disabled={currentPage === 1}
                                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                                />
                            </PaginationItem>
                            
                            {/* Dynamically generated Page Number Buttons */}
                            {[...Array(totalPages)].map((_, index) => {
                                const page = index + 1;
                                return (
                                    <PaginationItem key={page}>
                                        <PaginationLink
                                            isActive={page === currentPage}
                                            onClick={() => setPageAndScroll(page)}
                                        >
                                            {page}
                                        </PaginationLink>
                                    </PaginationItem>
                                );
                            })}
                            
                            <PaginationItem>
                                <PaginationNext 
                                    onClick={goToNextPage} 
                                    aria-disabled={currentPage === totalPages}
                                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AllThemes;