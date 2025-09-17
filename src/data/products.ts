export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  category: string;
  theme?: string;
  inStock: boolean;
}

// Mock product data for demonstration
export const products: Product[] = [
  {
    id: '1',
    name: 'Hogwarts House Banner Set',
    price: 599,
    description: 'Complete set of all four Hogwarts house banners for your dorm room',
    images: ['/placeholder.svg'],
    category: 'posters',
    theme: 'harry-potter',
    inStock: true
  },
  {
    id: '2',
    name: 'Breaking Bad Periodic Table Poster',
    price: 299,
    description: 'High-quality poster featuring the iconic Breaking Bad periodic table',
    images: ['/placeholder.svg'],
    category: 'posters',
    theme: 'breaking-bad',
    inStock: true
  },
  {
    id: '3',
    name: 'Anime Character Bedsheet Set',
    price: 899,
    description: 'Soft cotton bedsheet set with popular anime character designs',
    images: ['/placeholder.svg'],
    category: 'bedsheets',
    theme: 'anime',
    inStock: true
  },
  {
    id: '4',
    name: 'Natural Bamboo Plant Collection',
    price: 449,
    description: 'Set of artificial bamboo plants for a natural room aesthetic',
    images: ['/placeholder.svg'],
    category: 'artificial-plants',
    theme: 'natural-aesthetics',
    inStock: true
  },
  {
    id: '5',
    name: 'Campus Bazaar Stationery Kit',
    price: 199,
    description: 'Complete stationery kit with notebooks, pens, and organizers',
    images: ['/placeholder.svg'],
    category: 'stationery',
    inStock: true
  },
  {
    id: '6',
    name: 'Harry Potter Magic Wand Collection',
    price: 799,
    description: 'Replica magic wands from the Harry Potter series',
    images: ['/placeholder.svg'],
    category: 'others',
    theme: 'harry-potter',
    inStock: true
  },
  {
    id: '7',
    name: 'Aesthetic LED String Lights',
    price: 349,
    description: 'Warm white LED string lights for cozy room ambiance',
    images: ['/placeholder.svg'],
    category: 'lighting',
    inStock: true
  },
  {
    id: '8',
    name: 'Anime Themed Water Bottle',
    price: 249,
    description: 'Insulated water bottle with anime character designs',
    images: ['/placeholder.svg'],
    category: 'water-bottles',
    theme: 'anime',
    inStock: true
  }
];

export const getProductsByTheme = (themeId: string): Product[] => {
  return products.filter(product => product.theme === themeId);
};

export const getFeaturedProducts = (): Product[] => {
  return products.slice(0, 8);
};