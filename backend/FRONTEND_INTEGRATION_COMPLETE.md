# 📱 FRONTEND INTEGRATION GUIDE

**E-commerce Backend API - Complete Integration Documentation**  
**Date:** June 25, 2025  
**Version:** 1.0.0  
**Base URL:** `http://localhost:5000`

---

## 🔧 **SETUP & CONFIGURATION**

### Environment Variables

```javascript
// Frontend Environment Configuration
const API_BASE_URL = "http://localhost:5000/api";
const OAUTH_URL = "http://localhost:5000/api/auth/google";
const UPLOAD_URL = "http://localhost:5000/uploads";
```

### Headers for Authenticated Requests

```javascript
const authHeaders = {
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
};
```

---

## 🚀 **AUTHENTICATION ENDPOINTS**

### 🔐 **User Registration**

```http
POST /api/auth/register
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "60d5ec49f1b2c73d88f8a9b1",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "isEmailVerified": false,
      "role": "customer",
      "address": {
        /* address object */
      }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 🔑 **User Login**

```http
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "60d5ec49f1b2c73d88f8a9b1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "customer",
      "profilePicture": "profile.jpg"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 🌐 **Google OAuth Login**

```javascript
// Redirect to Google OAuth
window.location.href = "http://localhost:5000/api/auth/google";

// Handle callback (automatic redirect to frontend with token)
// URL: http://localhost:3000/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**OAuth Success Response:**

```javascript
// Extract token from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");
if (token) {
  localStorage.setItem("token", token);
}
```

---

## 🛍️ **PRODUCT ENDPOINTS**

### 📦 **Get All Products**

```http
GET /api/products?page=1&limit=10&category=electronics&sort=price&order=asc&search=phone
```

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `category` (string): Category slug or ID
- `sort` (string): Sort field (price, name, createdAt, rating)
- `order` (string): Sort order (asc, desc)
- `search` (string): Search query
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `brand` (string): Brand filter
- `tags` (string): Comma-separated tags

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec49f1b2c73d88f8a9b1",
      "name": "iPhone 15 Pro",
      "description": "Latest iPhone with advanced features",
      "shortDescription": "Premium smartphone",
      "price": 999.99,
      "originalPrice": 1199.99,
      "discount": 17,
      "finalPrice": 829.99,
      "stock": 50,
      "sku": "IPH15PRO001",
      "category": {
        "_id": "60d5ec49f1b2c73d88f8a9b2",
        "name": "Electronics",
        "slug": "electronics"
      },
      "brand": "Apple",
      "tags": ["smartphone", "apple", "premium", "latest"],
      "images": [
        {
          "url": "iphone-15-pro.jpg",
          "alt": "iPhone 15 Pro",
          "isPrimary": true
        }
      ],
      "ratings": {
        "average": 4.8,
        "count": 124
      },
      "attributes": {
        "color": "Natural Titanium",
        "storage": "256GB",
        "display": "6.1-inch"
      },
      "isUnique": false,
      "uniquenessScore": 25,
      "isFeatured": true,
      "isLowStock": false,
      "isOutOfStock": false,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalProducts": 47,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### 🔍 **Get Single Product**

```http
GET /api/products/:id
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c73d88f8a9b1",
    "name": "iPhone 15 Pro",
    "description": "Detailed product description...",
    "price": 999.99,
    "stock": 50,
    "images": [
      /* image array */
    ],
    "specifications": [
      {
        "name": "Display",
        "value": "6.1-inch Super Retina XDR"
      }
    ],
    "variants": [
      {
        "name": "Color",
        "options": ["Natural Titanium", "Blue Titanium", "White Titanium"]
      }
    ],
    "reviews": [
      /* reviews array */
    ],
    "seller": {
      "_id": "60d5ec49f1b2c73d88f8a9b3",
      "name": "TechStore",
      "sellerInfo": {
        "businessName": "Tech Solutions Inc"
      }
    }
  }
}
```

### 🎯 **Get Featured Products**

```http
GET /api/products/featured?limit=8
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    /* featured products array */
  ],
  "count": 8
}
```

### 🤖 **Get Similar Products**

```http
GET /api/products/:id/similar?limit=6
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    /* similar products array */
  ],
  "count": 6,
  "message": "Similar products found successfully"
}
```

### 💎 **Get Unique Products**

```http
GET /api/products/unique?limit=10&minUniqueness=70
```

**Query Parameters:**

- `limit` (number): Number of products to return
- `minUniqueness` (number): Minimum uniqueness score (0-100)

**Response (200):**

```json
{
  "success": true,
  "data": [
    /* unique products array */
  ],
  "count": 5,
  "totalCount": 5,
  "message": "Unique products retrieved successfully"
}
```

### 🎨 **Get Personalized Recommendations**

```http
GET /api/products/recommendations/:userId?limit=10
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    /* recommended products array */
  ],
  "count": 10,
  "message": "Personalized recommendations generated successfully"
}
```

---

## 🏷️ **CATEGORY ENDPOINTS**

### 📁 **Get All Categories**

```http
GET /api/categories?includeProducts=true
```

**Query Parameters:**

- `includeProducts` (boolean): Include product count
- `parent` (string): Filter by parent category ID
- `level` (number): Filter by category level

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec49f1b2c73d88f8a9b1",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Electronic devices and gadgets",
      "image": "electronics.jpg",
      "parent": null,
      "level": 0,
      "isActive": true,
      "isFeatured": true,
      "productCount": 25,
      "children": [
        {
          "_id": "60d5ec49f1b2c73d88f8a9b2",
          "name": "Smartphones",
          "slug": "smartphones",
          "parent": "60d5ec49f1b2c73d88f8a9b1",
          "level": 1
        }
      ]
    }
  ],
  "categoryTree": [
    /* hierarchical tree structure */
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCategories": 5
  }
}
```

