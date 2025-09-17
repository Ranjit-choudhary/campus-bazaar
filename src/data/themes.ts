import harryPotterImage from '@/assets/theme-harry-potter.jpg';
import breakingBadImage from '@/assets/theme-breaking-bad.jpg';
import animeImage from '@/assets/theme-anime.jpg';
import naturalImage from '@/assets/theme-natural.jpg';

export interface Theme {
  id: string;
  name: string;
  image: string;
  backgroundColor?: string;
  description: string;
}

export const themes: Theme[] = [
  {
    id: 'harry-potter',
    name: 'Harry Potter',
    image: harryPotterImage,
    backgroundColor: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    description: 'Magical Hogwarts-inspired decor for wizarding world fans'
  },
  {
    id: 'breaking-bad',
    name: 'Breaking Bad',
    image: breakingBadImage,
    backgroundColor: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
    description: 'Chemistry lab aesthetic with periodic table elements'
  },
  {
    id: 'anime',
    name: 'Anime',
    image: animeImage,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    description: 'Vibrant Japanese culture and manga-inspired designs'
  },
  {
    id: 'natural-aesthetics',
    name: 'Natural Aesthetics',
    image: naturalImage,
    backgroundColor: 'linear-gradient(135deg, #8BC34A 0%, #4CAF50 100%)',
    description: 'Earth tones, plants, and sustainable bohemian decor'
  },
  {
    id: 'vampire-diaries',
    name: 'Vampire Diaries',
    image: naturalImage, // Placeholder for now
    backgroundColor: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b69 100%)',
    description: 'Dark, gothic aesthetic with mystical vampire elements'
  },
  {
    id: 'marvel',
    name: 'Marvel',
    image: animeImage, // Placeholder for now
    backgroundColor: 'linear-gradient(135deg, #e53e3e 0%, #3182ce 100%)',
    description: 'Superhero-themed decor for Marvel universe fans'
  }
];

export const getThemeById = (id: string): Theme | undefined => {
  return themes.find(theme => theme.id === id);
};