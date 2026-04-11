import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '../components/ui/sheet';
import { Skeleton } from '../components/ui/skeleton';
import { StandardPage, Banner, MenuItem } from '../types';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Sparkles,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  TrendingUp,
  DollarSign,
  Users,
  Star,
  RefreshCcw,
  RefreshCw,
  Palette,
  Layout,
  Globe,
  Share2,
  Monitor,
  FileText,
  Megaphone,
  GripVertical,
  Download,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import Papa from 'papaparse';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, orderBy, serverTimestamp, getDoc, addDoc } from 'firebase/firestore';
import { db, auth, logout } from '../firebase';
import { Product, Order, Review, StoreSettings, Collection } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { toast } from 'sonner';
import { onAuthStateChanged } from 'firebase/auth';
import { GoogleGenAI } from '@google/genai';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

import { cn } from '../lib/utils';

// --- Helpers ---

const generateDynamicCollections = (tags: string[], category: string) => {
  const dynamicCols: string[] = [];
  if (!category) return dynamicCols;
  
  const catLower = category.toLowerCase();
  
  tags.forEach(tag => {
    const tagLower = tag.toLowerCase();
    // Avoid combining if the tag is already part of the category or vice versa
    if (tagLower === catLower || catLower.includes(tagLower) || tagLower.includes(catLower)) {
      const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1);
      if (!dynamicCols.includes(capitalizedTag)) dynamicCols.push(capitalizedTag);
      return;
    }

    // Create combined collection: Tag + Category (e.g., "Summer Tracksuits")
    const combined = `${tag.charAt(0).toUpperCase() + tag.slice(1)} ${category}`;
    if (!dynamicCols.includes(combined)) {
      dynamicCols.push(combined);
    }
    
    // Also add the tag itself as a collection
    const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1);
    if (!dynamicCols.includes(capitalizedTag)) {
      dynamicCols.push(capitalizedTag);
    }
  });

  // Add the category itself
  if (!dynamicCols.includes(category)) {
    dynamicCols.push(category);
  }
  
  return dynamicCols;
};

const ensureCollectionsExist = async (collectionNames: string[]) => {
  try {
    for (const name of collectionNames) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const q = query(collection(db, 'collections'), where('name', '==', name));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        await addDoc(collection(db, 'collections'), {
          name,
          slug,
          createdAt: serverTimestamp(),
          description: `Automatically generated collection for ${name}`
        });
      }
    }
  } catch (error) {
    console.error("Error ensuring collections exist:", error);
  }
};

const sanitize = (obj: any): any => {
  const newObj: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] === undefined) return;
    if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
      newObj[key] = sanitize(obj[key]);
    } else if (Array.isArray(obj[key])) {
      newObj[key] = obj[key].map((item: any) => (typeof item === 'object' && item !== null) ? sanitize(item) : item);
    } else {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};

const importShopifyProducts = async (file: File, setImporting: (val: boolean) => void) => {
  setImporting(true);
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const productsMap = new Map();
      
      results.data.forEach((row: any) => {
        const handle = row['Handle'];
        if (!handle) return;

        if (!productsMap.has(handle)) {
          const title = row['Title'] || 'Untitled Product';
          const price = parseFloat(row['Variant Price']);
          const compareAtPrice = parseFloat(row['Variant Compare At Price']);
          const stock = parseInt(row['Variant Inventory Qty']);

          productsMap.set(handle, {
            title,
            description: row['Body (HTML)'] || '',
            category: row['Type'] || 'Uncategorized',
            tags: row['Tags'] ? row['Tags'].split(',').map((t: string) => t.trim()) : [],
            images: [],
            variants: [],
            slug: handle,
            status: row['Published']?.toLowerCase() === 'true' ? 'Active' : 'Draft',
            sku: row['Variant SKU'] || '',
            price: isNaN(price) ? 0 : price,
            compareAtPrice: isNaN(compareAtPrice) ? null : compareAtPrice,
            stockQuantity: 0, // Initialize to 0, will be summed from variants
            trackInventory: true,
            continueSellingOutOfStock: false,
            hasVariants: false,
            isPhysical: true,
            rating: 5,
            reviewCount: 0,
            createdAt: serverTimestamp(),
            collections: []
          });
        }

        const product = productsMap.get(handle);

        // Add images
        if (row['Image Src']) {
          if (!product.images.includes(row['Image Src'])) {
            product.images.push(row['Image Src']);
          }
        }

        // Extract Size and Color from all 3 possible Shopify options
        let size = 'Standard';
        let color = 'Default';

        const options = [
          { name: row['Option1 Name'], value: row['Option1 Value'] },
          { name: row['Option2 Name'], value: row['Option2 Value'] },
          { name: row['Option3 Name'], value: row['Option3 Value'] }
        ];

        const sizeKeywords = ['size', 'sizing', 'waist', 'length'];
        const colorKeywords = ['color', 'colour', 'shade', 'finish', 'pattern', 'material'];
        const commonSizes = ['s', 'm', 'l', 'xl', 'xxl', '2xl', '3xl', '4xl', '5xl', 'small', 'medium', 'large', 'extra large'];

        options.forEach(opt => {
          if (!opt.value) return;
          const val = opt.value.trim();
          if (val === 'Default Title' || val === '') return;
          
          const name = (opt.name || '').toLowerCase();
          const valLower = val.toLowerCase();
          
          if (sizeKeywords.some(k => name.includes(k))) {
            size = val;
          } else if (colorKeywords.some(k => name.includes(k))) {
            color = val;
          } else if (commonSizes.includes(valLower) || /^\d+(\.\d+)?$/.test(val)) {
            if (size === 'Standard') size = val;
          } else {
            // Fallback: if we don't have a size yet, take the first option value
            if (size === 'Standard') size = val;
            else if (color === 'Default') color = val;
          }
        });

        // If color is still default, try to extract from title
        if (color === 'Default') {
          const commonColors = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple', 'Orange', 'Grey', 'Gray', 'Brown', 'Navy', 'Maroon', 'Beige', 'Olive'];
          const foundColor = commonColors.find(c => product.title.toLowerCase().includes(c.toLowerCase()));
          if (foundColor) color = foundColor;
        }

        // Add variant if it has size or color or SKU
        const isDefaultTitle = row['Option1 Value'] === 'Default Title';
        if (row['Variant SKU'] || (!isDefaultTitle && row['Option1 Value']) || row['Option2 Value'] || row['Option3 Value']) {
          product.hasVariants = !isDefaultTitle;
          const vPrice = parseFloat(row['Variant Price']);
          const vStock = parseInt(row['Variant Inventory Qty']);
          
          product.variants.push({
            id: Math.random().toString(36).substr(2, 9),
            size,
            color,
            sku: row['Variant SKU'] || '',
            price: isNaN(vPrice) ? product.price : vPrice,
            stock: isNaN(vStock) ? 0 : vStock
          });

          // Update total stock quantity
          if (!isNaN(vStock)) {
            product.stockQuantity = (product.stockQuantity || 0) + vStock;
          }
        }

        // Generate dynamic collections from tags and category
        const dynamicCols: string[] = generateDynamicCollections(product.tags, product.category);
        product.collections = Array.from(new Set([...(product.collections || []), ...dynamicCols]));
      });

      // Save to Firestore
      try {
        let count = 0;
        const allImportedCols = new Set<string>();
        for (const [handle, product] of productsMap.entries()) {
          // Collect all collection names for automatic generation
          if (product.collections) {
            product.collections.forEach((c: string) => allImportedCols.add(c));
          }

          // Check if product exists by slug
          const q = query(collection(db, 'products'), where('slug', '==', handle));
          const snap = await getDocs(q);
          
          if (snap.empty) {
            await addDoc(collection(db, 'products'), sanitize(product));
            count++;
          }
        }
        
        // Automatically generate collection documents
        if (allImportedCols.size > 0) {
          await ensureCollectionsExist(Array.from(allImportedCols));
        }

        toast.success(`Successfully imported ${count} new products!`);
      } catch (error) {
        console.error(error);
        toast.error('Error saving imported products');
      } finally {
        setImporting(false);
      }
    },
    error: (error) => {
      console.error(error);
      toast.error('Error parsing CSV file');
      setImporting(false);
    }
  });
};