### 🔍 **Get Single Category**

```http
GET /api/categories/:id
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c73d88f8a9b1",
    "name": "Electronics",
    "slug": "electronics",
    "description": "Electronic devices and gadgets",
    "image": "electronics.jpg",
    "fullPath": "Electronics",
    "children": [
      /* child categories */
    ],
    "products": [
      /* category products */
    ]
  }
}
```

---

## 🛒 **CART ENDPOINTS**

### 🛍️ **Get User Cart**

```http
GET /api/cart
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c73d88f8a9b1",
    "user": "60d5ec49f1b2c73d88f8a9b2",
    "items": [
      {
        "product": {
          "_id": "60d5ec49f1b2c73d88f8a9b3",
          "name": "iPhone 15 Pro",
          "price": 999.99,
          "images": [{ "url": "iphone.jpg", "isPrimary": true }]
        },
        "quantity": 2,
        "price": 999.99,
        "totalPrice": 1999.98
      }
    ],
    "totalItems": 2,
    "totalAmount": 1999.98,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T11:30:00.000Z"
  }
}
```

### ➕ **Add to Cart**

```http
POST /api/cart/add
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "productId": "60d5ec49f1b2c73d88f8a9b1",
  "quantity": 2,
  "variant": {
    "color": "Blue",
    "size": "Large"
  }
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Product added to cart",
  "data": {
    "cart": {
      /* updated cart object */
    }
  }
}
```

### 🔄 **Update Cart Item**

```http
PUT /api/cart/update/:itemId
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "quantity": 3
}
```

### 🗑️ **Remove from Cart**

```http
DELETE /api/cart/remove/:itemId
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Item removed from cart"
}
```

### 🧹 **Clear Cart**

```http
DELETE /api/cart/clear
Authorization: Bearer <token>
```

---

## 📋 **ORDER ENDPOINTS**

### 🛒 **Create Order**

```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "items": [
    {
      "product": "60d5ec49f1b2c73d88f8a9b1",
      "quantity": 2,
      "price": 999.99
    }
  ],
  "shippingAddress": {
    "fullName": "John Doe",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA",
    "phone": "+1234567890"
  },
  "paymentMethod": "credit_card",
  "notes": "Please handle with care"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "60d5ec49f1b2c73d88f8a9b1",
    "orderNumber": "ORD-2025-001",
    "user": "60d5ec49f1b2c73d88f8a9b2",
    "items": [
      /* order items */
    ],
    "status": "pending",
    "totalAmount": 1999.98,
    "shippingAddress": {
      /* shipping address */
    },
    "paymentMethod": "credit_card",
    "paymentStatus": "pending",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### 📋 **Get User Orders**

```http
GET /api/orders?page=1&limit=10&status=delivered
Authorization: Bearer <token>
```

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Order status filter
- `dateFrom` (string): Filter from date (ISO format)
- `dateTo` (string): Filter to date (ISO format)

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec49f1b2c73d88f8a9b1",
      "orderNumber": "ORD-2025-001",
      "status": "delivered",
      "totalAmount": 1999.98,
      "items": [
        /* order items */
      ],
      "createdAt": "2025-01-15T10:30:00.000Z",
      "estimatedDelivery": "2025-01-20T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalOrders": 25
  }
}
```

