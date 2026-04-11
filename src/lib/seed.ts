import { collection, getDocs, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db, auth, createUserWithEmailAndPassword } from '../firebase';

const MOCK_PRODUCTS = [
  {
    title: "Premium Tech Tracksuit",
    description: "<p>Our signature tech tracksuit designed for maximum performance and style. Features moisture-wicking fabric and a modern tapered fit.</p>",
    price: 120,
    compareAtPrice: 150,
    category: "Tracksuits",
    vendor: "BS Stocks",
    images: ["https://picsum.photos/seed/tracksuit1/800/1000", "https://picsum.photos/seed/tracksuit2/800/1000"],
    sku: "TRK-001",
    stockQuantity: 25,
    trackInventory: true,
    continueSellingOutOfStock: false,
    hasVariants: true,
    variants: [
      { id: "v1", size: "M", color: "Black", price: 120, sku: "TRK-001-M", stock: 15 },
      { id: "v2", size: "L", color: "Black", price: 120, sku: "TRK-001-L", stock: 10 }
    ],
    isPhysical: true,
    weight: 0.8,
    slug: "premium-tech-tracksuit",
    status: "Active",
    tags: ["new", "premium"],
    collections: ["Featured"],
    rating: 4.8,
    reviewCount: 42,
    createdAt: serverTimestamp()
  },
  {
    title: "Essential Cotton T-Shirt",
    description: "<p>The perfect everyday t-shirt made from 100% organic cotton. Soft, breathable, and durable.</p>",
    price: 35,
    category: "T-Shirts",
    vendor: "BS Stocks",
    images: ["https://picsum.photos/seed/tshirt1/800/1000"],
    sku: "TSH-001",
    stockQuantity: 90,
    trackInventory: true,
    continueSellingOutOfStock: false,
    hasVariants: false,
    variants: [],
    isPhysical: true,
    weight: 0.2,
    slug: "essential-cotton-t-shirt",
    status: "Active",
    tags: ["basic", "cotton"],
    collections: ["New Arrival"],
    rating: 4.5,
    reviewCount: 128,
    createdAt: serverTimestamp()
  }
];

export const ensureAdminUser = async () => {
  const adminEmail = 'salfi6692@gmail.com';
  const adminPassword = 'Bilal@#$786';

  try {
    // Try to create the user. If they already exist, this will throw an error.
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    const user = userCredential.user;

    // Also create a user document in Firestore with the admin role
    await setDoc(doc(db, 'users', user.uid), {
      email: adminEmail,
      role: 'admin',
      createdAt: serverTimestamp()
    });
    
    console.log("Admin user created successfully!");
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log("Admin user already exists in Auth.");
    } else {
      console.error("Error ensuring admin user:", error);
    }
  }
};

export const seedDatabase = async () => {
  // Ensure admin user exists
  await ensureAdminUser();

  try {
    const snapshot = await getDocs(collection(db, 'products'));
    if (snapshot.empty) {
      console.log("Seeding database...");
      for (const product of MOCK_PRODUCTS) {
        await addDoc(collection(db, 'products'), product);
      }
      console.log("Database seeded!");
    }
  } catch (error) {
    // Silently fail seeding if permissions are missing (e.g. guest user)
    console.log("Seeding skipped or failed due to permissions.");
  }
};
