#!/usr/bin/env node

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Review = require('./models/Review');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce')
  .then(() => console.log('📊 Connected to MongoDB for data seeding'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Sample data
const sampleUsers = [
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    role: 'buyer',
    phone: '+1234567890',
    isVerified: true
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'password123',
    role: 'seller',
    phone: '+1234567891',
    isVerified: true,
    sellerInfo: {
      businessName: 'Jane\'s Fashion Store',
      businessAddress: {
        street: '123 Fashion St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA'
      },
      businessPhone: '+1234567891',
      taxId: 'TX123456789',
      isVerified: true,
      verificationDate: new Date(),
      rating: 4.5,
      totalSales: 150
    }
  },
  {
    name: 'Mike Johnson',
    email: 'mike@example.com',
    password: 'password123',
    role: 'seller',
    phone: '+1234567892',
    isVerified: true,
    sellerInfo: {
      businessName: 'TechGear Hub',
      businessAddress: {
        street: '456 Tech Ave',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'USA'
      },
      businessPhone: '+1234567892',
      taxId: 'TX987654321',
      isVerified: true,
      verificationDate: new Date(),
      rating: 4.8,
      totalSales: 89
    }
  },
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    isVerified: true
  }
];

const sampleCategories = [
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and gadgets',
    image: 'electronics.jpg',
    isActive: true,
    displayOrder: 1
  },
  {
    name: 'Clothing',
    slug: 'clothing',
    description: 'Fashion and apparel',
    image: 'clothing.jpg',
    isActive: true,
    displayOrder: 2
  },
  {
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    description: 'Sports equipment and fitness gear',
    image: 'sports.jpg',
    isActive: true,
    displayOrder: 3
  },
  {
    name: 'Home & Garden',
    slug: 'home-garden',
    description: 'Home improvement and garden supplies',
    image: 'home.jpg',
    isActive: true,
    displayOrder: 4
  },
  {
    name: 'Books',
    slug: 'books',
    description: 'Books and educational materials',
    image: 'books.jpg',
    isActive: true,
    displayOrder: 5
  }
];

