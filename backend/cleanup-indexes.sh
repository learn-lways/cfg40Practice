#!/bin/bash

# MongoDB Index Cleanup Script
echo "🔧 Cleaning up MongoDB duplicate indexes..."

mongosh ecommerce --eval "
// Drop and recreate indexes to remove duplicates
db.users.dropIndexes();
db.users.createIndex({ email: 1 }, { unique: true });

db.products.dropIndexes();
db.products.createIndex({ sku: 1 }, { unique: true });
db.products.createIndex({ slug: 1 }, { unique: true });

db.orders.dropIndexes();
db.orders.createIndex({ orderNumber: 1 }, { unique: true });

db.categories.dropIndexes();
db.categories.createIndex({ name: 1 }, { unique: true });
db.categories.createIndex({ slug: 1 }, { unique: true });

db.reviews.dropIndexes();
db.reviews.createIndex({ user: 1 });

print('✅ Indexes cleaned up successfully');
"

echo "✅ Index cleanup complete"
