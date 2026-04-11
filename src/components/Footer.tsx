import { Link } from 'react-router-dom';
import { Globe, Mail, Phone, MapPin } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export default function Footer() {
  const { settings } = useSettings();
  
  const footerLinks = settings.footerMenu.length > 0 ? settings.footerMenu : [
    { label: 'About Us', path: '/pages/about-us' },
    { label: 'Contact Us', path: '/pages/contact-us' },
    { label: 'Shipping Policy', path: '/pages/shipping-policy' },
    { label: 'Privacy Policy', path: '/pages/privacy-policy' },
  ];

  return (
    <footer className="bg-muted mt-20 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold tracking-tighter uppercase">{settings.storeName}</h3>
            <p className="text-sm text-muted-foreground">
              {settings.footerText || settings.tagline}
            </p>
            <div className="flex gap-4">
              {settings.socialLinks.facebook && (
                <a href={settings.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  <Globe className="h-5 w-5" />
                </a>
              )}
              {settings.socialLinks.instagram && (
                <a href={settings.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  <Globe className="h-5 w-5" />
                </a>
              )}
              {settings.socialLinks.twitter && (
                <a href={settings.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  <Globe className="h-5 w-5" />
                </a>
              )}
              {settings.socialLinks.youtube && (
                <a href={settings.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  <Globe className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-primary">Home</Link></li>
              <li><Link to="/products" className="hover:text-primary">Shop All</Link></li>
              {settings.headerMenu.map(link => (
                <li key={link.label}><Link to={link.path} className="hover:text-primary">{link.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {footerLinks.map(link => (
                <li key={link.label}><Link to={link.path} className="hover:text-primary">{link.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Contact Info</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {settings.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1 shrink-0" />
                  <span>{settings.address}</span>
                </li>
              )}
              {settings.contactPhone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{settings.contactPhone}</span>
                </li>
              )}
              {settings.contactEmail && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span>{settings.contactEmail}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
        
        <div className="border-t mt-12 pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {settings.storeName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