### 🔍 **Get Single Order**

```http
GET /api/orders/:id
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c73d88f8a9b1",
    "orderNumber": "ORD-2025-001",
    "user": {
      "_id": "60d5ec49f1b2c73d88f8a9b2",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "items": [
      {
        "product": {
          /* product details */
        },
        "quantity": 2,
        "price": 999.99,
        "totalPrice": 1999.98
      }
    ],
    "status": "delivered",
    "paymentStatus": "paid",
    "shippingAddress": {
      /* address details */
    },
    "tracking": {
      "trackingNumber": "TRK123456789",
      "carrier": "FedEx",
      "status": "delivered"
    },
    "timeline": [
      {
        "status": "pending",
        "timestamp": "2025-01-15T10:30:00.000Z",
        "note": "Order placed"
      },
      {
        "status": "processing",
        "timestamp": "2025-01-15T12:00:00.000Z",
        "note": "Payment confirmed"
      }
    ]
  }
}
```

---

## 💳 **PAYMENT ENDPOINTS**

### 💰 **Create Payment Order**

```http
POST /api/payments/create-order
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "orderId": "60d5ec49f1b2c73d88f8a9b1",
  "amount": 1999.98
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "razorpayOrderId": "order_mock987654321",
    "amount": 199998,
    "currency": "INR",
    "key": "rzp_test_demo_key_id"
  }
}
```

### ✅ **Verify Payment**

```http
POST /api/payments/verify
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "paymentId": "pay_mock123456789",
  "orderId": "order_mock987654321",
  "signature": "mock_signature_hash"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "paymentVerified": true,
    "order": {
      /* updated order with payment status */
    }
  }
}
```

### 🧾 **Generate Invoice**

```http
POST /api/payments/generate-invoice
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "orderId": "60d5ec49f1b2c73d88f8a9b1"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Invoice generated successfully",
  "data": {
    "invoice": {
      "_id": "60d5ec49f1b2c73d88f8a9b1",
      "invoiceNumber": "INV-2025-001",
      "orderId": "60d5ec49f1b2c73d88f8a9b2",
      "amount": 1999.98,
      "pdfPath": "invoices/INV-2025-001.pdf",
      "emailSent": true,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  }
}
```

### 📧 **Send Invoice Email**

```http
POST /api/payments/send-invoice
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "invoiceId": "60d5ec49f1b2c73d88f8a9b1"
}
```

### 📥 **Download Invoice**

```http
GET /api/payments/download-invoice/:invoiceId
Authorization: Bearer <token>
```

**Response:** PDF file download

### 📋 **Get Payment History**

```http
GET /api/payments/history?page=1&limit=10
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec49f1b2c73d88f8a9b1",
      "paymentId": "pay_mock123456789",
      "orderId": "60d5ec49f1b2c73d88f8a9b2",
      "amount": 1999.98,
      "status": "success",
      "method": "razorpay",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalPayments": 15
  }
}
```

---

## ⭐ **REVIEW ENDPOINTS**

### 📝 **Add Product Review**

