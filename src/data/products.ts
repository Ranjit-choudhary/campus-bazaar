export interface Retailer {
  id: string;
  name: string;
  email: string;
  description: string;
  rating: number;
  city: string;
  address: string; // Added address field
}

// Updated Retailers with Hardcoded Addresses
export const retailers: Retailer[] = [
  { 
    id: 'ret-1', 
    name: 'Campus Decor Co.', 
    email: 'madeeksuk468@gmail.com', 
    description: 'General dorm essentials and basics.', 
    rating: 4.5,
    city: 'Hyderabad',
    address: 'Plot 101, Jubilee Hills, Hyderabad, Telangana 500033'
  },
  { 
    id: 'ret-2', 
    name: 'The Nerd Nook', 
    email: 'f20230524@hyderabad.bits-pilani.ac.in', 
    description: 'Specialized in pop-culture and fandom merch.', 
    rating: 4.8,
    city: 'Bengaluru',
    address: '3156, 12th Main Rd, HAL 2nd Stage, Defence Colony, Domlur, Bengaluru, Karnataka 560008'
  },
  { 
    id: 'ret-3', 
    name: 'Aesthetic Living', 
    email: 'f20231226@hyderabad.bits-pilani.ac.in', 
    description: 'Boho, minimalist, and plant-based decor.', 
    rating: 4.2,
    city: 'Delhi',
    address: 'Shop Number 13, Central Market, Lajpat Nagar, New Delhi 110065'
  },
  { 
    id: 'ret-4', 
    name: 'Geek Galaxy', 
    email: 'f20231385@hyderabad.bits-pilani.ac.in', 
    description: 'Hardcore gaming and sci-fi collectibles.', 
    rating: 4.7,
    city: 'Mumbai',
    address: 'Linking Road, Bandra West, Mumbai, Maharashtra 400050'
  },
  { 
    id: 'ret-5', 
    name: 'Retro Rewind', 
    email: 'notrishabhsingh18117@gmail.com', 
    description: 'Vintage posters and classic music memorabilia.', 
    rating: 4.6,
    city: 'Chennai',
    address: '7, Pattullos Rd, Express Estate, Thousand Lights, Chennai, Tamil Nadu 600014'
  },
];

// ... keep the rest of the file (Product interface, products array, helpers) exactly as is ...
export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  category: string; 
  theme: string;    
  retailerId: string;
  stock: number;      
}

// Helper to get random retailer
const getRandomRetailer = () => retailers[Math.floor(Math.random() * retailers.length)].id;

// 2. MOVIE PRODUCTS (Keep your existing array)
const movieProducts: Product[] = [
    // ... keep existing movieProducts ...
    // (I am omitting the full list to save space, but keep your existing data here)
    {
        id: 'mov-hp-1',
        name: 'Hogwarts House Mug Set',
        price: 899,
        description: 'Set of 4 ceramic mugs featuring Gryffindor, Slytherin, Ravenclaw, and Hufflepuff crests.',
        images: ['/placeholder.svg'],
        category: 'mugs',
        theme: 'category-movies',
        retailerId: 'ret-2', 
        stock: 25
      },
      // ... rest of your items
];

// 3. Generate Placeholder products
const categories = [
  'category-tv-series', 'category-motivation', 
  'category-travel', 'category-music', 'category-gaming', 
  'category-anime', 'category-nature', 'category-sports', 
  'category-art', 'category-technology', 'category-minimalist', 
  'category-retro'
];

const generatedProducts: Product[] = [];

categories.forEach((catId) => {
  for (let i = 1; i <= 20; i++) {
    const catName = catId.replace('category-', '').charAt(0).toUpperCase() + catId.slice(10);
    generatedProducts.push({
      id: `${catId}-${i}`,
      name: `${catName} Item #${i}`,
      price: Math.floor(Math.random() * 1000) + 199, 
      description: `A high-quality ${catName.toLowerCase()} themed item perfect for your dorm.`,
      images: ['/placeholder.svg'],
      category: 'general',
      theme: catId,
      retailerId: getRandomRetailer(),
      stock: Math.floor(Math.random() * 50)
    });
  }
});

export const products: Product[] = [...movieProducts, ...generatedProducts];

export const getProductsByTheme = (themeId: string): Product[] => {
  return products.filter(product => product.theme === themeId);
};

export const getFeaturedProducts = (): Product[] => {
  return products.filter(p => p.stock > 0).slice(0, 8);
};

export const getRetailerById = (id: string): Retailer | undefined => {
  return retailers.find(r => r.id === id);
};

export const getProductsByRetailerEmail = (email: string): Product[] => {
  const retailer = retailers.find(r => r.email === email);
  if (!retailer) return [];
  return products.filter(p => p.retailerId === retailer.id);
};