import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { StoreSettings } from '../types';

interface SettingsContextType {
  settings: StoreSettings;
  loading: boolean;
}

const defaultSettings: StoreSettings = {
  storeName: 'BS Stocks',
  tagline: 'Premium fashion clothing store',
  contactEmail: '',
  contactPhone: '',
  address: '',
  logoUrl: '',
  faviconUrl: '',
  logoSize: 'medium',
  banners: [],
  sliderAutoplay: true,
  announcementBar: { enabled: false, text: '', link: '' },
  homepageHeading: 'Modern Fashion for Everyone',
  homepageSubheading: 'Discover our latest collection of premium tracksuits and more.',
  themeColor: '#2563eb',
  secondaryColor: '#000000',
  fontFamily: 'Inter',
  buttonStyle: 'rounded',
  darkMode: false,
  headerMenu: [
    { id: '1', label: 'Home', path: '/' },
    { id: '2', label: 'Shop', path: '/products' },
    { id: '3', label: 'Tracksuits', path: '/products?category=Tracksuits' },
    { id: '4', label: 'Trousers', path: '/products?category=Trousers' },
    { id: '5', label: 'T-Shirts', path: '/products?category=T-Shirts' },
  ],
  footerMenu: [
    { id: '1', label: 'About Us', path: '/pages/about-us' },
    { id: '2', label: 'Contact Us', path: '/pages/contact-us' },
    { id: '3', label: 'Shipping Policy', path: '/pages/shipping-policy' },
    { id: '4', label: 'Privacy Policy', path: '/pages/privacy-policy' },
  ],
  adsenseCode: '',
  headerAdEnabled: false,
  footerAdEnabled: false,
  inPageAdEnabled: false,
  socialLinks: { facebook: '', instagram: '', twitter: '', youtube: '' },
  defaultSeoTitle: 'BS Stocks | Premium Fashion',
  defaultSeoDescription: 'The best place for premium tracksuits and fashion.',
  trackingCode: '',
  features: { reviews: true, wishlist: true }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'config'), (doc) => {
      if (doc.exists()) {
        setSettings(prev => ({ ...prev, ...doc.data() }));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Apply theme settings to document
  useEffect(() => {
    if (!loading) {
      document.documentElement.style.setProperty('--primary', settings.themeColor);
      document.documentElement.style.setProperty('--font-sans', settings.fontFamily);
      
      // Update favicon
      if (settings.faviconUrl) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = settings.faviconUrl;
      }

      // Update title
      document.title = settings.defaultSeoTitle;
    }
  }, [settings, loading]);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
