import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { Button } from '../components/ui/button';
import { Trash2, ShoppingBag, ArrowRight, Minus, Plus } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { motion } from 'motion/react';

export default function Cart() {
  const { settings } = useSettings();
  const { cart, removeFromCart, updateQuantity, totalPrice, totalItems } = useCart();

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-8 bg-muted rounded-full">
            <ShoppingBag className="h-16 w-16 text-muted-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tighter">Your cart is empty</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Looks like you haven't added anything to your cart yet. Explore our latest collection and find something you love.
        </p>
        <Link to="/products">
          <Button size="lg" className="px-8">Start Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold tracking-tighter mb-10">Shopping Cart ({totalItems})</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {cart.map((item, i) => (
            <motion.div 
              key={`${item.id}-${item.selectedSize}-${item.selectedColor}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col sm:flex-row gap-6 p-6 bg-card border rounded-3xl"
            >
              <div className="w-full sm:w-32 aspect-[4/5] rounded-2xl overflow-hidden bg-muted flex-shrink-0">
                <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              
              <div className="flex-grow space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Size: <span className="text-foreground font-medium">{item.selectedSize}</span> | 
                      Color: <span className="text-foreground font-medium">{item.selectedColor}</span>
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => removeFromCart(item.id, item.selectedSize, item.selectedColor)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex justify-between items-end">
                  <div className="flex items-center border rounded-full px-2 py-1">
                    <button 
                      onClick={() => updateQuantity(item.id, item.selectedSize, item.selectedColor, item.quantity - 1)}
                      className="p-2 hover:text-primary"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.selectedSize, item.selectedColor, item.quantity + 1)}
                      className="p-2 hover:text-primary"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl">{settings.currency} {(item.discountPrice || item.price) * item.quantity}</p>
                    <p className="text-xs text-muted-foreground">{settings.currency} {item.discountPrice || item.price} each</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="p-8 bg-muted rounded-3xl space-y-6 sticky top-24">
            <h3 className="text-xl font-bold">Order Summary</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="text-foreground font-medium">{settings.currency} {totalPrice}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span className="text-green-600 font-medium">FREE</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span className="text-foreground font-medium">{settings.currency} 0.00</span>
              </div>
              <div className="border-t pt-4 flex justify-between items-end">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-2xl text-primary">{settings.currency} {totalPrice}</span>
              </div>
            </div>

            <Link to="/checkout">
              <Button className="w-full h-14 rounded-full text-lg font-bold gap-2 mt-4">
                Checkout <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            
            <div className="space-y-4 pt-4">
              <p className="text-xs text-center text-muted-foreground">
                We accept Cash on Delivery (COD) and all major credit cards.
              </p>
              <div className="flex justify-center gap-4 opacity-50">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
