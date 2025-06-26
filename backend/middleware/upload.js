const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

// Ensure upload directories exist (for local fallback)
const createUploadDirs = () => {
  const dirs = [
    "./uploads/products",
    "./uploads/users",
    "./uploads/categories",
    "./uploads/reviews",
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Cloudinary storage configuration
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = "ecommerce/general";

    // Determine folder based on route
    if (req.originalUrl.includes("/products")) {
      folder = "ecommerce/products";
    } else if (req.originalUrl.includes("/users")) {
      folder = "ecommerce/users";
    } else if (req.originalUrl.includes("/categories")) {
      folder = "ecommerce/categories";
    } else if (req.originalUrl.includes("/reviews")) {
      folder = "ecommerce/reviews";
    }

    return {
      folder: folder,
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
      transformation: [
        { width: 1200, height: 1200, crop: "limit", quality: "auto" },
        { fetch_format: "auto" },
      ],
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    };
  },
});

// Local storage configuration (fallback)
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "./uploads/";

    // Determine upload path based on route
    if (req.originalUrl.includes("/products")) {
      uploadPath = "./uploads/products/";
    } else if (req.originalUrl.includes("/users")) {
      uploadPath = "./uploads/users/";
    } else if (req.originalUrl.includes("/categories")) {
      uploadPath = "./uploads/categories/";
    } else if (req.originalUrl.includes("/reviews")) {
      uploadPath = "./uploads/reviews/";
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = file.fieldname + "-" + uniqueSuffix + ext;
    cb(null, name);
  },
});

// Choose storage based on Cloudinary configuration
const storage = isCloudinaryConfigured() ? cloudinaryStorage : localStorage;

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, JPG, PNG, GIF, WebP) are allowed!"));
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10, // Maximum 10 files
  },
  fileFilter: fileFilter,
});

// Middleware for different upload scenarios
const uploadMiddleware = {
  // Single file upload
  single: (fieldName) => upload.single(fieldName),

  // Multiple files upload
  multiple: (fieldName, maxCount = 5) => upload.array(fieldName, maxCount),

  // Multiple fields upload
  fields: (fields) => upload.fields(fields),

  // Product images upload (multiple)
  productImages: upload.array("images", 8),

  // User avatar upload (single)
  userAvatar: upload.single("avatar"),

  // Category image upload (single)
  categoryImage: upload.single("image"),

  // Review images upload (multiple)
  reviewImages: upload.array("images", 5),
};

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 5MB per file.",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Please select fewer files.",
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected field name for file upload.",
      });
    }
  }

  if (error.message.includes("Only image files")) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next(error);
};

// Utility function to delete files (works for both local and Cloudinary)
const deleteFile = async (fileUrl) => {
  if (!fileUrl) return;

  try {
    // If it's a Cloudinary URL, extract public_id and delete from Cloudinary
    if (fileUrl.includes("cloudinary.com")) {
      const publicId = extractCloudinaryPublicId(fileUrl);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
        console.log(`✅ Deleted Cloudinary image: ${publicId}`);
      }
    } else {
      // For local files
      const filePath = fileUrl.replace(
        process.env.BASE_URL || "http://localhost:5000",
        "."
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Deleted local file: ${filePath}`);
      }
    }
  } catch (error) {
    console.error("❌ Error deleting file:", error);
  }
};

// Helper function to extract Cloudinary public_id from URL
const extractCloudinaryPublicId = (url) => {
  try {
    const matches = url.match(/\/v\d+\/(.+)\./);
    return matches ? matches[1] : null;
  } catch (error) {
    console.error("Error extracting public_id:", error);
    return null;
  }
};

// Utility function to get file URL (updated for Cloudinary)
const getFileUrl = (filename, type = "products") => {
  if (!filename) return null;

  // If it's already a full URL (Cloudinary), return as is
  if (filename.startsWith("http")) {
    return filename;
  }

  // For local files, construct local URL
  return `${
    process.env.BASE_URL || "http://localhost:5000"
  }/uploads/${type}/${filename}`;
};

module.exports = {
  uploadMiddleware,
  handleUploadError,
  deleteFile,
  getFileUrl,
  cloudinary,
  isCloudinaryConfigured,
};
