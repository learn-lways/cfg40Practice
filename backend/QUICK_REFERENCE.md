# 🚀 QUICK REFERENCE - Frontend Integration

**E-commerce Backend API - Developer Quick Start**  
**Base URL:** `http://localhost:5000`

---

## 🔑 **Essential Headers**

```javascript
// Authenticated requests
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

// File uploads
const formHeaders = {
  Authorization: `Bearer ${token}`,
  // Don't set Content-Type for FormData - browser sets it automatically
};
```

---

## 🔑 **User Roles & Authentication**

### **Available User Roles:**

```javascript
// Buyer (for payments & orders)
{
  email: "john@example.com",
  password: "password123",
  role: "buyer"
}

// Seller (for product management)
{
  email: "mike@example.com",
  password: "password123",
  role: "seller"
}

// Admin (full access)
{
  email: "admin@example.com",
  password: "admin123",
  role: "admin"
}
```

### **Role Requirements:**

- **Payment Endpoints:** Require `role: "buyer"`
- **Product Management:** Require `role: "seller"` or `"admin"`
- **Admin Functions:** Require `role: "admin"`
- **General Browsing:** No authentication required

---

## ⚡ **Quick Endpoints Reference**

### Authentication

```
POST   /api/auth/register      - User registration
POST   /api/auth/login         - User login
GET    /api/auth/google        - Google OAuth (redirect)
```

### Products

```
GET    /api/products           - All products (with filters)
GET    /api/products/:id       - Single product
GET    /api/products/featured  - Featured products
GET    /api/products/:id/similar - Similar products
GET    /api/products/unique    - Unique/rare products
GET    /api/products/recommendations/:userId - Personalized
```

### Categories

```
GET    /api/categories         - All categories
GET    /api/categories/:id     - Single category
```

### Cart (🔒 Auth Required)

```
GET    /api/cart               - Get user cart
POST   /api/cart/add          - Add to cart
PUT    /api/cart/update/:id   - Update cart item
DELETE /api/cart/remove/:id   - Remove from cart
DELETE /api/cart/clear        - Clear cart
```

### Orders (🔒 Auth Required)

```
GET    /api/orders             - User orders
POST   /api/orders             - Create order
GET    /api/orders/:id         - Single order
```

### Payments (🔒 Buyer Role Required)

```
POST   /api/payments/create-order         - Create payment order
POST   /api/payments/verify               - Verify payment (+ auto invoice)
POST   /api/payments/mock-success         - Mock payment (demo)
GET    /api/payments/invoice/:id          - Get invoice details
GET    /api/payments/invoice/:id/download - Download invoice PDF
POST   /api/payments/test-email           - Test email (admin only)
```

**⚠️ Important:** Payment endpoints require `role: "buyer"`

```javascript
// Buyer credentials for testing
email: "john@example.com";
password: "password123";
role: "buyer";
```

### Reviews

```
GET    /api/reviews/product/:id - Product reviews
POST   /api/reviews             - Add review (🔒 Auth Required)
```

### User Profile (🔒 Auth Required)

```
GET    /api/users/profile       - Get profile
PUT    /api/users/profile       - Update profile
GET    /api/users/wishlist      - Get wishlist
POST   /api/users/wishlist/:id  - Add to wishlist
DELETE /api/users/wishlist/:id  - Remove from wishlist
```

### Utility

```
GET    /api/health              - Health check
GET    /api/search              - Global search
```

---

## 🎯 **Common Query Parameters**

### Pagination

```
?page=1&limit=10
```

### Product Filters

```
?category=electronics&minPrice=100&maxPrice=500&brand=apple&search=iphone&sort=price&order=asc
```

### Search

```
?q=search-term&type=products&category=electronics
```

---

## 📱 **Frontend Code Snippets**

### Login Function

```javascript
async function login(email, password) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (data.success) {
    localStorage.setItem("token", data.data.token);
  }
  return data;
}
```

### Get Products

```javascript
async function getProducts(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/products?${params}`);
  return response.json();
}
```

### Add to Cart

```javascript
async function addToCart(productId, quantity) {
  const token = localStorage.getItem("token");
  const response = await fetch("/api/cart/add", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ productId, quantity }),
  });
  return response.json();
}
```

### Google OAuth

```javascript
function loginWithGoogle() {
  window.location.href = "http://localhost:5000/api/auth/google";
}

// Handle OAuth callback
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");
if (token) {
  localStorage.setItem("token", token);
}
```

### Razorpay Payment

```javascript
async function processPayment(orderId, amount) {
  // 1. Create payment order
  const orderResponse = await fetch("/api/payments/create-order", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderId, amount }),
  });

  const orderData = await orderResponse.json();

  // 2. Open Razorpay
  const options = {
    key: orderData.data.key,
    amount: orderData.data.amount,
    currency: orderData.data.currency,
    order_id: orderData.data.razorpayOrderId,
    handler: async function (response) {
      // 3. Verify payment
      const verifyResponse = await fetch("/api/payments/verify", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
        }),
      });

      const verifyData = await verifyResponse.json();
      if (verifyData.success) {
        // Payment successful
        alert("Payment successful!");
      }
    },
  };

  const razorpay = new Razorpay(options);
  razorpay.open();
}
```

---

## 🔄 **Response Formats**

### Success Response

```json
{
  "success": true,
  "data": {
    /* response data */
  },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error info",
  "statusCode": 400
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [
    /* items array */
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 47,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## 🎨 **UI Integration Examples**

### Product Card Component (React)

```jsx
function ProductCard({ product }) {
  const addToCart = async () => {
    const result = await cartService.addToCart(product._id, 1);
    if (result.success) {
      alert("Added to cart!");
    }
  };

  return (
    <div className="product-card">
      <img src={`${UPLOAD_URL}/${product.images[0]?.url}`} alt={product.name} />
      <h3>{product.name}</h3>
      <p>${product.finalPrice}</p>
      {product.discount > 0 && (
        <span className="discount">-{product.discount}%</span>
      )}
      <button onClick={addToCart}>Add to Cart</button>
    </div>
  );
}
```

### Search Component (React)

```jsx
function SearchComponent() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    const response = await fetch(`/api/search?q=${query}&type=products`);
    const data = await response.json();
    setResults(data.data.products);
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
      />
      <button onClick={handleSearch}>Search</button>

      <div className="search-results">
        {results.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

---

## 🔒 **Authentication Flow**

```
1. User clicks "Login with Google" → Redirect to /api/auth/google
2. Google OAuth → Callback to /api/auth/google/callback
3. Backend generates JWT → Redirect to frontend with token
4. Frontend stores token → Use in Authorization header
5. Access protected routes with Bearer token
```

---

## 📊 **Environment Setup**

### Development

```javascript
const config = {
  API_BASE_URL: "http://localhost:5000/api",
  UPLOAD_URL: "http://localhost:5000/uploads",
  OAUTH_URL: "http://localhost:5000/api/auth/google",
};
```

### Production

```javascript
const config = {
  API_BASE_URL: "https://yourdomain.com/api",
  UPLOAD_URL: "https://yourdomain.com/uploads",
  OAUTH_URL: "https://yourdomain.com/api/auth/google",
};
```

---

**🎯 This quick reference covers 90% of common integration scenarios. For detailed documentation, see `FRONTEND_INTEGRATION_COMPLETE.md`**
