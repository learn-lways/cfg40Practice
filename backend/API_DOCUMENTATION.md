# E-commerce Backend API Documentation

## Overview

A comprehensive RESTful API for an e-commerce platform supporting buyers, sellers, and administrators.

## Base URL

```
http://localhost:5000/api
```

## Authentication

All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## User Roles

- **buyer**: Regular customers who can purchase products
- **seller**: Vendors who can sell products
- **admin**: Platform administrators with full access

---

## 🔐 Authentication Endpoints

### Register User

```http
POST /api/auth/register
```

**Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "buyer", // "buyer" or "seller"
  "phone": "+1234567890"
}
```

### Login User

```http
POST /api/auth/login
```

**Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

---

## 👤 User Management

### Get Profile

```http
GET /api/users/profile
Authorization: Bearer <token>
```

### Update Profile

```http
PUT /api/users/profile
Authorization: Bearer <token>
```

**Body:**

```json
{
  "name": "Updated Name",
  "phone": "+1234567890"
}
```

### Add Address

```http
POST /api/users/addresses
Authorization: Bearer <token>
```

**Body:**

```json
{
  "type": "home",
  "street": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "USA",
  "isDefault": true
}
```

---

## 🛍️ Product Management

### Get All Products

```http
GET /api/products?page=1&limit=12&search=laptop&category=electronics&minPrice=100&maxPrice=1000&sort=price&order=asc
```

### Get Single Product

```http
GET /api/products/:id
```

### Create Product (Seller)

```http
POST /api/products
Authorization: Bearer <seller-token>
Content-Type: multipart/form-data
```

**Form Data:**

- `name`: Product name
- `description`: Product description
- `price`: Product price
- `stock`: Available quantity
- `category`: Category ID
- `images`: Product images (multiple files)

### Update Product (Seller)

```http
PUT /api/products/:id
Authorization: Bearer <seller-token>
```

### Delete Product (Seller)

```http
DELETE /api/products/:id
Authorization: Bearer <seller-token>
```

---

## 🏷️ Category Management

### Get All Categories

```http
GET /api/categories?page=1&limit=20&search=electronics
```

### Get Category Tree

```http
GET /api/categories
```

### Create Category (Admin/Seller)

```http
POST /api/categories
Authorization: Bearer <token>
```

**Body:**

```json
{
  "name": "Electronics",
  "description": "Electronic devices and gadgets",
  "parent": null, // Optional parent category ID
  "image": "category-image-url"
}
```

### Get Products in Category

```http
GET /api/categories/:id/products?page=1&limit=12&sort=price&order=asc
```

---

## 🛒 Shopping Cart

### Get Cart

```http
GET /api/cart
Authorization: Bearer <buyer-token>
```

### Add Item to Cart

```http
POST /api/cart/items
Authorization: Bearer <buyer-token>
```

**Body:**

```json
{
  "productId": "product-id",
  "quantity": 2
}
```

### Update Item Quantity

```http
PUT /api/cart/items/:productId
Authorization: Bearer <buyer-token>
```

**Body:**

```json
{
  "quantity": 3
}
```

### Remove Item from Cart

```http
DELETE /api/cart/items/:productId
Authorization: Bearer <buyer-token>
```

### Clear Cart

```http
DELETE /api/cart
Authorization: Bearer <buyer-token>
```

### Sync Cart

```http
POST /api/cart/sync
Authorization: Bearer <buyer-token>
```

---

## 📦 Order Management

### Create Order

```http
POST /api/orders
Authorization: Bearer <buyer-token>
```

**Body:**

```json
{
  "items": [
    {
      "productId": "product-id",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "paymentMethod": "credit_card",
  "paymentDetails": {
    "transactionId": "txn-123"
  }
}
```

### Get Orders

```http
GET /api/orders?page=1&limit=10&status=pending
Authorization: Bearer <token>
```

### Get Single Order

```http
GET /api/orders/:id
Authorization: Bearer <token>
```

### Update Order Status (Seller)

```http
PUT /api/orders/:id/status
Authorization: Bearer <seller-token>
```

**Body:**

```json
{
  "status": "shipped",
  "trackingNumber": "TRK123456"
}
```

### Cancel Order (Buyer)

```http
DELETE /api/orders/:id
Authorization: Bearer <buyer-token>
```

---

## 🏪 Seller Dashboard

### Get Dashboard Data

```http
GET /api/sellers/dashboard?period=30
Authorization: Bearer <seller-token>
```

### Get Seller Products

```http
GET /api/sellers/products?page=1&limit=12&search=laptop&status=active
Authorization: Bearer <seller-token>
```

### Get Seller Orders

```http
GET /api/sellers/orders?page=1&limit=10&status=pending
Authorization: Bearer <seller-token>
```

### Update Seller Profile

```http
PUT /api/sellers/profile
Authorization: Bearer <seller-token>
```

**Body:**

```json
{
  "sellerInfo": {
    "businessName": "My Business",
    "businessType": "company"
  }
}
```

### Get Analytics

```http
GET /api/sellers/analytics?period=30
Authorization: Bearer <seller-token>
```

### Submit Verification

```http
POST /api/sellers/verification
Authorization: Bearer <seller-token>
```

**Body:**

```json
{
  "businessName": "My Business LLC",
  "businessType": "company",
  "taxId": "123456789",
  "businessAddress": {
    "street": "456 Business Ave",
    "city": "Business City",
    "state": "BC",
    "zipCode": "12345"
  }
}
```

---

## 👨‍💼 Admin Dashboard

### Get Dashboard Stats

```http
GET /api/admin/dashboard?period=30
Authorization: Bearer <admin-token>
```

### Get All Users

```http
GET /api/admin/users?page=1&limit=20&role=all&status=active&search=john
Authorization: Bearer <admin-token>
```

### Update User Status

```http
PUT /api/admin/users/:id/status
Authorization: Bearer <admin-token>
```

**Body:**

```json
{
  "isActive": false,
  "reason": "Policy violation"
}
```

### Verify Seller

```http
PUT /api/admin/sellers/:id/verify
Authorization: Bearer <admin-token>
```

**Body:**

```json
{
  "isVerified": true,
  "note": "All documents verified"
}
```

### Get All Orders

```http
GET /api/admin/orders?page=1&limit=20&status=pending&dateFrom=2025-01-01&dateTo=2025-12-31
Authorization: Bearer <admin-token>
```

### Get Pending Products

```http
GET /api/admin/products/pending?page=1&limit=20
Authorization: Bearer <admin-token>
```

### Approve Product

```http
PUT /api/admin/products/:id/approve
Authorization: Bearer <admin-token>
```

**Body:**

```json
{
  "approved": true,
  "note": "Product meets all requirements"
}
```

### Get Analytics Summary

```http
GET /api/admin/analytics/summary?period=30
Authorization: Bearer <admin-token>
```

---

## ⭐ Review System

### Create Review

```http
POST /api/reviews
Authorization: Bearer <buyer-token>
```

**Body:**

```json
{
  "productId": "product-id",
  "orderId": "order-id",
  "rating": 5,
  "title": "Great product!",
  "comment": "This product exceeded my expectations...",
  "images": ["image-url-1", "image-url-2"]
}
```

### Get Product Reviews

```http
GET /api/reviews/product/:productId?page=1&limit=10&rating=5&sortBy=createdAt&sortOrder=desc
```

### Get User Reviews

```http
GET /api/reviews/user?page=1&limit=10
Authorization: Bearer <token>
```

### Update Review

```http
PUT /api/reviews/:id
Authorization: Bearer <buyer-token>
```

**Body:**

```json
{
  "rating": 4,
  "title": "Updated title",
  "comment": "Updated comment..."
}
```

### Delete Review

```http
DELETE /api/reviews/:id
Authorization: Bearer <token>
```

### Vote on Review Helpfulness

```http
POST /api/reviews/:id/helpful
Authorization: Bearer <token>
```

**Body:**

```json
{
  "vote": "helpful" // or "not_helpful"
}
```

### Seller Response to Review

```http
POST /api/reviews/:id/respond
Authorization: Bearer <seller-token>
```

**Body:**

```json
{
  "comment": "Thank you for your feedback..."
}
```

---

## 📁 File Upload

### Upload Product Images

```http
POST /api/products/:id/images
Authorization: Bearer <seller-token>
Content-Type: multipart/form-data
```

**Form Data:**

- `images`: Multiple image files (max 8, 5MB each)

### Upload User Avatar

```http
POST /api/users/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**

- `avatar`: Single image file (5MB max)

---

## 📊 Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  },
  "pagination": {
    // Only for paginated responses
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    // Only for validation errors
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## 🚀 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `423` - Locked (Account)
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## 🔒 Rate Limiting

- General API: 100 requests per 15 minutes per IP
- Authentication endpoints: 5 attempts per 15 minutes per IP
- File uploads: 10 uploads per hour per user

---

## 📝 Notes

1. All timestamps are in ISO 8601 format
2. File uploads support JPEG, JPG, PNG, GIF, WebP formats
3. Passwords must be at least 6 characters
4. Email addresses are automatically normalized to lowercase
5. SKUs must be unique across all products
6. Orders can only be cancelled if status is 'pending' or 'confirmed'
7. Reviews can only be created for delivered orders
8. Seller verification is required for certain operations