// --- Admin Components ---

function Dashboard() {
  const { settings } = useSettings();
  const [stats, setStats] = useState({ sales: 0, orders: 0, products: 0, reviews: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const productsSnap = await getDocs(collection(db, 'products'));
      const ordersSnap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
      const reviewsSnap = await getDocs(collection(db, 'reviews'));

      const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);

      setStats({
        sales: totalSales,
        orders: orders.length,
        products: productsSnap.size,
        reviews: reviewsSnap.size
      });
      setRecentOrders(orders.slice(0, 5));
    };
    fetchData();
  }, []);

  const chartData = [
    { name: 'Mon', sales: 400 },
    { name: 'Tue', sales: 300 },
    { name: 'Wed', sales: 600 },
    { name: 'Thu', sales: 800 },
    { name: 'Fri', sales: 500 },
    { name: 'Sat', sales: 900 },
    { name: 'Sun', sales: 1200 },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{settings.currency} {stats.sales}</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orders}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.products}</div>
            <p className="text-xs text-muted-foreground">+4 new this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reviews</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reviews}</div>
            <p className="text-xs text-muted-foreground">98% positive feedback</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>You have {stats.orders} total orders.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.status === 'Delivered' ? 'default' : 'secondary'}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">{settings.currency} {order.totalAmount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProductsManager() {
  const { settings, collections } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc')));
      setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    } catch (error) {
      console.error(error);
      toast.error('Error fetching products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const syncAllProductCollections = async () => {
    toast.info('Syncing collections for all products...');
    try {
      const snap = await getDocs(collection(db, 'products'));
      let updatedCount = 0;
      const allDiscoveredNames = new Set<string>();
      
      for (const docSnap of snap.docs) {
        const p = docSnap.data() as Product;
        const dynamicCols = generateDynamicCollections(p.tags || [], p.category || '');
        const currentCols = p.collections || [];
        
        const allCols = Array.from(new Set([...currentCols, ...dynamicCols]));
        allCols.forEach(c => allDiscoveredNames.add(c));
        
        if (JSON.stringify(allCols.sort()) !== JSON.stringify(currentCols.sort())) {
          await updateDoc(doc(db, 'products', docSnap.id), { collections: allCols });
          updatedCount++;
        }
      }
      
      await ensureCollectionsExist(Array.from(allDiscoveredNames));
      
      toast.success(`Synced ${updatedCount} products and updated collections list`);
      fetchProducts();
    } catch (error) {
      console.error(error);
      toast.error('Error syncing collections');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct?.title || !currentProduct?.price || !currentProduct?.category) {
      toast.error('Please fill in required fields (Title, Price, Category)');
      return;
    }

    try {
      const variants = currentProduct.variants || [];
      const totalVariantStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
      
      const tags = currentProduct.tags || [];
      const category = currentProduct.category || '';
      const dynamicCollections = generateDynamicCollections(tags, category);
      const manualCollections = currentProduct.collections || [];
      
      // Merge manual and dynamic collections, ensuring uniqueness
      const allCollections = Array.from(new Set([...manualCollections, ...dynamicCollections]));

      // Ensure these collections exist in the collections collection
      await ensureCollectionsExist(allCollections);

      const productData = {
        ...currentProduct,
        createdAt: currentProduct.id ? currentProduct.createdAt : serverTimestamp(),
        rating: currentProduct.rating || 4.5,
        reviewCount: currentProduct.reviewCount || 0,
        slug: currentProduct.slug || currentProduct.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        status: currentProduct.status || 'Active',
        images: currentProduct.images || [],
        variants: variants,
        tags: tags,
        collections: allCollections,
        stockQuantity: currentProduct.hasVariants ? totalVariantStock : (currentProduct.stockQuantity || 0),
        trackInventory: currentProduct.trackInventory ?? true,
        continueSellingOutOfStock: currentProduct.continueSellingOutOfStock ?? false,
        isPhysical: currentProduct.isPhysical ?? true,
        vendor: currentProduct.vendor || 'BS Stocks',
        hasVariants: currentProduct.hasVariants ?? false,
      };

      if (currentProduct.id) {
        await updateDoc(doc(db, 'products', currentProduct.id), productData);
        toast.success('Product updated');
      } else {
        await addDoc(collection(db, 'products'), productData);
        toast.success('Product created');
      }
      setIsEditing(false);
      setCurrentProduct(null);
      fetchProducts();
    } catch (error) {
      console.error(error);
      toast.error('Error saving product');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      toast.success('Product deleted');
      fetchProducts();
    } catch (error) {
      toast.error('Error deleting product');
    }
  };

  const handleDuplicate = (product: Product) => {
    const { id, ...rest } = product;
    setCurrentProduct({ ...rest, title: `${rest.title} (Copy)`, slug: `${rest.slug}-copy` });
    setIsEditing(true);
  };

  const generateAIDescription = async () => {
    if (!currentProduct?.title) return toast.error('Please enter a title first');
    toast.info('Generating description...');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a premium, high-converting HTML product description for a fashion item named "${currentProduct.title}" in the category "${currentProduct.category}". Use <h2> for headings and <ul> for features. Keep it professional and concise.`
      });
      setCurrentProduct(prev => ({ ...prev, description: response.text }));
      toast.success('AI Description generated!');
    } catch (error) {
      toast.error('AI generation failed');
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setIsEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold">{currentProduct?.id ? 'Edit Product' : 'Add Product'}</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setCurrentProduct(p => ({ ...p, status: 'Draft' }));
              toast.info('Status set to Draft. Click Save to apply.');
            }}>Save as Draft</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">Save Product</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Product Title *</Label>
                  <Input 
                    value={currentProduct?.title || ''} 
                    onChange={e => setCurrentProduct(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Premium Tech Tracksuit"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Description</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={generateAIDescription} className="text-blue-600 gap-1">
                      <Sparkles className="h-4 w-4" /> Generate with AI
                    </Button>
                  </div>
                  <div className="min-h-[250px] border rounded-md overflow-hidden bg-background">
                    <ReactQuill 
                      theme="snow" 
                      value={currentProduct?.description || ''} 
                      onChange={val => setCurrentProduct(p => ({ ...p, description: val }))}
                      className="h-[200px]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Media */}
            <Card>
              <CardHeader>
                <CardTitle>Media</CardTitle>
                <CardDescription>Add images and video links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {(currentProduct?.images || []).map((img, idx) => (
                    <div key={idx} className="relative group aspect-square border rounded-lg overflow-hidden bg-muted">
                      <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button 
                        type="button"
                        onClick={() => setCurrentProduct(p => p ? ({ ...p, images: p.images?.filter((_, i) => i !== idx) }) : null)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <div className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-2">
                    <Input 
                      placeholder="Image URL" 
                      className="text-xs h-7 mb-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const url = (e.target as HTMLInputElement).value;
                          if (url) {
                            setCurrentProduct(p => p ? ({ ...p, images: [...(p.images || []), url] }) : null);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground text-center">Press Enter to add</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>YouTube Video URL</Label>
                  <Input 
                    value={currentProduct?.youtubeUrl || ''} 
                    onChange={e => setCurrentProduct(p => p ? ({ ...p, youtubeUrl: e.target.value }) : null)}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Price *</Label>
                  <Input 
                    type="number" 
                    value={currentProduct?.price || ''} 
                    onChange={e => setCurrentProduct(p => ({ ...p, price: parseFloat(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Compare-at price</Label>
                  <Input 
                    type="number" 
                    value={currentProduct?.compareAtPrice || ''} 
                    onChange={e => setCurrentProduct(p => ({ ...p, compareAtPrice: parseFloat(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cost per item</Label>
                  <Input 
                    type="number" 
                    value={currentProduct?.costPerItem || ''} 
                    onChange={e => setCurrentProduct(p => ({ ...p, costPerItem: parseFloat(e.target.value) }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Inventory */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SKU (Stock Keeping Unit)</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={currentProduct?.sku || ''} 
                        onChange={e => setCurrentProduct(p => ({ ...p, sku: e.target.value }))}
                      />
                      <Button type="button" variant="outline" size="icon" onClick={() => setCurrentProduct(p => ({ ...p, sku: `BS-${Math.random().toString(36).substr(2, 6).toUpperCase()}` }))}>
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Stock Quantity</Label>
                    <Input 
                      type="number" 
                      value={currentProduct?.stockQuantity || ''} 
                      onChange={e => setCurrentProduct(p => ({ ...p, stockQuantity: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Track Inventory</Label>
                    <p className="text-xs text-muted-foreground">Keep track of stock levels automatically</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={currentProduct?.trackInventory ?? true} 
                    onChange={e => setCurrentProduct(p => ({ ...p, trackInventory: e.target.checked }))}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Continue selling when out of stock</Label>
                    <p className="text-xs text-muted-foreground">Allow customers to purchase items even if stock is 0</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={currentProduct?.continueSellingOutOfStock ?? false} 
                    onChange={e => setCurrentProduct(p => ({ ...p, continueSellingOutOfStock: e.target.checked }))}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Variants */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Variants</CardTitle>
                  <CardDescription>Manage sizes, colors, and more</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Enable Variants</Label>
                  <input 
                    type="checkbox" 
                    checked={currentProduct?.hasVariants ?? false} 
                    onChange={e => setCurrentProduct(p => ({ ...p, hasVariants: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </CardHeader>
              {currentProduct?.hasVariants && (
                <CardContent className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Variant</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(currentProduct?.variants || []).map((v, idx) => (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">{v.size} / {v.color}</TableCell>
                            <TableCell>
                              <Input 
                                type="number" 
                                className="w-20 h-8" 
                                value={v.price} 
                                onChange={e => {
                                  const newVariants = [...(currentProduct?.variants || [])];
                                  newVariants[idx].price = parseFloat(e.target.value);
                                  setCurrentProduct(p => ({ ...p, variants: newVariants }));
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input 
                                className="w-24 h-8" 
                                value={v.sku} 
                                onChange={e => {
                                  const newVariants = [...(currentProduct?.variants || [])];
                                  newVariants[idx].sku = e.target.value;
                                  setCurrentProduct(p => ({ ...p, variants: newVariants }));
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input 
                                type="number" 
                                className="w-20 h-8" 
                                value={v.stock} 
                                onChange={e => {
                                  const newVariants = [...(currentProduct?.variants || [])];
                                  newVariants[idx].stock = parseInt(e.target.value);
                                  setCurrentProduct(p => ({ ...p, variants: newVariants }));
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Button type="button" variant="ghost" size="icon" onClick={() => {
                                const newVariants = [...(currentProduct?.variants || [])];
                                newVariants.splice(idx, 1);
                                setCurrentProduct(p => ({ ...p, variants: newVariants }));
                              }}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-3 border rounded-lg bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Size</Label>
                      <Input id="new-v-size" placeholder="e.g. XL" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Color</Label>
                      <Input id="new-v-color" placeholder="e.g. Red" className="h-8 text-xs" />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        type="button" 
                        variant="default" 
                        size="sm" 
                        className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => {
                          const size = (document.getElementById('new-v-size') as HTMLInputElement).value;
                          const color = (document.getElementById('new-v-color') as HTMLInputElement).value;
                          if (size && color) {
                            const newVariant = {
                              id: Math.random().toString(36).substr(2, 9),
                              size,
                              color,
                              price: currentProduct?.price || 0,
                              sku: `${currentProduct?.sku || 'SKU'}-${size}-${color}`,
                              stock: 0
                            };
                            setCurrentProduct(p => p ? ({ ...p, variants: [...(p.variants || []), newVariant] }) : null);
                            (document.getElementById('new-v-size') as HTMLInputElement).value = '';
                            (document.getElementById('new-v-color') as HTMLInputElement).value = '';
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Shipping */}
            <Card>
              <CardHeader>
                <CardTitle>Shipping</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>This is a physical product</Label>
                    <p className="text-xs text-muted-foreground">Requires shipping and weight calculation</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={currentProduct?.isPhysical ?? true} 
                    onChange={e => setCurrentProduct(p => ({ ...p, isPhysical: e.target.checked }))}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                {currentProduct?.isPhysical && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Weight (kg)</Label>
                      <Input 
                        type="number" 
                        step="0.1"
                        value={currentProduct?.weight || ''} 
                        onChange={e => setCurrentProduct(p => ({ ...p, weight: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Shipping Cost</Label>
                      <Input 
                        type="number" 
                        value={currentProduct?.shippingCost || ''} 
                        onChange={e => setCurrentProduct(p => ({ ...p, shippingCost: parseFloat(e.target.value) }))}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SEO */}
            <Card>
              <CardHeader>
                <CardTitle>Search Engine Listing</CardTitle>
                <CardDescription>How your product appears on Google</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>SEO Title</Label>
                  <Input 
                    value={currentProduct?.seoTitle || ''} 
                    onChange={e => setCurrentProduct(p => ({ ...p, seoTitle: e.target.value }))}
                    placeholder={currentProduct?.title}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={currentProduct?.seoDescription || ''} 
                    onChange={e => setCurrentProduct(p => ({ ...p, seoDescription: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL Slug</Label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="hidden sm:inline">bs-stocks.com/products/</span>
                    <Input 
                      className="h-8"
                      value={currentProduct?.slug || ''} 
                      onChange={e => setCurrentProduct(p => ({ ...p, slug: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Select 
                  value={currentProduct?.status || 'Active'} 
                  onValueChange={val => setCurrentProduct(p => ({ ...p, status: val as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Organization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select 
                    value={currentProduct?.category || ''} 
                    onValueChange={val => setCurrentProduct(p => ({ ...p, category: val as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {collections.map(col => (
                        <SelectItem key={col.id} value={col.name}>{col.name}</SelectItem>
                      ))}
                      {/* Fallback if no collections exist */}
                      {collections.length === 0 && (
                        <>
                          <SelectItem value="Tracksuits">Tracksuits</SelectItem>
                          <SelectItem value="Trousers">Trousers</SelectItem>
                          <SelectItem value="T-Shirts">T-Shirts</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vendor / Brand</Label>
                  <Input 
                    value={currentProduct?.vendor || ''} 
                    onChange={e => setCurrentProduct(p => ({ ...p, vendor: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Collections</Label>
                  <div className="space-y-2">
                    {['Featured', 'New Arrival', 'Sale'].map(col => (
                      <div key={col} className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={(currentProduct?.collections || []).includes(col as any)}
                          onChange={e => {
                            const cols = [...(currentProduct?.collections || [])];
                            if (e.target.checked) cols.push(col as any);
                            else {
                              const idx = cols.indexOf(col as any);
                              if (idx > -1) cols.splice(idx, 1);
                            }
                            setCurrentProduct(p => ({ ...p, collections: cols }));
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">{col}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tags (comma separated)</Label>
                  <Input 
                    value={(currentProduct?.tags || []).join(', ')} 
                    onChange={e => setCurrentProduct(p => ({ ...p, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) }))}
                    placeholder="new, cotton, summer"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Products ({products.length})</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={syncAllProductCollections}>
            <RefreshCw className="h-4 w-4 mr-2" /> Sync Collections
          </Button>
          <Button variant="outline" onClick={() => {
            const csv = Papa.unparse(products);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'products-export.csv';
            a.click();
          }}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <label className="cursor-pointer">
            <Input type="file" accept=".csv" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importShopifyProducts(file, setImporting).then(() => fetchProducts());
            }} />
            <Button variant="outline" disabled={importing}>
              <Upload className="h-4 w-4 mr-2" /> {importing ? 'Importing...' : 'Shopify Import'}
            </Button>
          </label>
          <Button onClick={() => {
            setCurrentProduct({
              title: '',
              description: '',
              price: 0,
              category: 'Tracksuits',
              images: [],
              variants: [],
              status: 'Active',
              isPhysical: true,
              trackInventory: true,
              continueSellingOutOfStock: false,
              tags: [],
              collections: [],
              hasVariants: false,
              vendor: 'BS Stocks'
            });
            setIsEditing(true);
          }} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow key="loading">
                    <TableCell colSpan={7} className="text-center py-10">Loading products...</TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow key="empty">
                    <TableCell colSpan={7} className="text-center py-10">No products found</TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="w-12 h-12 rounded border bg-muted overflow-hidden">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Package className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{product.title}</TableCell>
                      <TableCell>
                        <Badge variant={product.status === 'Active' ? 'default' : 'secondary'} className={product.status === 'Active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={product.stockQuantity <= 5 ? 'text-red-600 font-medium' : ''}>
                          {product.stockQuantity} in stock
                        </span>
                        {product.hasVariants && <span className="text-xs text-muted-foreground block">for {product.variants?.length || 0} variants</span>}
                      </TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>{settings.currency} {product.price}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleDuplicate(product)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => {
                            setCurrentProduct(product);
                            setIsEditing(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OrdersManager() {
  const { settings } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = async () => {
    const snapshot = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
    setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'orders', id), { status });
    toast.success('Order status updated');
    fetchOrders();
  };

  const deleteOrder = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'orders', id));
      toast.success('Order deleted');
      fetchOrders();
    } catch (error) {
      toast.error('Error deleting order');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Orders</h2>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">{order.id?.slice(0, 8)}...</TableCell>
                <TableCell>
                  <div className="font-medium">{order.customerName}</div>
                  <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                </TableCell>
                <TableCell className="font-bold">{settings.currency} {order.totalAmount}</TableCell>
                <TableCell>
                  <Select value={order.status} onValueChange={v => updateStatus(order.id!, v)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Confirmed">Confirmed</SelectItem>
                      <SelectItem value="Shipped">Shipped</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Dialog>
                      <DialogTrigger render={<Button variant="outline" size="sm">Details</Button>} />
                      <DialogContent>
                        <DialogHeader><DialogTitle>Order Details</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Customer</p>
                              <p className="font-bold">{order.customerName}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Phone</p>
                              <p className="font-bold">{order.customerPhone}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-muted-foreground">Address</p>
                              <p className="font-bold">{order.address}</p>
                            </div>
                          </div>
                          <div className="border-t pt-4">
                            <p className="font-bold mb-2">Items</p>
                            {order.items.map((item, i) => (
                              <div key={i} className="flex justify-between text-sm py-1">
                                <span>{item.title} (x{item.quantity}) - {item.selectedSize}</span>
                                <span>{settings.currency} {(item.price) * item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="icon" onClick={() => deleteOrder(order.id!)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  </div>
);
}

function StoreSettingsManager() {
  const [settings, setSettings] = useState<StoreSettings>({
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
    headerMenu: [],
    footerMenu: [],
    adsenseCode: '',
    headerAdEnabled: false,
    footerAdEnabled: false,
    inPageAdEnabled: false,
    socialLinks: { facebook: '', instagram: '', twitter: '', youtube: '' },
    footerText: '',
    newsletterBlock: {
      enabled: true,
      title: 'GET 20% OFF YOUR FIRST ORDER',
      description: 'Join our newsletter and stay updated with the latest drops, exclusive offers, and fashion tips.',
      buttonText: 'Subscribe',
      imageUrl: 'https://picsum.photos/seed/newsletter/800/600',
      backgroundColor: '#dc2626',
      textColor: '#ffffff'
    },
    defaultSeoTitle: 'BS Stocks | Premium Fashion',
    defaultSeoDescription: 'The best place for premium tracksuits and fashion.',
    trackingCode: '',
    features: { reviews: true, wishlist: true }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const snap = await getDoc(doc(db, 'settings', 'config'));
      if (snap.exists()) {
        setSettings(prev => ({ ...prev, ...snap.data() }));
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'settings', 'config'), settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Error saving settings');
    }
  };

  if (loading) return <div className="p-10 text-center">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Store Settings</h2>
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">Save All Changes</Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-background border w-full justify-start h-auto p-1 flex-wrap">
          <TabsTrigger value="general" className="gap-2"><Settings className="h-4 w-4" /> General</TabsTrigger>
          <TabsTrigger value="branding" className="gap-2"><Globe className="h-4 w-4" /> Branding</TabsTrigger>
          <TabsTrigger value="design" className="gap-2"><Layout className="h-4 w-4" /> Homepage</TabsTrigger>
          <TabsTrigger value="theme" className="gap-2"><Palette className="h-4 w-4" /> Theme</TabsTrigger>
          <TabsTrigger value="navigation" className="gap-2"><Menu className="h-4 w-4" /> Navigation</TabsTrigger>
          <TabsTrigger value="social" className="gap-2"><Share2 className="h-4 w-4" /> Social</TabsTrigger>
          <TabsTrigger value="footer" className="gap-2"><FileText className="h-4 w-4" /> Footer</TabsTrigger>
          <TabsTrigger value="ads" className="gap-2"><Megaphone className="h-4 w-4" /> Ads</TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2"><Monitor className="h-4 w-4" /> Advanced</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="general">
            <Card>
              <CardHeader><CardTitle>General Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Store Name</Label>
                    <Input value={settings.storeName} onChange={e => setSettings(s => ({ ...s, storeName: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Site Tagline</Label>
                    <Input value={settings.tagline} onChange={e => setSettings(s => ({ ...s, tagline: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input value={settings.contactEmail} onChange={e => setSettings(s => ({ ...s, contactEmail: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input value={settings.contactPhone} onChange={e => setSettings(s => ({ ...s, contactPhone: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Store Currency</Label>
                    <Input value={settings.currency} onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))} placeholder="e.g. PKR, USD, EUR" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Store Address</Label>
                  <textarea 
                    className="w-full min-h-[80px] p-3 rounded-md border bg-background"
                    value={settings.address} 
                    onChange={e => setSettings(s => ({ ...s, address: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding">
            <Card>
              <CardHeader><CardTitle>Branding & Assets</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Site Logo URL (PNG)</Label>
                      <Input value={settings.logoUrl} onChange={e => setSettings(s => ({ ...s, logoUrl: e.target.value }))} placeholder="https://..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Favicon URL (PNG)</Label>
                      <Input value={settings.faviconUrl} onChange={e => setSettings(s => ({ ...s, faviconUrl: e.target.value }))} placeholder="https://..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Logo Size</Label>
                      <Select value={settings.logoSize} onValueChange={val => setSettings(s => ({ ...s, logoSize: val as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="border rounded-xl p-6 flex flex-col items-center justify-center bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-4 uppercase tracking-widest font-bold">Logo Preview</p>
                    {settings.logoUrl ? (
                      <img 
                        src={settings.logoUrl} 
                        alt="Logo Preview" 
                        className={cn(
                          "object-contain transition-all",
                          settings.logoSize === 'small' ? 'h-8' : settings.logoSize === 'medium' ? 'h-12' : 'h-16'
                        )}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-muted-foreground italic">No logo uploaded</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="design">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Announcement Bar</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Enable Announcement Bar</Label>
                    <input 
                      type="checkbox" 
                      checked={settings.announcementBar.enabled} 
                      onChange={e => setSettings(s => ({ ...s, announcementBar: { ...s.announcementBar, enabled: e.target.checked } }))}
                      className="h-5 w-5"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Marquee Text</Label>
                      <Input 
                        value={settings.announcementBar.text} 
                        onChange={e => setSettings(s => ({ ...s, announcementBar: { ...s.announcementBar, text: e.target.value } }))}
                        placeholder="Free shipping on orders over $100!"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Link (Optional)</Label>
                      <Input 
                        value={settings.announcementBar.link} 
                        onChange={e => setSettings(s => ({ ...s, announcementBar: { ...s.announcementBar, link: e.target.value } }))}
                        placeholder="/products"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Homepage Hero Banners</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    {settings.banners.map((banner, idx) => (
                      <div key={banner.id} className="p-4 border rounded-xl bg-muted/20 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="font-bold">Slide {idx + 1}</span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => {
                            const newBanners = [...settings.banners];
                            newBanners.splice(idx, 1);
                            setSettings(s => ({ ...s, banners: newBanners }));
                          }}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Image URL</Label>
                            <Input value={banner.imageUrl} onChange={e => {
                              const newBanners = [...settings.banners];
                              newBanners[idx].imageUrl = e.target.value;
                              setSettings(s => ({ ...s, banners: newBanners }));
                            }} />
                          </div>
                          <div className="space-y-2">
                            <Label>Caption</Label>
                            <Input value={banner.caption} onChange={e => {
                              const newBanners = [...settings.banners];
                              newBanners[idx].caption = e.target.value;
                              setSettings(s => ({ ...s, banners: newBanners }));
                            }} />
                          </div>
                          <div className="space-y-2">
                            <Label>Button Text</Label>
                            <Input value={banner.buttonText} onChange={e => {
                              const newBanners = [...settings.banners];
                              newBanners[idx].buttonText = e.target.value;
                              setSettings(s => ({ ...s, banners: newBanners }));
                            }} />
                          </div>
                          <div className="space-y-2">
                            <Label>Button Link</Label>
                            <Input value={banner.buttonLink} onChange={e => {
                              const newBanners = [...settings.banners];
                              newBanners[idx].buttonLink = e.target.value;
                              setSettings(s => ({ ...s, banners: newBanners }));
                            }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full border-dashed" onClick={() => {
                      const newBanner: Banner = {
                        id: Math.random().toString(36).substr(2, 9),
                        imageUrl: '',
                        caption: '',
                        buttonText: 'Shop Now',
                        buttonLink: '/products'
                      };
                      setSettings(s => ({ ...s, banners: [...s.banners, newBanner] }));
                    }}>
                      <Plus className="h-4 w-4 mr-2" /> Add Slide
                    </Button>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Label>Enable Slider Autoplay</Label>
                    <input 
                      type="checkbox" 
                      checked={settings.sliderAutoplay} 
                      onChange={e => setSettings(s => ({ ...s, sliderAutoplay: e.target.checked }))}
                      className="h-5 w-5"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Homepage Captions</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Main Heading</Label>
                    <Input value={settings.homepageHeading} onChange={e => setSettings(s => ({ ...s, homepageHeading: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Subheading / Description</Label>
                    <textarea 
                      className="w-full min-h-[80px] p-3 rounded-md border bg-background"
                      value={settings.homepageSubheading} 
                      onChange={e => setSettings(s => ({ ...s, homepageSubheading: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Newsletter Section</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Enable Newsletter Block</Label>
                    <input 
                      type="checkbox" 
                      checked={settings.newsletterBlock?.enabled ?? true} 
                      onChange={e => setSettings(s => ({ ...s, newsletterBlock: { ...(s.newsletterBlock || {}), enabled: e.target.checked } }))}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input 
                        value={settings.newsletterBlock?.title || ''} 
                        onChange={e => setSettings(s => ({ ...s, newsletterBlock: { ...(s.newsletterBlock || {}), title: e.target.value } }))}
                        placeholder="GET 20% OFF YOUR FIRST ORDER"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Button Text</Label>
                      <Input 
                        value={settings.newsletterBlock?.buttonText || ''} 
                        onChange={e => setSettings(s => ({ ...s, newsletterBlock: { ...(s.newsletterBlock || {}), buttonText: e.target.value } }))}
                        placeholder="Subscribe"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Description</Label>
                      <textarea 
                        className="w-full min-h-[80px] p-3 rounded-md border bg-background"
                        value={settings.newsletterBlock?.description || ''} 
                        onChange={e => setSettings(s => ({ ...s, newsletterBlock: { ...(s.newsletterBlock || {}), description: e.target.value } }))}
                        placeholder="Join our newsletter and stay updated..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Image URL</Label>
                      <Input 
                        value={settings.newsletterBlock?.imageUrl || ''} 
                        onChange={e => setSettings(s => ({ ...s, newsletterBlock: { ...(s.newsletterBlock || {}), imageUrl: e.target.value } }))}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Background Color</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="color" 
                            className="w-12 h-10 p-1" 
                            value={settings.newsletterBlock?.backgroundColor || '#dc2626'} 
                            onChange={e => setSettings(s => ({ ...s, newsletterBlock: { ...(s.newsletterBlock || {}), backgroundColor: e.target.value } }))} 
                          />
                          <Input 
                            value={settings.newsletterBlock?.backgroundColor || '#dc2626'} 
                            onChange={e => setSettings(s => ({ ...s, newsletterBlock: { ...(s.newsletterBlock || {}), backgroundColor: e.target.value } }))} 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Text Color</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="color" 
                            className="w-12 h-10 p-1" 
                            value={settings.newsletterBlock?.textColor || '#ffffff'} 
                            onChange={e => setSettings(s => ({ ...s, newsletterBlock: { ...(s.newsletterBlock || {}), textColor: e.target.value } }))} 
                          />
                          <Input 
                            value={settings.newsletterBlock?.textColor || '#ffffff'} 
                            onChange={e => setSettings(s => ({ ...s, newsletterBlock: { ...(s.newsletterBlock || {}), textColor: e.target.value } }))} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="theme">
            <Card>
              <CardHeader><CardTitle>Theme & Appearance</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <div className="flex gap-2">
                        <Input type="color" className="w-12 h-10 p-1" value={settings.themeColor} onChange={e => setSettings(s => ({ ...s, themeColor: e.target.value }))} />
                        <Input value={settings.themeColor} onChange={e => setSettings(s => ({ ...s, themeColor: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input type="color" className="w-12 h-10 p-1" value={settings.secondaryColor} onChange={e => setSettings(s => ({ ...s, secondaryColor: e.target.value }))} />
                        <Input value={settings.secondaryColor} onChange={e => setSettings(s => ({ ...s, secondaryColor: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Font Family</Label>
                      <Select value={settings.fontFamily} onValueChange={val => setSettings(s => ({ ...s, fontFamily: val }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inter">Inter (Modern Sans)</SelectItem>
                          <SelectItem value="Outfit">Outfit (Clean Sans)</SelectItem>
                          <SelectItem value="Space Grotesk">Space Grotesk (Tech)</SelectItem>
                          <SelectItem value="Playfair Display">Playfair Display (Serif)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Button Style</Label>
                      <Select value={settings.buttonStyle} onValueChange={val => setSettings(s => ({ ...s, buttonStyle: val as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rounded">Rounded (Pill)</SelectItem>
                          <SelectItem value="square">Square (Sharp)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label>Predefined Themes</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { name: 'Blue + Black', primary: '#2563eb', secondary: '#000000' },
                        { name: 'Red + Black', primary: '#dc2626', secondary: '#000000' },
                        { name: 'Green + White', primary: '#16a34a', secondary: '#ffffff' },
                        { name: 'Purple + Black', primary: '#9333ea', secondary: '#000000' },
                      ].map(t => (
                        <button 
                          key={t.name}
                          onClick={() => setSettings(s => ({ ...s, themeColor: t.primary, secondaryColor: t.secondary }))}
                          className="p-3 border rounded-xl hover:border-primary transition-all text-left space-y-2"
                        >
                          <div className="flex gap-1">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.primary }} />
                            <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: t.secondary }} />
                          </div>
                          <span className="text-xs font-medium">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="navigation">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Header Menu</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {settings.headerMenu.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/10">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Input 
                        className="h-8 text-xs" 
                        value={item.label} 
                        onChange={e => {
                          const newMenu = [...settings.headerMenu];
                          newMenu[idx].label = e.target.value;
                          setSettings(s => ({ ...s, headerMenu: newMenu }));
                        }} 
                      />
                      <Input 
                        className="h-8 text-xs" 
                        value={item.path} 
                        onChange={e => {
                          const newMenu = [...settings.headerMenu];
                          newMenu[idx].path = e.target.value;
                          setSettings(s => ({ ...s, headerMenu: newMenu }));
                        }} 
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                        const newMenu = [...settings.headerMenu];
                        newMenu.splice(idx, 1);
                        setSettings(s => ({ ...s, headerMenu: newMenu }));
                      }}>
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => {
                    const newItem: MenuItem = { id: Math.random().toString(36).substr(2, 9), label: 'New Link', path: '/' };
                    setSettings(s => ({ ...s, headerMenu: [...s.headerMenu, newItem] }));
                  }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Menu Item
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Footer Menu</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {settings.footerMenu.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/10">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Input 
                        className="h-8 text-xs" 
                        value={item.label} 
                        onChange={e => {
                          const newMenu = [...settings.footerMenu];
                          newMenu[idx].label = e.target.value;
                          setSettings(s => ({ ...s, footerMenu: newMenu }));
                        }} 
                      />
                      <Input 
                        className="h-8 text-xs" 
                        value={item.path} 
                        onChange={e => {
                          const newMenu = [...settings.footerMenu];
                          newMenu[idx].path = e.target.value;
                          setSettings(s => ({ ...s, footerMenu: newMenu }));
                        }} 
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                        const newMenu = [...settings.footerMenu];
                        newMenu.splice(idx, 1);
                        setSettings(s => ({ ...s, footerMenu: newMenu }));
                      }}>
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => {
                    const newItem: MenuItem = { id: Math.random().toString(36).substr(2, 9), label: 'New Link', path: '/' };
                    setSettings(s => ({ ...s, footerMenu: [...s.footerMenu, newItem] }));
                  }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Menu Item
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="social">
            <Card>
              <CardHeader><CardTitle>Social Media Links</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Facebook URL</Label>
                    <Input value={settings.socialLinks.facebook} onChange={e => setSettings(s => ({ ...s, socialLinks: { ...s.socialLinks, facebook: e.target.value } }))} placeholder="https://facebook.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Instagram URL</Label>
                    <Input value={settings.socialLinks.instagram} onChange={e => setSettings(s => ({ ...s, socialLinks: { ...s.socialLinks, instagram: e.target.value } }))} placeholder="https://instagram.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Twitter / X URL</Label>
                    <Input value={settings.socialLinks.twitter} onChange={e => setSettings(s => ({ ...s, socialLinks: { ...s.socialLinks, twitter: e.target.value } }))} placeholder="https://twitter.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>YouTube URL</Label>
                    <Input value={settings.socialLinks.youtube} onChange={e => setSettings(s => ({ ...s, socialLinks: { ...s.socialLinks, youtube: e.target.value } }))} placeholder="https://youtube.com/..." />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="footer">
            <Card>
              <CardHeader><CardTitle>Footer Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Lower Footer Text</Label>
                  <textarea 
                    className="w-full min-h-[100px] p-3 rounded-md border bg-background"
                    value={settings.footerText} 
                    onChange={e => setSettings(s => ({ ...s, footerText: e.target.value }))}
                    placeholder="e.g. Premium fashion clothing store. Quality and style guaranteed."
                  />
                  <p className="text-xs text-muted-foreground">This text appears in the footer under the store name.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ads">
            <Card>
              <CardHeader><CardTitle>Ads & Monetization</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Google AdSense Code</Label>
                  <textarea 
                    className="w-full min-h-[120px] p-3 rounded-md border bg-background font-mono text-xs"
                    value={settings.adsenseCode} 
                    onChange={e => setSettings(s => ({ ...s, adsenseCode: e.target.value }))}
                    placeholder="<script async src='...'></script>"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Enable Header Ad Section</Label>
                    <input type="checkbox" checked={settings.headerAdEnabled} onChange={e => setSettings(s => ({ ...s, headerAdEnabled: e.target.checked }))} className="h-5 w-5" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Enable Footer Ad Section</Label>
                    <input type="checkbox" checked={settings.footerAdEnabled} onChange={e => setSettings(s => ({ ...s, footerAdEnabled: e.target.checked }))} className="h-5 w-5" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Enable In-Page Ad Placement</Label>
                    <input type="checkbox" checked={settings.inPageAdEnabled} onChange={e => setSettings(s => ({ ...s, inPageAdEnabled: e.target.checked }))} className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>SEO Defaults</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Default Meta Title</Label>
                    <Input value={settings.defaultSeoTitle} onChange={e => setSettings(s => ({ ...s, defaultSeoTitle: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Default Meta Description</Label>
                    <textarea 
                      className="w-full min-h-[80px] p-3 rounded-md border bg-background"
                      value={settings.defaultSeoDescription} 
                      onChange={e => setSettings(s => ({ ...s, defaultSeoDescription: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Tracking & Features</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Google Analytics / Tracking Code</Label>
                    <textarea 
                      className="w-full min-h-[80px] p-3 rounded-md border bg-background font-mono text-xs"
                      value={settings.trackingCode} 
                      onChange={e => setSettings(s => ({ ...s, trackingCode: e.target.value }))}
                      placeholder="UA-XXXXX-Y"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label>Enable Reviews</Label>
                      <input type="checkbox" checked={settings.features.reviews} onChange={e => setSettings(s => ({ ...s, features: { ...s.features, reviews: e.target.checked } }))} className="h-5 w-5" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Enable Wishlist</Label>
                      <input type="checkbox" checked={settings.features.wishlist} onChange={e => setSettings(s => ({ ...s, features: { ...s.features, wishlist: e.target.checked } }))} className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function CollectionsManager() {
  const { collections } = useSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [currentCollection, setCurrentCollection] = useState<Partial<Collection> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCollection?.name) return toast.error('Name is required');

    setLoading(true);
    try {
      const colData = {
        ...currentCollection,
        slug: currentCollection.slug || currentCollection.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        createdAt: currentCollection.id ? currentCollection.createdAt : serverTimestamp(),
      };

      if (currentCollection.id) {
        await updateDoc(doc(db, 'collections', currentCollection.id), colData);
        toast.success('Collection updated');
      } else {
        await addDoc(collection(db, 'collections'), colData);
        toast.success('Collection created');
      }
      setIsEditing(false);
      setCurrentCollection(null);
    } catch (error) {
      toast.error('Error saving collection');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'collections', id));
      toast.success('Collection deleted');
    } catch (error) {
      toast.error('Error deleting collection');
    }
  };

  const handleSeed = async () => {
    if (collections.length > 0) return toast.info('Collections already exist');
    setLoading(true);
    try {
      const initial = ['Tracksuits', 'Trousers', 'T-Shirts'];
      for (const name of initial) {
        await addDoc(collection(db, 'collections'), {
          name,
          slug: name.toLowerCase().replace(/ /g, '-'),
          createdAt: serverTimestamp()
        });
      }
      toast.success('Initial collections seeded');
    } catch (error) {
      toast.error('Error seeding collections');
    } finally {
      setLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setIsEditing(false)}><X className="h-4 w-4" /></Button>
            <h2 className="text-2xl font-bold">{currentCollection?.id ? 'Edit Collection' : 'New Collection'}</h2>
          </div>
          <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? 'Saving...' : 'Save Collection'}
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Collection Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Collection Name *</Label>
              <Input 
                value={currentCollection?.name || ''} 
                onChange={e => setCurrentCollection(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Tracksuits"
              />
            </div>
            <div className="space-y-2">
              <Label>URL Slug</Label>
              <Input 
                value={currentCollection?.slug || ''} 
                onChange={e => setCurrentCollection(p => ({ ...p, slug: e.target.value }))}
                placeholder="tracksuits"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea 
                className="w-full min-h-[100px] p-3 rounded-md border bg-background"
                value={currentCollection?.description || ''} 
                onChange={e => setCurrentCollection(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL (Optional)</Label>
              <Input 
                value={currentCollection?.image || ''} 
                onChange={e => setCurrentCollection(p => ({ ...p, image: e.target.value }))}
                placeholder="https://picsum.photos/..."
              />
              <p className="text-xs text-muted-foreground">If left blank, a random product image from this collection will be used.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Collections</h2>
        <div className="flex gap-2">
          {collections.length === 0 && (
            <Button variant="outline" onClick={handleSeed} disabled={loading}>
              Seed Initial
            </Button>
          )}
          <Button onClick={() => {
            setCurrentCollection({ name: '', slug: '' });
            setIsEditing(true);
          }} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Collection
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-10">No collections found</TableCell></TableRow>
              ) : (
                collections.map(col => (
                  <TableRow key={col.id}>
                    <TableCell className="font-bold">{col.name}</TableCell>
                    <TableCell className="text-muted-foreground">/products?category={col.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setCurrentCollection(col); setIsEditing(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(col.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function PagesManager() {
  const [pages, setPages] = useState<StandardPage[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState<Partial<StandardPage> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPages = async () => {
    setLoading(true);
    const snapshot = await getDocs(query(collection(db, 'pages'), orderBy('createdAt', 'desc')));
    setPages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StandardPage)));
    setLoading(false);
  };

  useEffect(() => { fetchPages(); }, []);

  const handleSave = async () => {
    if (!currentPage?.title || !currentPage?.slug) return toast.error('Title and Slug are required');
    
    const pageData = {
      ...currentPage,
      createdAt: currentPage.id ? currentPage.createdAt : serverTimestamp(),
      status: currentPage.status || 'Draft',
      seoTitle: currentPage.seoTitle || currentPage.title,
      seoDescription: currentPage.seoDescription || '',
    };

    try {
      if (currentPage.id) {
        await updateDoc(doc(db, 'pages', currentPage.id), pageData);
        toast.success('Page updated');
      } else {
        await addDoc(collection(db, 'pages'), pageData);
        toast.success('Page created');
      }
      setIsEditing(false);
      fetchPages();
    } catch (error) {
      toast.error('Error saving page');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'pages', id));
    toast.success('Page deleted');
    fetchPages();
  };

  const handleSeedCorePages = async () => {
    setLoading(true);
    try {
      const corePages = [
        { title: 'About Us', slug: 'about-us', content: '<p>Welcome to our store. We are dedicated to providing the best fashion clothing...</p>' },
        { title: 'Contact Us', slug: 'contact-us', content: '<p>Have questions? Reach out to us using the form below or via our contact details.</p>' },
        { title: 'Shipping Policy', slug: 'shipping-policy', content: '<p>We offer fast and reliable shipping to all our customers...</p>' },
        { title: 'Privacy Policy', slug: 'privacy-policy', content: '<p>Your privacy is important to us. We collect and use your data only to improve your experience...</p>' },
      ];

      for (const page of corePages) {
        const q = query(collection(db, 'pages'), where('slug', '==', page.slug));
        const snap = await getDocs(q);
        if (snap.empty) {
          await addDoc(collection(db, 'pages'), {
            ...page,
            status: 'Published',
            seoTitle: `${page.title} | BS Stocks`,
            seoDescription: `Learn more about our ${page.title.toLowerCase()}.`,
            createdAt: serverTimestamp()
          });
        }
      }
      toast.success('Core pages seeded');
      fetchPages();
    } catch (error) {
      console.error(error);
      toast.error('Error seeding core pages');
    } finally {
      setLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setIsEditing(false)}><X className="h-4 w-4" /></Button>
            <h2 className="text-2xl font-bold">{currentPage?.id ? 'Edit Page' : 'New Page'}</h2>
          </div>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">Save Page</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Page Content</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Page Title</Label>
                  <Input value={currentPage?.title || ''} onChange={e => setCurrentPage(p => ({ ...p, title: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-') }))} />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <div className="min-h-[400px] border rounded-md overflow-hidden bg-background">
                    <ReactQuill 
                      theme="snow" 
                      value={currentPage?.content || ''} 
                      onChange={val => setCurrentPage(p => ({ ...p, content: val }))}
                      className="h-[350px]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Search Engine Listing</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>SEO Title</Label>
                  <Input value={currentPage?.seoTitle || ''} onChange={e => setCurrentPage(p => ({ ...p, seoTitle: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <textarea 
                    className="w-full min-h-[80px] p-3 rounded-md border bg-background"
                    value={currentPage?.seoDescription || ''} 
                    onChange={e => setCurrentPage(p => ({ ...p, seoDescription: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL Slug</Label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>/pages/</span>
                    <Input className="h-8" value={currentPage?.slug || ''} onChange={e => setCurrentPage(p => ({ ...p, slug: e.target.value }))} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Visibility</CardTitle></CardHeader>
              <CardContent>
                <Select value={currentPage?.status || 'Draft'} onValueChange={val => setCurrentPage(p => ({ ...p, status: val as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Standard Pages</h2>
        <div className="flex gap-2">
          {pages.length === 0 && (
            <Button variant="outline" onClick={handleSeedCorePages} disabled={loading}>
              Seed Core Pages
            </Button>
          )}
          <Button onClick={() => {
            setCurrentPage({ title: '', content: '', slug: '', status: 'Draft' });
            setIsEditing(true);
          }} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> Create Page
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10">Loading pages...</TableCell></TableRow>
            ) : pages.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10">No pages found</TableCell></TableRow>
            ) : (
              pages.map(page => (
                <TableRow key={page.id}>
                  <TableCell className="font-bold">{page.title} <span className="text-xs font-normal text-muted-foreground block">/pages/{page.slug}</span></TableCell>
                  <TableCell><Badge variant={page.status === 'Published' ? 'default' : 'secondary'}>{page.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{page.createdAt?.toDate ? page.createdAt.toDate().toLocaleDateString() : 'Just now'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setCurrentPage(page); setIsEditing(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(page.id!)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  </div>
);
}

// --- Import/Export Manager ---

function ImportExportManager() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleShopifyImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importShopifyProducts(file, setImporting);
    if (e.target) e.target.value = '';
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const snap = await getDocs(collection(db, 'products'));
      const products = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      
      const exportData = products.map(p => ({
        Handle: p.slug,
        Title: p.title,
        'Body (HTML)': p.description,
        Vendor: p.vendor,
        Type: p.category,
        Tags: p.tags.join(', '),
        Published: p.status === 'Active' ? 'TRUE' : 'FALSE',
        'Variant SKU': p.sku,
        'Variant Price': p.price,
        'Variant Compare At Price': p.compareAtPrice || '',
        'Variant Inventory Qty': p.stockQuantity,
        'Image Src': p.images[0] || '',
        'SEO Title': p.seoTitle || '',
        'SEO Description': p.seoDescription || ''
      }));

      const csv = Papa.unparse(exportData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Products exported successfully');
    } catch (error) {
      console.error(error);
      toast.error('Error exporting products');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Import & Export</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Import Shopify CSV */}
        <Card className="border-2 border-dashed border-muted hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Upload className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Import Shopify Products</CardTitle>
            <CardDescription>
              Upload a Shopify-exported CSV file to bulk import products, variants, and images.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg text-xs space-y-2">
                <p className="font-bold">Supported Columns:</p>
                <ul className="list-disc list-inside grid grid-cols-2 gap-1">
                  <li>Handle (Slug)</li>
                  <li>Title</li>
                  <li>Body (HTML)</li>
                  <li>Vendor & Type</li>
                  <li>Variant Price</li>
                  <li>Variant SKU</li>
                  <li>Image Src</li>
                </ul>
              </div>
              <div className="relative">
                <Input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleShopifyImport}
                  disabled={importing}
                  className="cursor-pointer opacity-0 absolute inset-0 z-10"
                />
                <Button variant="outline" className="w-full gap-2" disabled={importing}>
                  {importing ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  {importing ? 'Processing CSV...' : 'Choose Shopify CSV File'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Products */}
        <Card className="border-2 border-dashed border-muted hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Download className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Export All Products</CardTitle>
            <CardDescription>
              Download your entire product catalog as a CSV file for backup or bulk editing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full gap-2" 
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? 'Generating CSV...' : 'Download Products CSV'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Admin Layout ---

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === 'salfi6692@gmail.com') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        if (location.pathname.startsWith('/admin')) {
          toast.error('Access denied. Admin only.');
          navigate('/');
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  if (isAdmin === null) return <div className="p-20 text-center">Checking permissions...</div>;
  if (!isAdmin) return null;

  const menuItems = [
    { icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', path: '/admin' },
    { icon: <Package className="h-5 w-5" />, label: 'Products', path: '/admin/products' },
    { icon: <Layout className="h-5 w-5" />, label: 'Collections', path: '/admin/collections' },
    { icon: <ShoppingBag className="h-5 w-5" />, label: 'Orders', path: '/admin/orders' },
    { icon: <FileSpreadsheet className="h-5 w-5" />, label: 'Import/Export', path: '/admin/import-export' },
    { icon: <FileText className="h-5 w-5" />, label: 'Pages', path: '/admin/pages' },
    { icon: <Settings className="h-5 w-5" />, label: 'Settings', path: '/admin/settings' },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] bg-muted/30">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-background border-b">
        <h2 className="text-lg font-bold tracking-tighter">ADMIN PANEL</h2>
        <Sheet>
          <SheetTrigger render={<Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button>} />
          <SheetContent side="left" className="w-64 p-0">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold tracking-tighter">ADMIN PANEL</h2>
            </div>
            <nav className="px-4 py-6 space-y-2">
              {menuItems.map((item) => (
                <SheetClose key={item.path} render={
                  <Link 
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                      location.pathname === item.path ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-muted"
                    )}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                } />
              ))}
              <button 
                onClick={logout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-destructive hover:bg-destructive/10 mt-10"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Logout</span>
              </button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Sidebar */}
      <aside className="w-64 bg-background border-r hidden md:block shrink-0">
        <div className="p-6">
          <h2 className="text-lg font-bold tracking-tighter">ADMIN PANEL</h2>
        </div>
        <nav className="px-4 space-y-2">
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                location.pathname === item.path ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-muted"
              )}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-destructive hover:bg-destructive/10 mt-10"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-8 overflow-x-hidden">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductsManager />} />
          <Route path="collections" element={<CollectionsManager />} />
          <Route path="orders" element={<OrdersManager />} />
          <Route path="import-export" element={<ImportExportManager />} />
          <Route path="pages" element={<PagesManager />} />
          <Route path="settings" element={<StoreSettingsManager />} />
        </Routes>
      </main>
    </div>
  );
}