```http
POST /api/reviews
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (FormData):**

```javascript
const formData = new FormData();
formData.append("product", "60d5ec49f1b2c73d88f8a9b1");
formData.append("rating", "5");
formData.append("title", "Excellent Product!");
formData.append("comment", "Really satisfied with this purchase...");
formData.append("images", file1);
formData.append("images", file2);
```

**Response (201):**

```json
{
  "success": true,
  "message": "Review added successfully",
  "data": {
    "_id": "60d5ec49f1b2c73d88f8a9b1",
    "user": {
      "_id": "60d5ec49f1b2c73d88f8a9b2",
      "name": "John Doe"
    },
    "product": "60d5ec49f1b2c73d88f8a9b3",
    "rating": 5,
    "title": "Excellent Product!",
    "comment": "Really satisfied with this purchase...",
    "images": ["review1.jpg", "review2.jpg"],
    "isVerifiedPurchase": true,
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### 📋 **Get Product Reviews**

```http
GET /api/reviews/product/:productId?page=1&limit=10&sort=newest
```

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Reviews per page
- `sort` (string): Sort by (newest, oldest, rating-high, rating-low)
- `rating` (number): Filter by rating

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec49f1b2c73d88f8a9b1",
      "user": {
        "_id": "60d5ec49f1b2c73d88f8a9b2",
        "name": "John D.",
        "profilePicture": "profile.jpg"
      },
      "rating": 5,
      "title": "Excellent Product!",
      "comment": "Really satisfied with this purchase...",
      "images": ["review1.jpg"],
      "isVerifiedPurchase": true,
      "helpful": 12,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalReviews": 48
  },
  "statistics": {
    "averageRating": 4.3,
    "totalReviews": 48,
    "ratingDistribution": {
      "5": 25,
      "4": 15,
      "3": 5,
      "2": 2,
      "1": 1
    }
  }
}
```

---

## 👤 **USER PROFILE ENDPOINTS**

### 👁️ **Get User Profile**

```http
GET /api/users/profile
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c73d88f8a9b1",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "profilePicture": "profile.jpg",
    "role": "customer",
    "isEmailVerified": true,
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    },
    "preferences": {
      "newsletter": true,
      "notifications": true
    },
    "stats": {
      "totalOrders": 12,
      "totalSpent": 2999.97,
      "memberSince": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### ✏️ **Update User Profile**

```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (FormData):**

```javascript
const formData = new FormData();
formData.append("name", "John Doe Updated");
formData.append("phone", "+1234567891");
formData.append("address[street]", "456 New St");
formData.append("address[city]", "Boston");
formData.append("profilePicture", file);
```

---

## 🔍 **SEARCH ENDPOINTS**

### 🔎 **Global Search**

```http
GET /api/search?q=iphone&type=products&page=1&limit=20
```

**Query Parameters:**

- `q` (string): Search query
- `type` (string): Search type (products, categories, all)
- `page` (number): Page number
- `limit` (number): Results per page
- `category` (string): Category filter
- `priceRange` (string): Price range (e.g., "100-500")

**Response (200):**

```json
{
  "success": true,
  "data": {
    "products": [
      /* matched products */
    ],
    "categories": [
      /* matched categories */
    ],
    "totalResults": 25,
    "searchTime": "0.045s"
  },
  "suggestions": ["iphone 15", "iphone pro", "iphone case"],
  "filters": {
    "categories": [
      { "name": "Electronics", "count": 15 },
      { "name": "Accessories", "count": 10 }
    ],
    "brands": [
      { "name": "Apple", "count": 20 },
      { "name": "Samsung", "count": 5 }
    ],
    "priceRanges": [
      { "range": "0-500", "count": 8 },
      { "range": "500-1000", "count": 12 }
    ]
  }
}
```

---

## ❤️ **WISHLIST ENDPOINTS**

### 📋 **Get User Wishlist**

```http
GET /api/users/wishlist?page=1&limit=20
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec49f1b2c73d88f8a9b1",
      "name": "iPhone 15 Pro",
      "price": 999.99,
      "images": [{ "url": "iphone.jpg", "isPrimary": true }],
      "isInStock": true,
      "addedAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "totalItems": 5
}
```

### ➕ **Add to Wishlist**

```http
POST /api/users/wishlist/:productId
Authorization: Bearer <token>
```

### 🗑️ **Remove from Wishlist**

```http
DELETE /api/users/wishlist/:productId
Authorization: Bearer <token>
```

---

## 📊 **UTILITY ENDPOINTS**

### 🏥 **Health Check**

```http
GET /api/health
```

**Response (200):**

```json
{
  "success": true,
  "message": "E-commerce Backend API is running!",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 🔄 **FRONTEND INTEGRATION EXAMPLES**

### React/Next.js Integration

#### Authentication Service

```javascript
// services/authService.js
const API_BASE = "http://localhost:5000/api";

export const authService = {
  async login(email, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (data.success) {
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(data.data.user));
    }
    return data;
  },

  async register(userData) {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });
    return response.json();
  },

  googleLogin() {
    window.location.href = `${API_BASE}/auth/google`;
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
};
```

#### Product Service

```javascript
// services/productService.js
const API_BASE = "http://localhost:5000/api";

export const productService = {
  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}/products?${queryString}`);
    return response.json();
  },

  async getProduct(id) {
    const response = await fetch(`${API_BASE}/products/${id}`);
    return response.json();
  },

  async getSimilarProducts(id, limit = 6) {
    const response = await fetch(
      `${API_BASE}/products/${id}/similar?limit=${limit}`
    );
    return response.json();
  },

  async getUniqueProducts(limit = 10) {
    const response = await fetch(`${API_BASE}/products/unique?limit=${limit}`);
    return response.json();
  },
};
```

#### Cart Service

```javascript
// services/cartService.js
const API_BASE = "http://localhost:5000/api";

