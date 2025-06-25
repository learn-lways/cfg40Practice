# E-commerce Backend - Deployment Guide

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- MongoDB 4.4+ installed and running
- Git (for version control)

### Installation Steps

1. **Clone/Navigate to Project**

   ```bash
   cd /path/to/cfg40Practice/backend
   ```

2. **Install Dependencies** (Already done)

   ```bash
   npm install
   ```

3. **Set up Environment Variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB** (System dependent)

   ```bash
   # Ubuntu/Debian
   sudo systemctl start mongod

   # macOS (with Homebrew)
   brew services start mongodb-community

   # Windows
   net start MongoDB

   # Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Start the Server**

   ```bash
   npm start
   # or
   node server.js
   ```

6. **Verify Installation**
   ```bash
   curl http://localhost:5000/api/health
   ```

## 🔧 Configuration

### Environment Variables (.env)

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/ecommerce

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# File Upload Configuration
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/jpg,image/png,image/gif

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payment Configuration (Optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 📊 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout user

### Users

- `GET /api/users` - Get all users (Admin)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `POST /api/users/:id/addresses` - Add address
- `PUT /api/users/:id/addresses/:addressId` - Update address
- `DELETE /api/users/:id/addresses/:addressId` - Delete address

### Products

- `GET /api/products` - Get all products (with filtering)
- `GET /api/products/featured` - Get featured products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (Seller)
- `PUT /api/products/:id` - Update product (Seller/Admin)
- `DELETE /api/products/:id` - Delete product (Seller/Admin)

### Cart

- `GET /api/cart` - Get user cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/:productId` - Update cart item
- `DELETE /api/cart/items/:productId` - Remove cart item
- `DELETE /api/cart` - Clear cart

### Orders

- `POST /api/orders` - Create order
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Cancel order

### Categories

- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `POST /api/categories` - Create category (Admin)
- `PUT /api/categories/:id` - Update category (Admin)
- `DELETE /api/categories/:id` - Delete category (Admin)

### Reviews

- `POST /api/reviews` - Create review
- `GET /api/reviews/product/:productId` - Get product reviews
- `GET /api/reviews/user` - Get user reviews
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review
- `POST /api/reviews/:id/helpful` - Mark review helpful
- `POST /api/reviews/:id/respond` - Seller response

### Seller Dashboard

- `GET /api/sellers/dashboard` - Seller analytics
- `GET /api/sellers/products` - Seller products
- `GET /api/sellers/orders` - Seller orders
- `PUT /api/sellers/profile` - Update seller profile
- `POST /api/sellers/verification` - Request verification

### Admin Dashboard

- `GET /api/admin/dashboard` - Admin analytics
- `GET /api/admin/users` - Manage users
- `PUT /api/admin/users/:id/status` - Update user status
- `PUT /api/admin/sellers/:id/verify` - Verify seller
- `GET /api/admin/orders` - All orders
- `GET /api/admin/products/pending` - Pending products
- `PUT /api/admin/products/:id/approve` - Approve product

## 🧪 Testing

### Run Test Suite

```bash
chmod +x test-api.sh
./test-api.sh
```

### Manual Testing

```bash
# Health check
curl http://localhost:5000/api/health

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"TestPass123!","role":"buyer"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Role-based Access Control** - Buyer/Seller/Admin roles
- **Rate Limiting** - 100 requests per 15 minutes per IP
- **Input Validation** - Comprehensive request validation
- **File Upload Security** - Type and size restrictions
- **CORS Configuration** - Cross-origin request handling
- **Helmet.js** - Security headers
- **Password Hashing** - bcrypt for secure password storage

## 📁 File Structure

```
backend/
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env.example           # Environment template
├── test-api.sh           # API test suite
├── config/
│   └── database.js       # Database configuration
├── middleware/
│   ├── auth.js          # Authentication middleware
│   └── upload.js        # File upload middleware
├── models/
│   ├── User.js          # User model
│   ├── Product.js       # Product model
│   ├── Order.js         # Order model
│   ├── Cart.js          # Cart model
│   ├── Category.js      # Category model
│   └── Review.js        # Review model
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── users.js         # User management routes
│   ├── products.js      # Product routes
│   ├── orders.js        # Order routes
│   ├── cart.js          # Cart routes
│   ├── categories.js    # Category routes
│   ├── reviews.js       # Review routes
│   ├── sellers.js       # Seller dashboard routes
│   └── admin.js         # Admin dashboard routes
└── uploads/             # File upload directory
    ├── products/        # Product images
    ├── users/          # User avatars
    ├── categories/     # Category images
    └── reviews/        # Review images
```

## 🚀 Production Deployment

### 1. Environment Setup

- Set `NODE_ENV=production`
- Use strong JWT secret
- Configure production MongoDB URI
- Set up SSL/TLS certificates
- Configure reverse proxy (Nginx/Apache)

### 2. Security Checklist

- [ ] Change default JWT secret
- [ ] Set up firewall rules
- [ ] Configure HTTPS
- [ ] Set up monitoring/logging
- [ ] Configure backup strategy
- [ ] Set up error reporting (Sentry)

### 3. Performance Optimization

- [ ] Enable MongoDB indexing
- [ ] Set up Redis for sessions/caching
- [ ] Configure CDN for file uploads
- [ ] Enable compression middleware
- [ ] Set up load balancing

## 📞 Support

- **API Documentation:** See `API_DOCUMENTATION.md`
- **Change Log:** See `CHANGES.md`
- **Issues:** Check server logs and MongoDB connection

## 🎯 Next Steps

1. **Frontend Integration** - Connect React/Vue frontend
2. **Payment Gateway** - Integrate Stripe/PayPal
3. **Email Service** - Set up transactional emails
4. **Push Notifications** - Real-time order updates
5. **Analytics** - Advanced reporting dashboard
6. **Mobile API** - Optimize for mobile apps
