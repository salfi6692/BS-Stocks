import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, Sun, Moon, Search } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import { auth, signInWithGoogle, logout } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { cn } from '../lib/utils';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';

export default function Navbar() {
  const { totalItems } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => {
      unsubscribe();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const navLinks = settings.headerMenu.length > 0 ? settings.headerMenu : [
    { label: 'Home', path: '/' },
    { label: 'Tracksuits', path: '/products?category=Tracksuits' },
    { label: 'Trousers', path: '/products?category=Trousers' },
    { label: 'T-Shirts', path: '/products?category=T-Shirts' },
  ];

  return (
    <div className="fixed top-0 w-full z-50">
      {settings.announcementBar.enabled && (
        <div className="bg-primary text-primary-foreground py-2 px-4 text-center text-xs font-medium overflow-hidden">
          <Link to={settings.announcementBar.link} className="hover:underline transition-all">
            {settings.announcementBar.text}
          </Link>
        </div>
      )}
      <nav className={cn(
        "w-full transition-all duration-300 border-b",
        isScrolled ? "bg-background/80 backdrop-blur-md py-2" : "bg-background py-4"
      )}>
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center">
              {settings.logoUrl ? (
                <img 
                  src={settings.logoUrl} 
                  alt={settings.storeName} 
                  className={cn(
                    "object-contain",
                    settings.logoSize === 'small' ? 'h-6' : settings.logoSize === 'medium' ? 'h-8' : 'h-10'
                  )}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-2xl font-bold tracking-tighter uppercase">{settings.storeName}</span>
              )}
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map(link => (
                <Link key={link.label} to={link.path} className="text-sm font-medium hover:text-primary transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <Search className="h-5 w-5" />
            </Button>

            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>

            <div className="hidden md:block">
              {user ? (
                <div className="flex items-center gap-2">
                  <Link to="/admin">
                    <Button variant="outline" size="sm">Admin</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
                </div>
              ) : (
                <Button variant="default" size="sm" onClick={signInWithGoogle}>Login</Button>
              )}
            </div>

            <Sheet>
              <SheetTrigger render={
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              } />
              <SheetContent side="right">
                <div className="flex flex-col gap-4 mt-8">
                  {navLinks.map(link => (
                    <Link key={link.label} to={link.path} className="text-lg font-medium">
                      {link.label}
                    </Link>
                  ))}
                  <hr />
                  {user ? (
                    <>
                      <Link to="/admin" className="text-lg font-medium">Admin Dashboard</Link>
                      <Button variant="outline" onClick={logout}>Logout</Button>
                    </>
                  ) : (
                    <Button onClick={signInWithGoogle}>Login / Sign Up</Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </div>
  );
}
