import { useState, useEffect, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, limit, getDocs, addDoc, serverTimestamp, orderBy, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Product, Review } from '../types';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Star, ShoppingCart, Truck, RefreshCcw, ShieldCheck, ChevronRight, ChevronLeft, Send } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useSettings } from '../contexts/SettingsContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';
import { motion } from 'motion/react';
import ProductCard from '../components/ProductCard';
import { toast } from 'sonner';

export default function ProductDetail() {
  const { settings } = useSettings();
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const { addToCart } = useCart();

  const fetchReviews = async () => {
    if (!id) return;
    try {
      const q = query(
        collection(db, 'reviews'), 
        where('productId', '==', id),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as Review)));
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Product;
          setProduct(data);
          if (data.variants && data.variants.length > 0) {
            setSelectedSize(data.variants[0].size);
            setSelectedColor(data.variants[0].color);
          }
          
          // Fetch related products
          const q = query(collection(db, 'products'), where('category', '==', data.category), limit(4));
          const relatedSnap = await getDocs(q);
          setRelatedProducts(relatedSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as Product))
            .filter(p => p.id !== id)
          );

          fetchReviews();
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
    window.scrollTo(0, 0);
  }, [id]);

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error('Please login to write a review');
      return;
    }
    if (!newReview.comment) return;

    setReviewLoading(true);
    try {
      const reviewData = {
        productId: id,
        userName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Anonymous',
        rating: newReview.rating,
        comment: newReview.comment,
        status: 'approved', // Auto-approve for now
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'reviews'), reviewData);
      
      // Update product rating (simple average approximation)
      if (product) {
        const newReviewCount = product.reviewCount + 1;
        const newRating = ((product.rating * product.reviewCount) + newReview.rating) / newReviewCount;
        await updateDoc(doc(db, 'products', id!), {
          rating: Number(newRating.toFixed(1)),
          reviewCount: newReviewCount
        });
        setProduct(prev => prev ? { ...prev, rating: Number(newRating.toFixed(1)), reviewCount: newReviewCount } : null);
      }

      setNewReview({ rating: 5, comment: '' });
      fetchReviews();
      toast.success('Review submitted successfully!');
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error('Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold">Product not found</h2>
        <Link to="/products">
          <Button className="mt-4">Back to Shop</Button>
        </Link>
      </div>
    );
  }

  const discount = product.compareAtPrice 
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) 
    : 0;

  const selectedVariant = product?.variants?.find(v => v.size === selectedSize && v.color === selectedColor);
  const currentPrice = selectedVariant?.price || product?.price || 0;
  const currentStock = selectedVariant ? selectedVariant.stock : (product?.stockQuantity || 0);

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link to="/" className="hover:text-primary">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/products" className="hover:text-primary">Shop</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to={`/products?category=${product.category}`} className="hover:text-primary">{product.category}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium truncate">{product.title}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted">
            <img 
              src={product.images[selectedImage] || 'https://picsum.photos/seed/clothing/800/1000'} 
              alt={product.title} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {currentStock <= 0 && !product.continueSellingOutOfStock && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                <Badge variant="destructive" className="text-2xl py-2 px-6 font-bold shadow-xl">SOLD OUT</Badge>
              </div>
            )}
            {discount > 0 && currentStock > 0 && (
              <Badge className="absolute top-6 left-6 bg-destructive text-destructive-foreground px-4 py-1 text-lg">
                -{discount}%
              </Badge>
            )}
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 max-w-full">
            {product.images.map((img, i) => (
              <button 
                key={i} 
                onClick={() => setSelectedImage(i)}
                className={`relative w-24 aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                  selectedImage === i ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`${product.title} ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="uppercase tracking-widest">{product.category}</Badge>
              {currentStock > 0 ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">In Stock ({currentStock})</Badge>
              ) : (
                <Badge variant="destructive">Out of Stock</Badge>
              )}
            </div>
            <h1 className="text-4xl font-bold tracking-tighter leading-tight">{product.title}</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {Array(5).fill(0).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`} />
                ))}
                <span className="text-sm font-medium ml-1">{product.rating} ({product.reviewCount} reviews)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {product.compareAtPrice ? (
              <>
                <span className="text-4xl font-bold">{settings.currency} {currentPrice}</span>
                <span className="text-xl text-muted-foreground line-through">{settings.currency} {product.compareAtPrice}</span>
              </>
            ) : (
              <span className="text-4xl font-bold">{settings.currency} {currentPrice}</span>
            )}
          </div>

          <div className="text-muted-foreground leading-relaxed prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} />

          <div className="space-y-6 pt-4">
            {product.hasVariants && (
              <>
                <div className="space-y-3">
                  <label className="text-sm font-bold uppercase tracking-widest">Select Size</label>
                  <div className="flex flex-wrap gap-3">
                    {Array.from(new Set(product.variants.map(v => v.size))).map(size => (
                      <button 
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`h-12 w-12 rounded-full border-2 flex items-center justify-center font-bold transition-all ${
                          selectedSize === size ? 'border-primary bg-primary text-primary-foreground' : 'border-muted hover:border-primary'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold uppercase tracking-widest">Select Color</label>
                  <div className="flex flex-wrap gap-3">
                    {Array.from(new Set(product.variants.filter(v => v.size === selectedSize).map(v => v.color))).map(color => (
                      <button 
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`px-6 py-2 rounded-full border-2 font-medium transition-all ${
                          selectedColor === color ? 'border-primary bg-primary text-primary-foreground' : 'border-muted hover:border-primary'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center gap-4 pt-4">
              <div className="flex items-center border rounded-full px-4 py-2">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 hover:text-primary">-</button>
                <span className="w-12 text-center font-bold">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="p-2 hover:text-primary">+</button>
              </div>
              <Button 
                size="lg" 
                className="flex-grow rounded-full h-14 text-lg font-bold gap-2"
                disabled={currentStock <= 0 && !product.continueSellingOutOfStock}
                onClick={() => addToCart({ ...product, price: currentPrice }, quantity, selectedSize, selectedColor)}
              >
                {currentStock <= 0 && !product.continueSellingOutOfStock ? (
                  'Sold Out'
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5" /> Add to Cart
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t">
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-muted rounded-lg"><Truck className="h-4 w-4" /></div>
              <span>Free Delivery</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-muted rounded-lg"><RefreshCcw className="h-4 w-4" /></div>
              <span>30-Day Returns</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-muted rounded-lg"><ShieldCheck className="h-4 w-4" /></div>
              <span>Secure Checkout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="mt-20">
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 gap-8">
            <TabsTrigger value="description" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-4 text-lg font-bold">Description</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-4 text-lg font-bold">Reviews ({product.reviewCount})</TabsTrigger>
            <TabsTrigger value="shipping" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-4 text-lg font-bold">Shipping</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="py-8 text-muted-foreground leading-relaxed max-w-3xl">
            <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} />
          </TabsContent>
          <TabsContent value="reviews" className="py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-8">
                <h3 className="text-xl font-bold">Customer Reviews ({reviews.length})</h3>
                {reviews.length === 0 ? (
                  <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
                ) : (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="p-6 bg-muted/50 rounded-2xl space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold">{review.userName}</p>
                            <div className="flex gap-1 mt-1">
                              {Array(5).fill(0).map((_, j) => (
                                <Star key={j} className={`h-3 w-3 ${j < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`} />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : 'Just now'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <Card className="p-6 rounded-3xl border-none shadow-lg bg-card">
                  <h3 className="text-xl font-bold mb-4">Write a Review</h3>
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Rating</Label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                            className="focus:outline-none"
                          >
                            <Star className={`h-6 w-6 ${star <= newReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Your Review</Label>
                      <textarea
                        className="w-full min-h-[120px] p-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                        placeholder="Share your experience..."
                        value={newReview.comment}
                        onChange={e => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={reviewLoading} 
                      className="w-full rounded-full h-12 font-bold gap-2"
                    >
                      {reviewLoading ? 'Submitting...' : <><Send className="h-4 w-4" /> Submit Review</>}
                    </Button>
                  </form>
                </Card>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="shipping" className="py-8 text-muted-foreground">
            <p>We offer worldwide shipping. Orders are typically processed within 1-2 business days.</p>
            <p className="mt-2">Standard Shipping: 5-7 business days</p>
            <p>Express Shipping: 2-3 business days</p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-20">
          <h2 className="text-3xl font-bold tracking-tighter mb-10">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
