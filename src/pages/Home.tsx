import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, limit, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowRight, Truck, ShieldCheck, RefreshCcw, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Skeleton } from '../components/ui/skeleton';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (settings.sliderAutoplay && settings.banners.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % settings.banners.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [settings.sliderAutoplay, settings.banners.length]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(8));
        const snapshot = await getDocs(q);
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setFeaturedProducts(products);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const categories = [
    { name: 'Tracksuits', image: 'https://picsum.photos/seed/tracksuit/800/1000', path: '/products?category=Tracksuits' },
    { name: 'Trousers', image: 'https://picsum.photos/seed/trousers/800/1000', path: '/products?category=Trousers' },
    { name: 'T-Shirts', image: 'https://picsum.photos/seed/tshirt/800/1000', path: '/products?category=T-Shirts' },
  ];

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center overflow-hidden bg-black">
        {settings.banners.length > 0 ? (
          <div className="absolute inset-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="absolute inset-0"
              >
                <img 
                  src={settings.banners[currentSlide].imageUrl} 
                  alt={settings.banners[currentSlide].caption} 
                  className="w-full h-full object-cover brightness-50"
                  referrerPolicy="no-referrer"
                />
                <div className="container mx-auto px-4 absolute inset-0 flex items-center z-10 text-white">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="max-w-2xl space-y-6"
                  >
                    <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm uppercase tracking-widest">
                      {settings.tagline}
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight uppercase">
                      {settings.banners[currentSlide].caption || settings.homepageHeading}
                    </h1>
                    <p className="text-lg md:text-xl text-gray-200 max-w-lg">
                      {settings.homepageSubheading}
                    </p>
                    <div className="flex flex-wrap gap-4 pt-4">
                      <Link to={settings.banners[currentSlide].buttonLink || "/products"}>
                        <Button size="lg" className="px-8 text-lg font-bold">
                          {settings.banners[currentSlide].buttonText || "Shop Now"}
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
            
            {settings.banners.length > 1 && (
              <>
                <button 
                  onClick={() => setCurrentSlide(prev => (prev - 1 + settings.banners.length) % settings.banners.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button 
                  onClick={() => setCurrentSlide(prev => (prev + 1) % settings.banners.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                  {settings.banners.map((_, i) => (
                    <button 
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={cn(
                        "h-1.5 transition-all rounded-full",
                        currentSlide === i ? "w-8 bg-primary" : "w-2 bg-white/30"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="absolute inset-0 z-0">
              <img 
                src="https://picsum.photos/seed/fashion-hero/1920/1080" 
                alt="Hero" 
                className="w-full h-full object-cover brightness-50"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="container mx-auto px-4 relative z-10 text-white">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="max-w-2xl space-y-6"
              >
                <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm uppercase tracking-widest">{settings.tagline}</Badge>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight">
                  {settings.homepageHeading}
                </h1>
                <p className="text-lg md:text-xl text-gray-200 max-w-lg">
                  {settings.homepageSubheading}
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <Link to="/products">
                    <Button size="lg" className="px-8 text-lg font-bold">Shop Now</Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: <Truck className="h-8 w-8" />, title: "Free Shipping", desc: `On orders over ${settings.currency} 100` },
            { icon: <ShieldCheck className="h-8 w-8" />, title: "Secure Payment", desc: "100% secure checkout" },
            { icon: <RefreshCcw className="h-8 w-8" />, title: "Easy Returns", desc: "30-day return policy" },
            { icon: <Zap className="h-8 w-8" />, title: "Fast Delivery", desc: "Worldwide shipping" },
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center text-center space-y-2"
            >
              <div className="p-4 rounded-full bg-muted text-primary mb-2">
                {feature.icon}
              </div>
              <h3 className="font-bold">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Categories Section */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-10">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter">Shop by Category</h2>
            <p className="text-muted-foreground">Explore our curated fashion categories</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((cat, i) => (
            <Link key={cat.name} to={cat.path} className="group relative aspect-[4/5] overflow-hidden rounded-2xl">
              <img 
                src={cat.image} 
                alt={cat.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
                <h3 className="text-3xl font-bold text-white mb-2">{cat.name}</h3>
                <div className="flex items-center text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Explore Collection <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-10">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter">Featured Products</h2>
            <p className="text-muted-foreground">Our best-selling pieces this season</p>
          </div>
          <Link to="/products">
            <Button variant="ghost" className="gap-2">View All <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/5] w-full rounded-xl" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))
          ) : featuredProducts.length > 0 ? (
            featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-full text-center py-20 bg-muted rounded-2xl">
              <p className="text-muted-foreground">No products found. Please add products in the admin panel.</p>
              <Link to="/admin">
                <Button className="mt-4">Go to Admin</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Promo Banner */}
      <section className="container mx-auto px-4">
        <div className="relative rounded-3xl overflow-hidden bg-primary text-primary-foreground p-12 md:p-20 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-6 max-w-xl text-center md:text-left">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter">GET 20% OFF YOUR FIRST ORDER</h2>
            <p className="text-lg opacity-90">Join our newsletter and stay updated with the latest drops, exclusive offers, and fashion tips.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-6 py-3 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 flex-grow"
              />
              <Button size="lg" variant="secondary" className="rounded-full px-8">Subscribe</Button>
            </div>
          </div>
          <div className="relative w-64 h-64 md:w-80 md:h-80">
            <div className="absolute inset-0 bg-white/10 rounded-full animate-pulse" />
            <img 
              src="https://picsum.photos/seed/promo/500/500" 
              alt="Promo" 
              className="rounded-full w-full h-full object-cover border-4 border-white/20"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
