import * as React from 'react';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { collection, addDoc, serverTimestamp, runTransaction, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { ChevronLeft, CreditCard, Truck } from 'lucide-react';

export default function Checkout() {
  const { cart, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
    paymentMethod: 'COD'
  });

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold">Your cart is empty</h2>
        <Link to="/products">
          <Button className="mt-4">Back to Shop</Button>
        </Link>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Check and decrement stock for each item
        for (const item of cart) {
          const productRef = doc(db, 'products', item.id);
          const productSnap = await transaction.get(productRef);
          
          if (!productSnap.exists()) {
            throw new Error(`Product ${item.title} no longer exists.`);
          }

          const productData = productSnap.data();
          
          // Check global stock if tracking is enabled
          if (productData.trackInventory && !productData.continueSellingOutOfStock) {
            if (productData.stockQuantity < item.quantity) {
              throw new Error(`Insufficient stock for ${item.title}.`);
            }
          }

          const updates: any = {
            stockQuantity: (productData.stockQuantity || 0) - item.quantity
          };

          // Handle variants stock if applicable
          if (productData.hasVariants && productData.variants) {
            const updatedVariants = productData.variants.map((v: any) => {
              if (v.size === item.selectedSize && v.color === item.selectedColor) {
                if (productData.trackInventory && !productData.continueSellingOutOfStock && v.stock < item.quantity) {
                  throw new Error(`Insufficient stock for ${item.title} (${v.size}/${v.color}).`);
                }
                return { ...v, stock: v.stock - item.quantity };
              }
              return v;
            });
            updates.variants = updatedVariants;
          }

          transaction.update(productRef, updates);
        }

        // 2. Create the order
        const orderData = {
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          address: `${formData.address}, ${formData.city}, ${formData.zip}`,
          items: cart,
          totalAmount: totalPrice,
          status: 'Pending',
          paymentMethod: 'COD',
          createdAt: serverTimestamp()
        };

        const orderRef = doc(collection(db, 'orders'));
        transaction.set(orderRef, orderData);
        
        return orderRef.id;
      }).then((orderId) => {
        toast.success('Order placed successfully!');
        clearCart();
        navigate('/order-confirmation', { state: { orderId } });
      });

    } catch (error: any) {
      console.error("Error placing order:", error);
      toast.error(error.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <Link to="/cart" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8">
        <ChevronLeft className="h-4 w-4" /> Back to Cart
      </Link>

      <h1 className="text-4xl font-bold tracking-tighter mb-10">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <section className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6" /> Shipping Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" required value={formData.name} onChange={handleInputChange} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" name="email" type="email" required value={formData.email} onChange={handleInputChange} placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" name="phone" required value={formData.phone} onChange={handleInputChange} placeholder="+1 (555) 000-0000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Shipping Address</Label>
                <Input id="address" name="address" required value={formData.address} onChange={handleInputChange} placeholder="123 Main St" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" required value={formData.city} onChange={handleInputChange} placeholder="New York" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input id="zip" name="zip" required value={formData.zip} onChange={handleInputChange} placeholder="10001" />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="h-6 w-6" /> Payment Method
            </h2>
            <div className="p-6 border-2 border-primary bg-primary/5 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-6 w-6 rounded-full border-4 border-primary" />
                <div>
                  <p className="font-bold">Cash on Delivery (COD)</p>
                  <p className="text-sm text-muted-foreground">Pay when you receive your order</p>
                </div>
              </div>
              <span className="font-bold text-primary">FREE</span>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <Card className="rounded-3xl border-none shadow-lg bg-muted/50 overflow-hidden">
            <CardHeader className="bg-muted">
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                {cart.map(item => (
                  <div key={`${item.id}-${item.selectedSize}`} className="flex justify-between text-sm">
                    <div className="flex gap-3">
                      <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted">
                        <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-medium line-clamp-1">{item.title}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity} | {item.selectedSize}</p>
                      </div>
                    </div>
                    <p className="font-bold">${(item.discountPrice || item.price) * item.quantity}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${totalPrice}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-green-600 font-medium">FREE</span>
                </div>
                <div className="flex justify-between items-end pt-2">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-2xl text-primary">${totalPrice}</span>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-14 rounded-full text-lg font-bold">
                {loading ? 'Processing...' : 'Place Order'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