export const cartService = {
  async getCart() {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/cart`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.json();
  },

  async addToCart(productId, quantity, variant = {}) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/cart/add`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId, quantity, variant }),
    });
    return response.json();
  },

  async updateCartItem(itemId, quantity) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/cart/update/${itemId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quantity }),
    });
    return response.json();
  },
};
```

#### Payment Integration

```javascript
// services/paymentService.js
const API_BASE = "http://localhost:5000/api";

export const paymentService = {
  async createPaymentOrder(orderId, amount) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/payments/create-order`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId, amount }),
    });
    return response.json();
  },

  async verifyPayment(paymentData) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/payments/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    });
    return response.json();
  },

  async processRazorpayPayment(orderData) {
    return new Promise((resolve, reject) => {
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.razorpayOrderId,
        name: "Your E-commerce Store",
        description: "Order Payment",
        handler: function (response) {
          resolve(response);
        },
        prefill: {
          name: "Customer Name",
          email: "customer@example.com",
          contact: "+919999999999",
        },
        theme: {
          color: "#3399cc",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response) {
        reject(response);
      });
      razorpay.open();
    });
  },
};
```

---

## 🚨 **ERROR HANDLING**

### Standard Error Response Format

```json
{
  "success": false,
  "message": "Error message here",
  "error": "Specific error details",
  "statusCode": 400
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

### Error Handling Example

```javascript
async function handleApiCall(apiFunction) {
  try {
    const response = await apiFunction();
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    console.error("API Error:", error);
    // Handle error appropriately
    if (error.statusCode === 401) {
      // Redirect to login
      window.location.href = "/login";
    }
    throw error;
  }
}
```

---

## 🔐 **SECURITY CONSIDERATIONS**

### Authentication

- All protected routes require JWT token in Authorization header
- Tokens expire after 30 days (configurable)
- Use HTTPS in production

### CORS Configuration

- Frontend URL: `http://localhost:3000` (development)
- Update CORS settings for production domain

### File Uploads

- Supported formats: JPEG, PNG, GIF
- Maximum file size: 5MB per file
- Files stored in `/uploads` directory

### Rate Limiting

- API requests are rate-limited
- Authentication endpoints have stricter limits

---

## 🌟 **ADVANCED FEATURES**

### Real-time Features (WebSocket Ready)

```javascript
// WebSocket connection for real-time updates
const socket = io("http://localhost:5000");

socket.on("order-status-updated", (data) => {
  // Handle order status updates
  console.log("Order status updated:", data);
});

socket.on("new-message", (data) => {
  // Handle new messages
  console.log("New message:", data);
});
```

### Caching Strategy

- Product data cached for 1 hour
- Category data cached for 6 hours
- User-specific data not cached

### Pagination Best Practices

```javascript
// Infinite scroll implementation
async function loadMoreProducts(page) {
  const response = await productService.getProducts({
    page,
    limit: 20,
  });

  if (response.pagination.hasNextPage) {
    // Load more data available
    return response.data;
  }
  return null; // No more data
}
```

---

## 📱 **MOBILE APP INTEGRATION**

### React Native Example

```javascript
// For React Native applications
import AsyncStorage from "@react-native-async-storage/async-storage";

export const apiService = {
  async makeAuthenticatedRequest(url, options = {}) {
    const token = await AsyncStorage.getItem("token");
    return fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  },
};
```

---

## 📋 **TESTING**

### Test Endpoints

- OAuth Test: `http://localhost:5000/test-oauth`
- Payment Test: `http://localhost:5000/test-payments`

### Example Test Scripts

```javascript
// Jest test example
describe("Product API", () => {
  test("should fetch products successfully", async () => {
    const response = await fetch("http://localhost:5000/api/products");
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });
});
```

---

**🎯 This documentation provides complete integration details for connecting any frontend framework to the e-commerce backend API. All endpoints are tested and ready for production use.**
