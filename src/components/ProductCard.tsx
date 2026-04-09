import { Link } from 'react-router-dom';
import { Product } from '../types';
import { Card, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Star, ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useSettings } from '../contexts/SettingsContext';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: Product;
  key?: string | number;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { settings } = useSettings();
  const { addToCart } = useCart();
  const discount = product.compareAtPrice 
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Card className="group overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 bg-card/50 backdrop-blur-sm">
        <Link to={`/product/${product.id}`}>
          <div className="relative aspect-[4/5] overflow-hidden">
            <img
              src={product.images[0] || 'https://picsum.photos/seed/clothing/800/1000'}
              alt={product.title}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            {product.stockQuantity <= 0 && !product.continueSellingOutOfStock && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                <Badge variant="destructive" className="text-lg py-1 px-4 font-bold shadow-lg">SOLD OUT</Badge>
              </div>
            )}
            {discount > 0 && product.stockQuantity > 0 && (
              <Badge className="absolute top-4 left-4 bg-destructive text-destructive-foreground">
                -{discount}%
              </Badge>
            )}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <Button variant="secondary" size="sm" className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                Quick View
              </Button>
            </div>
          </div>
        </Link>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">{product.category}</p>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium">{product.rating}</span>
            </div>
          </div>
          <Link to={`/product/${product.id}`}>
            <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
              {product.title}
            </h3>
          </Link>
          <div className="mt-2 flex items-center gap-2">
            {product.compareAtPrice ? (
              <>
                <span className="font-bold text-lg">{settings.currency} {product.price}</span>
                <span className="text-sm text-muted-foreground line-through">{settings.currency} {product.compareAtPrice}</span>
              </>
            ) : (
              <span className="font-bold text-lg">{settings.currency} {product.price}</span>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button 
            className="w-full gap-2" 
            variant={product.stockQuantity <= 0 && !product.continueSellingOutOfStock ? "secondary" : "outline"}
            disabled={product.stockQuantity <= 0 && !product.continueSellingOutOfStock}
            onClick={() => addToCart(product, 1, product.variants[0]?.size || 'M', product.variants[0]?.color || 'Black')}
          >
            {product.stockQuantity <= 0 && !product.continueSellingOutOfStock ? (
              'Sold Out'
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