const generateProducts = (users, categories) => [
  // Electronics
  {
    name: 'Wireless Bluetooth Headphones',
    slug: 'wireless-bluetooth-headphones',
    description: 'High-quality wireless headphones with noise cancellation and 20-hour battery life.',
    shortDescription: 'Premium wireless headphones with noise cancellation',
    price: 199.99,
    originalPrice: 249.99,
    discount: 20,
    sku: 'WBH001',
    category: categories.find(c => c.slug === 'electronics')._id,
    seller: users.find(u => u.sellerInfo?.businessName === 'TechGear Hub')._id,
    tags: ['wireless', 'bluetooth', 'headphones', 'audio', 'technology', 'music'],
    attributes: {
      material: 'plastic',
      gender: 'unisex',
      ageGroup: 'adult',
      season: 'all-season',
      occasion: ['casual', 'work', 'travel'],
      style: ['modern', 'minimalist']
    },
    brand: 'TechSound',
    inventory: 50,
    images: [
      { url: 'headphones-1.jpg', alt: 'Wireless headphones front view', isPrimary: true },
      { url: 'headphones-2.jpg', alt: 'Wireless headphones side view' }
    ],
    specifications: [
      { name: 'Battery Life', value: '20', unit: 'hours' },
      { name: 'Frequency Response', value: '20Hz-20kHz', unit: '' },
      { name: 'Weight', value: '250', unit: 'grams' }
    ],
    isFeatured: true,
    status: 'active',
    averageRating: 4.5,
    totalReviews: 45,
    totalSales: 123
  },
  {
    name: 'Vintage Handmade Leather Jacket',
    slug: 'vintage-handmade-leather-jacket',
    description: 'Authentic vintage-style leather jacket, handcrafted with premium materials. Each piece is unique.',
    shortDescription: 'Handcrafted vintage leather jacket',
    price: 299.99,
    originalPrice: 399.99,
    discount: 25,
    sku: 'VLJ001',
    category: categories.find(c => c.slug === 'clothing')._id,
    seller: users.find(u => u.sellerInfo?.businessName === 'Jane\'s Fashion Store')._id,
    tags: ['vintage', 'handmade', 'leather', 'jacket', 'fashion', 'clothing', 'unique', 'custom'],
    attributes: {
      material: 'leather',
      gender: 'unisex',
      ageGroup: 'adult',
      season: 'fall',
      occasion: ['casual', 'party', 'date'],
      style: ['vintage', 'classic', 'bohemian']
    },
    brand: 'Artisan Leather Co',
    inventory: 3,
    images: [
      { url: 'jacket-1.jpg', alt: 'Vintage leather jacket front', isPrimary: true },
      { url: 'jacket-2.jpg', alt: 'Vintage leather jacket back' }
    ],
    isUnique: true,
    uniquenessScore: 85,
    isFeatured: true,
    status: 'active',
    averageRating: 4.8,
    totalReviews: 12,
    totalSales: 8
  },
  {
    name: 'Professional Running Shoes',
    slug: 'professional-running-shoes',
    description: 'High-performance running shoes designed for professional athletes and fitness enthusiasts.',
    shortDescription: 'Professional-grade running shoes',
    price: 149.99,
    originalPrice: 179.99,
    discount: 17,
    sku: 'PRS001',
    category: categories.find(c => c.slug === 'sports-fitness')._id,
    seller: users.find(u => u.sellerInfo?.businessName === 'TechGear Hub')._id,
    tags: ['running', 'shoes', 'fitness', 'sports', 'athletic', 'training', 'marathon'],
    attributes: {
      material: 'synthetic',
      gender: 'unisex',
      ageGroup: 'adult',
      season: 'all-season',
      occasion: ['sports', 'fitness', 'running'],
      style: ['modern', 'athletic', 'performance']
    },
    brand: 'ProFit',
    inventory: 75,
    images: [
      { url: 'shoes-1.jpg', alt: 'Running shoes side view', isPrimary: true },
      { url: 'shoes-2.jpg', alt: 'Running shoes sole view' }
    ],
    variants: [
      { name: 'Size', values: ['7', '8', '9', '10', '11', '12'] },
      { name: 'Color', values: ['Black', 'White', 'Blue', 'Red'] }
    ],
    isFeatured: true,
    status: 'active',
    averageRating: 4.6,
    totalReviews: 89,
    totalSales: 156
  },
  {
    name: 'Smart Home LED Light Bulbs (4-Pack)',
    slug: 'smart-home-led-light-bulbs-4-pack',
    description: 'WiFi-enabled smart LED bulbs that can be controlled via smartphone app. Energy efficient and customizable.',
    shortDescription: 'WiFi smart LED bulbs with app control',
    price: 79.99,
    originalPrice: 99.99,
    discount: 20,
    sku: 'SLB004',
    category: categories.find(c => c.slug === 'home-garden')._id,
    seller: users.find(u => u.sellerInfo?.businessName === 'TechGear Hub')._id,
    tags: ['smart-home', 'led', 'lights', 'wifi', 'energy-efficient', 'technology', 'automation'],
    attributes: {
      material: 'plastic',
      gender: 'unisex',
      ageGroup: 'adult',
      season: 'all-season',
      occasion: ['home', 'work', 'decoration'],
      style: ['modern', 'minimalist', 'tech']
    },
    brand: 'SmartLite',
    inventory: 120,
    images: [
      { url: 'smartbulbs-1.jpg', alt: 'Smart LED bulbs pack', isPrimary: true },
      { url: 'smartbulbs-2.jpg', alt: 'Smart bulb in fixture' }
    ],
    specifications: [
      { name: 'Wattage', value: '9', unit: 'watts' },
      { name: 'Equivalent', value: '60', unit: 'watts incandescent' },
      { name: 'Lifespan', value: '25000', unit: 'hours' }
    ],
    status: 'active',
    averageRating: 4.4,
    totalReviews: 67,
    totalSales: 234
  },
  {
    name: 'Limited Edition Programming Guide',
    slug: 'limited-edition-programming-guide',
    description: 'Rare first edition programming guide signed by the author. Perfect for collectors and developers.',
    shortDescription: 'Signed first edition programming guide',
    price: 499.99,
    sku: 'LEP001',
    category: categories.find(c => c.slug === 'books')._id,
    seller: users.find(u => u.sellerInfo?.businessName === 'Jane\'s Fashion Store')._id,
    tags: ['limited-edition', 'programming', 'book', 'signed', 'rare', 'collectible', 'first-edition'],
    attributes: {
      material: 'paper',
      gender: 'unisex',
      ageGroup: 'adult',
      season: 'all-season',
      occasion: ['study', 'collection', 'gift'],
      style: ['classic', 'educational', 'rare']
    },
    brand: 'TechBooks',
    inventory: 1,
    images: [
      { url: 'book-1.jpg', alt: 'Programming guide cover', isPrimary: true },
      { url: 'book-2.jpg', alt: 'Author signature page' }
    ],
    isUnique: true,
    uniquenessScore: 95,
    status: 'active',
    averageRating: 5.0,
    totalReviews: 3,
    totalSales: 2
  },
  {
    name: 'Casual Cotton T-Shirt',
    slug: 'casual-cotton-t-shirt',
    description: 'Comfortable cotton t-shirt perfect for everyday wear. Soft fabric and relaxed fit.',
    shortDescription: 'Comfortable everyday cotton t-shirt',
    price: 24.99,
    originalPrice: 29.99,
    discount: 17,
    sku: 'CCT001',
    category: categories.find(c => c.slug === 'clothing')._id,
    seller: users.find(u => u.sellerInfo?.businessName === 'Jane\'s Fashion Store')._id,
    tags: ['casual', 'cotton', 'tshirt', 'comfortable', 'everyday', 'basics'],
    attributes: {
      material: 'cotton',
      gender: 'unisex',
      ageGroup: 'adult',
      season: 'all-season',
      occasion: ['casual', 'everyday', 'home'],
      style: ['casual', 'minimalist', 'classic']
    },
    brand: 'ComfortWear',
    inventory: 200,
    images: [
      { url: 'tshirt-1.jpg', alt: 'Cotton t-shirt front', isPrimary: true },
      { url: 'tshirt-2.jpg', alt: 'Cotton t-shirt back' }
    ],
    variants: [
      { name: 'Size', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      { name: 'Color', values: ['White', 'Black', 'Gray', 'Navy', 'Red'] }
    ],
    status: 'active',
    averageRating: 4.2,
    totalReviews: 156,
    totalSales: 456
  },
  {
    name: 'Yoga Mat with Alignment Lines',
    slug: 'yoga-mat-with-alignment-lines',
    description: 'Premium yoga mat with alignment lines to help perfect your poses. Non-slip surface and eco-friendly materials.',
    shortDescription: 'Premium yoga mat with alignment guides',
    price: 59.99,
    originalPrice: 79.99,
    discount: 25,
    sku: 'YMA001',
    category: categories.find(c => c.slug === 'sports-fitness')._id,
    seller: users.find(u => u.sellerInfo?.businessName === 'TechGear Hub')._id,
    tags: ['yoga', 'mat', 'fitness', 'meditation', 'exercise', 'alignment', 'eco-friendly'],
    attributes: {
      material: 'rubber',
      gender: 'unisex',
      ageGroup: 'adult',
      season: 'all-season',
      occasion: ['fitness', 'yoga', 'meditation', 'home'],
      style: ['minimalist', 'zen', 'functional']
    },
    brand: 'ZenFit',
    inventory: 85,
    images: [
      { url: 'yogamat-1.jpg', alt: 'Yoga mat with alignment lines', isPrimary: true },
      { url: 'yogamat-2.jpg', alt: 'Yoga mat rolled up' }
    ],
    specifications: [
      { name: 'Thickness', value: '6', unit: 'mm' },
      { name: 'Dimensions', value: '183x61', unit: 'cm' },
      { name: 'Weight', value: '1.2', unit: 'kg' }
    ],
    status: 'active',
    averageRating: 4.7,
    totalReviews: 78,
    totalSales: 123
  }
];

async function seedDatabase() {
  try {
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Review.deleteMany({});

    console.log('👥 Creating users...');
    // Hash passwords
    for (let user of sampleUsers) {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    }
    const createdUsers = await User.insertMany(sampleUsers);
    console.log(`✅ Created ${createdUsers.length} users`);

    console.log('📂 Creating categories...');
    const createdCategories = await Category.insertMany(sampleCategories);
    console.log(`✅ Created ${createdCategories.length} categories`);

    console.log('📦 Creating products...');
    const productsToCreate = generateProducts(createdUsers, createdCategories);
    
    // Calculate uniqueness scores for products
    for (let product of productsToCreate) {
      const tempProduct = new Product(product);
      product.uniquenessScore = tempProduct.calculateUniquenessScore();
    }
    
    const createdProducts = await Product.insertMany(productsToCreate);
    console.log(`✅ Created ${createdProducts.length} products`);

    console.log('⭐ Creating sample reviews...');
    
    // First, we need to create some orders to link reviews to
    console.log('🛒 Creating sample orders first...');
    const ordersToCreate = [];
    const buyer = createdUsers.find(u => u.role === 'buyer');
    
    // Create a few sample orders
    for (let i = 0; i < 3; i++) {
      const randomProducts = createdProducts
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 3) + 1);
      
      const orderItems = randomProducts.map(product => ({
        product: product._id,
        quantity: Math.floor(Math.random() * 3) + 1,
        price: product.price,
        seller: product.seller
      }));

      const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      ordersToCreate.push({
        orderNumber: `ORD-${Date.now()}-${i}`,
        buyer: buyer._id,
        items: orderItems,
        subtotal: totalAmount,
        total: totalAmount,
        payment: {
          method: 'credit-card',
          status: 'completed'
        },
        shipping: {
          address: {
            name: 'John Doe',
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA'
          }
        },
        status: 'delivered'
      });
    }

    const createdOrders = await Order.insertMany(ordersToCreate);
    console.log(`✅ Created ${createdOrders.length} orders`);
    
    const reviewsToCreate = [];
    const buyers = createdUsers.filter(u => u.role === 'buyer');
    const reviewedProductUserPairs = new Set(); // Track reviewed combinations
    
    // Create reviews based on delivered orders
    createdOrders.forEach(order => {
      order.items.forEach((item, index) => {
        const productUserKey = `${item.product.toString()}-${order.buyer.toString()}`;
        
        // Only create review if this user hasn't reviewed this product yet
        if (!reviewedProductUserPairs.has(productUserKey)) {
          reviewedProductUserPairs.add(productUserKey);
          
          reviewsToCreate.push({
            product: item.product,
            user: order.buyer,
            order: order._id,
            rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
            title: `Great product #${index + 1}!`,
            comment: `Really satisfied with the quality and delivery. Would recommend to others!`,
            status: 'approved',
            verified: true,
            helpfulCount: Math.floor(Math.random() * 10)
          });
        }
      });
    });

    await Review.insertMany(reviewsToCreate);
    console.log(`✅ Created ${reviewsToCreate.length} reviews`);

    console.log('🎉 Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`👥 Users: ${createdUsers.length} (${createdUsers.filter(u => u.role === 'buyer').length} buyers, ${createdUsers.filter(u => u.role === 'seller').length} sellers, ${createdUsers.filter(u => u.role === 'admin').length} admin)`);
    console.log(`📂 Categories: ${createdCategories.length}`);
    console.log(`📦 Products: ${createdProducts.length} (${createdProducts.filter(p => p.isUnique).length} unique products)`);
    console.log(`⭐ Reviews: ${reviewsToCreate.length}`);
    console.log(`🛒 Orders: ${ordersToCreate.length}`);
    
    console.log('\n🔑 Test Credentials:');
    console.log('Buyer: john@example.com / password123');
    console.log('Seller: jane@example.com / password123');
    console.log('Seller: mike@example.com / password123');
    console.log('Admin: admin@example.com / admin123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeder
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
