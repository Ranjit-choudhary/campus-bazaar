export interface Retailer {
  id: string;
  name: string;
  email: string;
  description: string;
  rating: number;
}

// 1. Define your 5 Retailers with your specific emails
export const retailers: Retailer[] = [
  { 
    id: 'ret-1', 
    name: 'Campus Decor Co.', 
    email: 'madeeksuk468@gmail.com', 
    description: 'General dorm essentials and basics.', 
    rating: 4.5 
  },
  { 
    id: 'ret-2', 
    name: 'The Nerd Nook', 
    email: 'f20230524@hyderabad.bits-pilani.ac.in', 
    description: 'Specialized in pop-culture and fandom merch.', 
    rating: 4.8 
  },
  { 
    id: 'ret-3', 
    name: 'Aesthetic Living', 
    email: 'f20231226@hyderabad.bits-pilani.ac.in', 
    description: 'Boho, minimalist, and plant-based decor.', 
    rating: 4.2 
  },
  { 
    id: 'ret-4', 
    name: 'Geek Galaxy', 
    email: 'f20231385@hyderabad.bits-pilani.ac.in', 
    description: 'Hardcore gaming and sci-fi collectibles.', 
    rating: 4.7 
  },
  { 
    id: 'ret-5', 
    name: 'Retro Rewind', 
    email: 'notrishabhsingh18117@gmail.com', 
    description: 'Vintage posters and classic music memorabilia.', 
    rating: 4.6 
  },
];

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

