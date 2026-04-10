import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit, startAfter, QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useSettings } from '../contexts/SettingsContext';
import { Skeleton } from '../components/ui/skeleton';
import { Filter, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';

export default function Products() {
  const { settings } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('latest');
  const [priceRange, setPriceRange] = useState('all');
  
  const PRODUCTS_PER_PAGE = 12;

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let constraints: QueryConstraint[] = [];
        
        if (categoryFilter) {
          constraints.push(where('category', '==', categoryFilter));
        }

        if (sortBy === 'price-low') {
          constraints.push(orderBy('price', 'asc'));
        } else if (sortBy === 'price-high') {
          constraints.push(orderBy('price', 'desc'));
        } else {
          constraints.push(orderBy('createdAt', 'desc'));
        }

        constraints.push(limit(PRODUCTS_PER_PAGE));

        const q = query(collection(db, 'products'), ...constraints);
        const snapshot = await getDocs(q);
        const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        
        // Client-side price filtering (Firestore doesn't support range + order well without indexes)
        let filtered = fetchedProducts;
        if (priceRange === 'under-50') filtered = fetchedProducts.filter(p => p.price < 50);
        else if (priceRange === '50-100') filtered = fetchedProducts.filter(p => p.price >= 50 && p.price <= 100);
        else if (priceRange === 'over-100') filtered = fetchedProducts.filter(p => p.price > 100);

        setProducts(filtered);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [categoryFilter, sortBy, priceRange]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter">
            {categoryFilter ? categoryFilter : 'All Products'}
          </h1>
          <p className="text-muted-foreground">Showing {products.length} products</p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Sheet>
            <SheetTrigger render={
              <Button variant="outline" className="md:hidden flex-grow">
                <Filter className="mr-2 h-4 w-4" /> Filters
              </Button>
            } />
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="py-6 space-y-6">
                <div className="space-y-2">
                  <h4 className="font-medium">Category</h4>
                  <div className="flex flex-col gap-2">
                    {['All', ...settings.headerMenu.map(m => m.label)].map(cat => (
                      <Button 
                        key={cat} 
                        variant={categoryFilter === cat || (!categoryFilter && cat === 'All') ? 'default' : 'ghost'} 
                        className="justify-start"
                        onClick={() => setSearchParams(cat === 'All' ? {} : { category: cat })}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Price Range</h4>
                  <Select value={priceRange} onValueChange={setPriceRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Prices</SelectItem>
                      <SelectItem value="under-50">Under {settings.currency} 50</SelectItem>
                      <SelectItem value="50-100">{settings.currency} 50 - {settings.currency} 100</SelectItem>
                      <SelectItem value="over-100">Over {settings.currency} 100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Sort By</h4>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">Latest Arrivals</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="hidden md:flex items-center gap-4">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest Arrivals</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden md:block space-y-8">
          <div className="space-y-4">
            <h3 className="font-bold flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Categories
            </h3>
            <div className="flex flex-col gap-1">
              {['All', ...settings.headerMenu.map(m => m.label)].map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSearchParams(cat === 'All' ? {} : { category: cat })}
                  className={`text-left py-1 text-sm transition-colors ${
                    categoryFilter === cat || (!categoryFilter && cat === 'All') 
                    ? 'font-bold text-primary' 
                    : 'text-muted-foreground hover:text-primary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold">Price Range</h3>
            <div className="flex flex-col gap-2">
              {[
                { label: 'All Prices', value: 'all' },
                { label: `Under ${settings.currency} 50`, value: 'under-50' },
                { label: ` ${settings.currency} 50 - ${settings.currency} 100`, value: '50-100' },
                { label: `Over ${settings.currency} 100`, value: 'over-100' },
              ].map(range => (
                <label key={range.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="radio" 
                    name="price" 
                    checked={priceRange === range.value}
                    onChange={() => setPriceRange(range.value)}
                    className="accent-primary"
                  />
                  {range.label}
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="md:col-span-3">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-[4/5] w-full rounded-xl" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))
            ) : products.length > 0 ? (
              products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full text-center py-20 bg-muted rounded-2xl">
                <p className="text-muted-foreground">No products found in this category.</p>
                <Button variant="link" onClick={() => setSearchParams({})}>Clear all filters</Button>
              </div>
            )}
          </div>

          {/* Pagination */}
          {products.length > 0 && (
            <div className="mt-12 flex justify-center items-center gap-4">
              <Button variant="outline" size="icon" disabled><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium">Page 1 of 1</span>
              <Button variant="outline" size="icon" disabled><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
