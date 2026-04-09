import { useLocation, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function OrderConfirmation() {
  const location = useLocation();
  const orderId = location.state?.orderId || 'N/A';

  return (
    <div className="container mx-auto px-4 py-20 text-center space-y-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12 }}
        className="flex justify-center"
      >
        <div className="p-6 bg-green-100 dark:bg-green-900/30 rounded-full">
          <CheckCircle className="h-20 w-20 text-green-600 dark:text-green-400" />
        </div>
      </motion.div>

      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tighter">Order Confirmed!</h1>
        <p className="text-xl text-muted-foreground">Thank you for your purchase. Your order has been received.</p>
        <div className="inline-block px-6 py-2 bg-muted rounded-full font-mono text-sm">
          Order ID: <span className="font-bold">{orderId}</span>
        </div>
      </div>

      <div className="max-w-md mx-auto p-8 bg-card border rounded-3xl space-y-6 text-left">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold">What's Next?</h3>
            <p className="text-sm text-muted-foreground">You will receive an email confirmation shortly with your order details.</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Our team is now preparing your items for shipment. You can track your order status in your account dashboard.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
        <Link to="/products">
          <Button variant="outline" size="lg" className="px-8 rounded-full">Continue Shopping</Button>
        </Link>
        <Link to="/">
          <Button size="lg" className="px-8 rounded-full gap-2">
            Back to Home <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