// 2. MOVIE PRODUCTS (23 Specific Items)
const movieProducts: Product[] = [
  // --- Harry Potter ---
  {
    id: 'mov-hp-1',
    name: 'Hogwarts House Mug Set',
    price: 899,
    description: 'Set of 4 ceramic mugs featuring Gryffindor, Slytherin, Ravenclaw, and Hufflepuff crests.',
    images: ['/placeholder.svg'],
    category: 'mugs',
    theme: 'category-movies',
    retailerId: 'ret-2', // The Nerd Nook
    stock: 25
  },
  {
    id: 'mov-hp-2',
    name: 'Marauder\'s Map Tapestry',
    price: 549,
    description: 'Large wall tapestry featuring the full Marauder\'s Map. Mischief Managed.',
    images: ['/placeholder.svg'],
    category: 'decor',
    theme: 'category-movies',
    retailerId: 'ret-2', // The Nerd Nook
    stock: 40
  },
  {
    id: 'mov-hp-3',
    name: 'Floating Candle String Lights',
    price: 699,
    description: 'Battery operated string lights that look like floating candles from the Great Hall.',
    images: ['/placeholder.svg'],
    category: 'lighting',
    theme: 'category-movies',
    retailerId: 'ret-3', // Aesthetic Living
    stock: 15
  },
  {
    id: 'mov-hp-4',
    name: 'Golden Snitch Desk Clock',
    price: 1299,
    description: 'Premium metal clock shaped like the Golden Snitch.',
    images: ['/placeholder.svg'],
    category: 'decor',
    theme: 'category-movies',
    retailerId: 'ret-1', // Campus Decor Co.
    stock: 10
  },
  
  // --- Marvel (MCU) ---
  {
    id: 'mov-mcu-1',
    name: 'Iron Man Arc Reactor Lamp',
    price: 1499,
    description: 'Replica Arc Reactor desk lamp. Proof that Tony Stark has a heart.',
    images: ['/placeholder.svg'],
    category: 'lighting',
    theme: 'category-movies',
    retailerId: 'ret-4', // Geek Galaxy
    stock: 8
  },
  {
    id: 'mov-mcu-2',
    name: 'Spiderman: No Way Home Poster',
    price: 299,
    description: 'High-resolution glossy poster of the friendly neighborhood Spiderman.',
    images: ['/placeholder.svg'],
    category: 'posters',
    theme: 'category-movies',
    retailerId: 'ret-4', // Geek Galaxy
    stock: 120
  },
  {
    id: 'mov-mcu-3',
    name: 'Baby Groot Flower Pot',
    price: 399,
    description: 'Adorable planter shaped like Baby Groot. Perfect for succulents.',
    images: ['/placeholder.svg'],
    category: 'decor',
    theme: 'category-movies',
    retailerId: 'ret-3', // Aesthetic Living
    stock: 60
  },
  {
    id: 'mov-mcu-4',
    name: 'Captain America Shield Rug',
    price: 899,
    description: 'Round rug featuring the iconic Vibranium shield design.',
    images: ['/placeholder.svg'],
    category: 'decor',
    theme: 'category-movies',
    retailerId: 'ret-1', // Campus Decor Co.
    stock: 20
  },

  // --- DC Universe ---
  {
    id: 'mov-dc-1',
    name: 'Batman Neon Bat-Signal',
    price: 1199,
    description: 'Yellow and black LED neon sign of the Bat Symbol.',
    images: ['/placeholder.svg'],
    category: 'lighting',
    theme: 'category-movies',
    retailerId: 'ret-4', // Geek Galaxy
    stock: 12
  },
  {
    id: 'mov-dc-2',
    name: 'Joker "Why So Serious?" Poster',
    price: 299,
    description: 'Dark Knight vintage style poster featuring Heath Ledger\'s Joker.',
    images: ['/placeholder.svg'],
    category: 'posters',
    theme: 'category-movies',
    retailerId: 'ret-5', // Retro Rewind
    stock: 45
  },
  {
    id: 'mov-dc-3',
    name: 'Wonder Woman Shield Pillow',
    price: 499,
    description: 'Soft plush pillow shaped like Wonder Woman\'s shield.',
    images: ['/placeholder.svg'],
    category: 'decor',
    theme: 'category-movies',
    retailerId: 'ret-2', // The Nerd Nook
    stock: 30
  },

  // --- Star Wars ---
  {
    id: 'mov-sw-1',
    name: 'Darth Vader Helmet Alarm Clock',
    price: 999,
    description: 'Digital alarm clock shaped like Vader\'s helmet with breathing sound effects.',
    images: ['/placeholder.svg'],
    category: 'tech',
    theme: 'category-movies',
    retailerId: 'ret-4', // Geek Galaxy
    stock: 18
  },
  {
    id: 'mov-sw-2',
    name: 'Baby Yoda (Grogu) Plushie',
    price: 799,
    description: 'Life-size soft plush toy of The Child from The Mandalorian.',
    images: ['/placeholder.svg'],
    category: 'toys',
    theme: 'category-movies',
    retailerId: 'ret-1', // Campus Decor Co.
    stock: 55
  },
  {
    id: 'mov-sw-3',
    name: 'Lightsaber Chopsticks Pair',
    price: 349,
    description: 'LED light-up chopsticks. Red (Sith) and Blue (Jedi) variants.',
    images: ['/placeholder.svg'],
    category: 'kitchen',
    theme: 'category-movies',
    retailerId: 'ret-2', // The Nerd Nook
    stock: 100
  },
  {
    id: 'mov-sw-4',
    name: 'Millennium Falcon Blueprint Poster',
    price: 249,
    description: 'Detailed technical blueprint poster of the fastest hunk of junk in the galaxy.',
    images: ['/placeholder.svg'],
    category: 'posters',
    theme: 'category-movies',
    retailerId: 'ret-5', // Retro Rewind
    stock: 35
  },

  // --- Interstellar & Sci-Fi ---
  {
    id: 'mov-scifi-1',
    name: 'Gargantua Black Hole Poster',
    price: 399,
    description: 'High-quality print of the black hole from Interstellar.',
    images: ['/placeholder.svg'],
    category: 'posters',
    theme: 'category-movies',
    retailerId: 'ret-3', // Aesthetic Living
    stock: 22
  },
  {
    id: 'mov-scifi-2',
    name: 'Endurance Spacecraft Model',
    price: 1599,
    description: 'Detailed desktop model of the Endurance ship.',
    images: ['/placeholder.svg'],
    category: 'decor',
    theme: 'category-movies',
    retailerId: 'ret-4', // Geek Galaxy
    stock: 5
  },
  {
    id: 'mov-scifi-3',
    name: 'TARS Robot USB Hub',
    price: 899,
    description: 'USB hub shaped like the TARS robot. Adjustable rectangular prism design.',
    images: ['/placeholder.svg'],
    category: 'tech',
    theme: 'category-movies',
    retailerId: 'ret-4', // Geek Galaxy
    stock: 14
  },

  // --- Cult Classics ---
  {
    id: 'mov-cult-1',
    name: 'Pulp Fiction "Dance" Poster',
    price: 299,
    description: 'Classic black and white poster of the iconic dance scene.',
    images: ['/placeholder.svg'],
    category: 'posters',
    theme: 'category-movies',
    retailerId: 'ret-5', // Retro Rewind
    stock: 60
  },
  {
    id: 'mov-cult-2',
    name: 'Fight Club Soap Bar Paperweight',
    price: 199,
    description: 'Resin paperweight shaped like the pink soap bar from Fight Club.',
    images: ['/placeholder.svg'],
    category: 'decor',
    theme: 'category-movies',
    retailerId: 'ret-5', // Retro Rewind
    stock: 40
  },
  {
    id: 'mov-cult-3',
    name: 'Jurassic Park Warning Sign',
    price: 449,
    description: 'Metal wall sign "When Dinosaurs Ruled the Earth".',
    images: ['/placeholder.svg'],
    category: 'decor',
    theme: 'category-movies',
    retailerId: 'ret-2', // The Nerd Nook
    stock: 28
  },
  // --- Pirates of the Caribbean ---
  {
    id: 'mov-potc-1',
    name: 'Black Pearl Ship Model',
    price: 1299,
    description: 'Detailed wooden model of the Black Pearl ship.',
    images: ['/placeholder.svg'],
    category: 'decor',
    theme: 'category-movies',
    retailerId: 'ret-3', // Aesthetic Living
    stock: 10
  },
  {
    id: 'mov-potc-2',
    name: 'Jack Sparrow Compass Replica',
    price: 649,
    description: 'Working replica of the compass that points to what you want most.',
    images: ['/placeholder.svg'],
    category: 'decor',
    theme: 'category-movies',
    retailerId: 'ret-2', // The Nerd Nook
    stock: 15
  }
];

// 3. Generate Placeholder products for OTHER categories (20 each)
const categories = [
  'category-tv-series', 'category-motivation', 
  'category-travel', 'category-music', 'category-gaming', 
  'category-anime', 'category-nature', 'category-sports', 
  'category-art', 'category-technology', 'category-minimalist', 
  'category-retro'
];

const generatedProducts: Product[] = [];

categories.forEach((catId) => {
  // Create 20 generic items per category
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

// Combine manually defined movies and generated items
export const products: Product[] = [...movieProducts, ...generatedProducts];

// --- Helpers ---

export const getProductsByTheme = (themeId: string): Product[] => {
  return products.filter(product => product.theme === themeId);
};

export const getFeaturedProducts = (): Product[] => {
  // Return items that have high stock
  return products
    .filter(p => p.stock > 0)
    .slice(0, 8);
};

export const getRetailerById = (id: string): Retailer | undefined => {
  return retailers.find(r => r.id === id);
};

// Helper to find products by retailer email (useful for dashboard)
export const getProductsByRetailerEmail = (email: string): Product[] => {
  const retailer = retailers.find(r => r.email === email);
  if (!retailer) return [];
  return products.filter(p => p.retailerId === retailer.id);
};