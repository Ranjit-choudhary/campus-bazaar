// =========================
// Importing All Theme Images
// =========================

// Movies
import harryPotterImage from '@/assets/theme-harry-potter.jpg';

// TV Series
import breakingBadImage from '@/assets/theme-breaking-bad.jpg';

// Anime & Manga
import animeImage from '@/assets/theme-anime.jpg';

// Natural Aesthetics
import naturalImage from '@/assets/theme-natural.jpg';

// Motivational
import motivationImage from '@/assets/theme-motivation.jpg';

// Travel & Cityscapes
import travelImage from '@/assets/theme-travel.jpeg';

// Music & Concerts
import musicImage from '@/assets/theme-music.jpeg';

// Gaming & Esports
import gamingImage from '@/assets/theme-gaming.jpeg';

// Sports (Motivational-ish)
import sportsImage from '@/assets/theme-sports.jpeg';

// Art (You placed this under Fantasy Worlds)
import artImage from '@/assets/theme-art.jpg';

// Science & Tech
import technologyImage from '@/assets/theme-technology.jpg';

// Minimalist
import minimalistImage from '@/assets/theme-minimalist.jpg';

// Retro & Vintage
import retroImage from '@/assets/theme-retro.jpeg';


// =========================
// Category Type
// =========================

export type ThemeCategory = 
  | 'Movies' 
  | 'TV Series' 
  | 'Gaming & Esports' 
  | 'Motivational' 
  | 'Anime & Manga' 
  | 'Natural Aesthetics' 
  | 'Science & Tech' 
  | 'Minimalist' 
  | 'Music & Concerts' 
  | 'Fantasy Worlds' 
  | 'Gothic & Dark' 
  | 'Travel & Cityscapes'
  | 'Retro & Vintage';


// =========================
// Theme Interface
// =========================

export interface Theme {
  id: string;
  name: string;
  image: string;
  backgroundColor?: string;
  description: string;
  category: ThemeCategory;
}


// =========================
// Themes Array (13 Items)
// =========================

export const themes: Theme[] = [
  // 1. Movies
  {
    id: 'category-movies',
    name: 'Movies',
    image: harryPotterImage,
    backgroundColor: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    description: 'Cinematic universes, blockbusters, and classic film aesthetics.',
    category: 'Movies',
  },

  // 2. TV Series
  {
    id: 'category-tv-series',
    name: 'TV Series',
    image: breakingBadImage,
    backgroundColor: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
    description: 'Binge-worthy shows, sitcoms, and dramatic series decor.',
    category: 'TV Series',
  },

  // 3. Motivational
  {
    id: 'category-motivation',
    name: 'Motivation',
    image: motivationImage,
    backgroundColor: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    description: 'Quotes, hustle culture, and productivity-focused designs.',
    category: 'Motivational',
  },

  // 4. Travel
  {
    id: 'category-travel',
    name: 'Travel',
    image: travelImage,
    backgroundColor: 'linear-gradient(135deg, #00FFFF 0%, #00BFFF 100%)',
    description: 'Wanderlust, cityscapes, maps, and landmarks from around the world.',
    category: 'Travel & Cityscapes',
  },

  // 5. Music
  {
    id: 'category-music',
    name: 'Music',
    image: musicImage,
    backgroundColor: 'linear-gradient(135deg, #DDA0DD 0%, #BA55D3 100%)',
    description: 'Bands, instruments, album art, and concert vibes.',
    category: 'Music & Concerts',
  },

  // 6. Gaming
  {
    id: 'category-gaming',
    name: 'Gaming',
    image: gamingImage,
    backgroundColor: 'linear-gradient(135deg, #4169E1 0%, #191970 100%)',
    description: 'Esports, retro consoles, and gamer setups.',
    category: 'Gaming & Esports',
  },

  // 7. Anime
  {
    id: 'category-anime',
    name: 'Anime',
    image: animeImage,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    description: 'Japanese animation, manga art, and kawaii aesthetics.',
    category: 'Anime & Manga',
  },

  // 8. Nature
  {
    id: 'category-nature',
    name: 'Nature',
    image: naturalImage,
    backgroundColor: 'linear-gradient(135deg, #8BC34A 0%, #4CAF50 100%)',
    description: 'Plants, landscapes, botanical prints, and earthy tones.',
    category: 'Natural Aesthetics',
  },

  // 9. Sports
  {
    id: 'category-sports',
    name: 'Sports',
    image: sportsImage,
    backgroundColor: 'linear-gradient(135deg, #FF4500 0%, #FF8C00 100%)',
    description: 'Teams, athletes, stadiums, and athletic inspiration.',
    category: 'Motivational',
  },

  // 10. Art
  {
    id: 'category-art',
    name: 'Art',
    image: artImage,
    backgroundColor: 'linear-gradient(135deg, #FF69B4 0%, #8A2BE2 100%)',
    description: 'Abstract, classical, modern, and street art collections.',
    category: 'Fantasy Worlds', 
  },

  // 11. Technology
  {
    id: 'category-technology',
    name: 'Technology',
    image: technologyImage,
    backgroundColor: 'linear-gradient(135deg, #00BFFF 0%, #1E90FF 100%)',
    description: 'Coding, circuitry, futuristic concepts, and tech innovation.',
    category: 'Science & Tech',
  },

  // 12. Minimalist
  {
    id: 'category-minimalist',
    name: 'Minimalist',
    image: minimalistImage,
    backgroundColor: 'linear-gradient(135deg, #F8F8FF 0%, #ECECEC 100%)',
    description: 'Clean lines, monochrome palettes, and simple elegance.',
    category: 'Minimalist',
  },

  // 13. Retro
  {
    id: 'category-retro',
    name: 'Retro',
    image: retroImage,
    backgroundColor: 'linear-gradient(135deg, #32CD32 0%, #FFD700 100%)',
    description: 'Vintage vibes, 80s neon, and nostalgic aesthetics.',
    category: 'Retro & Vintage',
  },
];


// =========================
// Helper – get theme by ID
// =========================

export const getThemeById = (id: string): Theme | undefined => {
  return themes.find(theme => theme.id === id);
};
