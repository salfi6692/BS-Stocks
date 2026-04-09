import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { CartProvider } from './contexts/CartContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Admin from './pages/Admin';
import OrderConfirmation from './pages/OrderConfirmation';
import StandardPageView from './pages/StandardPageView';
import { useEffect } from 'react';
import { seedDatabase } from './lib/seed';

export default function App() {
  useEffect(() => {
    seedDatabase();
  }, []);

  return (
    <SettingsProvider>
      <ThemeProvider>
        <CartProvider>
          <Router>
            <div className="min-h-screen bg-background text-foreground flex flex-col">
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
                  <Route path="/admin/*" element={<Admin />} />
                </Routes>
              </main>
              <Footer />
              <Toaster position="top-center" richColors />
            </div>
          </Router>
        </CartProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}
