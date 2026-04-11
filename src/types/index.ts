export interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  vendor: string;
  
  // Media
  images: string[];
  youtubeUrl?: string;
  
  // Pricing
  price: number;
  compareAtPrice?: number;
  costPerItem?: number;
  
  // Inventory
  sku: string;
  stockQuantity: number;
  trackInventory: boolean;
  continueSellingOutOfStock: boolean;
  
  // Variants
  hasVariants: boolean;
  variants: ProductVariant[];
  
  // Shipping
  weight?: number;
  isPhysical: boolean;
  shippingCost?: number;
  
  // SEO
  seoTitle?: string;
  seoDescription?: string;
  slug: string;
  
  // Organization
  tags: string[];
  collections: string[];
  status: 'Draft' | 'Active';
  
  // Metadata
  rating: number;
  reviewCount: number;
  createdAt: any;
}

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  price: number;
  sku: string;
  stock: number;
  image?: string;
}

export interface CartItem extends Product {
  quantity: number;
  selectedSize: string;
  selectedColor: string;
}

export interface Order {
  id?: string;
  orderNumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  items: CartItem[];
  totalAmount: number;
  status: 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentMethod: 'COD';
  createdAt: any;
}

export interface Review {
  id?: string;
  productId: string;
  userName: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved';
  createdAt: any;
}

export interface StoreSettings {
  // General
  storeName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  currency: string;

  // Branding
  logoUrl: string;
  faviconUrl: string;
  logoSize: 'small' | 'medium' | 'large';

  // Homepage Design
  banners: Banner[];
  sliderAutoplay: boolean;
  announcementBar: {
    enabled: boolean;
    text: string;
    link: string;
  };
  homepageHeading: string;
  homepageSubheading: string;

  // Theme & Appearance
  themeColor: string;
  secondaryColor: string;
  fontFamily: string;
  buttonStyle: 'rounded' | 'square';
  darkMode: boolean;

  // Navigation
  headerMenu: MenuItem[];
  footerMenu: MenuItem[];

  // Ads
  adsenseCode: string;
  headerAdEnabled: boolean;
  footerAdEnabled: boolean;
  inPageAdEnabled: boolean;

  // Social Media
  socialLinks: {
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  };

  // Advanced
  footerText: string;
  newsletterBlock: {
    enabled: boolean;
    title: string;
    description: string;
    buttonText: string;
    imageUrl: string;
    backgroundColor: string;
    textColor: string;
  };
  defaultSeoTitle: string;
  defaultSeoDescription: string;
  trackingCode: string;
  features: {
    reviews: boolean;
    wishlist: boolean;
  };
}

export interface Banner {
  id: string;
  imageUrl: string;
  caption: string;
  buttonText: string;
  buttonLink: string;
}

export interface MenuItem {
  id: string;
  label: string;
  path: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  createdAt: any;
}

export interface StandardPage {
  id?: string;
  title: string;
  content: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  status: 'Draft' | 'Published';
  createdAt: any;
}
