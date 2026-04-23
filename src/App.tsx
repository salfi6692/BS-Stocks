import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { CartProvider } from './contexts/CartContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import ProtectedRoute from './components/ProtectedRoute';
import OrderConfirmation from './pages/OrderConfirmation';
import StandardPageView from './pages/StandardPageView';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { seedDatabase } from './lib/seed';
import { useSettings } from './contexts/SettingsContext';
import LoadingScreen from './components/LoadingScreen';

function AppContent() {
  const { loading } = useSettings();

  useEffect(() => {
    seedDatabase();
  }, []);

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <LoadingScreen key="loader" />
      ) : (
        <motion.div 
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen bg-background text-foreground flex flex-col"
        >
          <Router>
            <ScrollToTop />
            <Navbar />
            <main className="flex-grow pt-20">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-confirmation" element={<OrderConfirmation />} />
                <Route path="/pages/:slug" element={<StandardPageView />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route 
                  path="/admin/*" 
                  element={
                    <ProtectedRoute requireAdmin>
                      <Admin />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </main>
            <Footer />
            <Toaster position="top-center" richColors />
          </Router>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <ThemeProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </ThemeProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
