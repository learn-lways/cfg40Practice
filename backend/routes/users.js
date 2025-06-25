const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get("/", authenticate, authorize("admin"), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { role, isActive, search } = req.query;

    // Build query
    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get("/:id", authenticate, async (req, res) => {
  try {
    const userId = req.params.id;

    // Users can only view their own profile unless they're admin
    if (req.user._id.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const user = await User.findById(userId)
      .select("-password")
      .populate("buyerInfo.wishlist", "name price images")
      .populate("buyerInfo.orderHistory");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put(
  "/:id",
  authenticate,
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Name must be between 2 and 50 characters"),
    body("phone")
      .optional()
      .isMobilePhone()
      .withMessage("Please provide a valid phone number"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const userId = req.params.id;
      const { name, phone, isActive } = req.body;

      // Users can only update their own profile unless they're admin
      if (req.user._id.toString() !== userId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;

      // Only admins can change isActive status
      if (isActive !== undefined && req.user.role === "admin") {
        updateData.isActive = isActive;
      }

      const user = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      }).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        message: "User updated successfully",
        data: user,
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   POST /api/users/:id/addresses
// @desc    Add address to user
// @access  Private
router.post(
  "/:id/addresses",
  authenticate,
  [
    body("type")
      .isIn(["home", "work", "other"])
      .withMessage("Type must be home, work, or other"),
    body("street").notEmpty().withMessage("Street is required"),
    body("city").notEmpty().withMessage("City is required"),
    body("state").notEmpty().withMessage("State is required"),
    body("zipCode").notEmpty().withMessage("Zip code is required"),
    body("country").notEmpty().withMessage("Country is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const userId = req.params.id;

      // Users can only add addresses to their own profile
      if (req.user._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const { type, street, city, state, zipCode, country, isDefault } =
        req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // If this is set as default, remove default from other addresses
      if (isDefault) {
        user.addresses.forEach((addr) => (addr.isDefault = false));
      }

      user.addresses.push({
        type,
        street,
        city,
        state,
        zipCode,
        country,
        isDefault: isDefault || user.addresses.length === 0,
      });

      await user.save();

      res.json({
        success: true,
        message: "Address added successfully",
        data: user.addresses,
      });
    } catch (error) {
      console.error("Add address error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   PUT /api/users/:id/addresses/:addressId
// @desc    Update user address
// @access  Private
router.put("/:id/addresses/:addressId", authenticate, async (req, res) => {
  try {
    const userId = req.params.id;
    const addressId = req.params.addressId;

    // Users can only update their own addresses
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const { type, street, city, state, zipCode, country, isDefault } = req.body;

    // If this is set as default, remove default from other addresses
    if (isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    // Update address fields
    if (type) address.type = type;
    if (street) address.street = street;
    if (city) address.city = city;
    if (state) address.state = state;
    if (zipCode) address.zipCode = zipCode;
    if (country) address.country = country;
    if (isDefault !== undefined) address.isDefault = isDefault;

    await user.save();

    res.json({
      success: true,
      message: "Address updated successfully",
      data: user.addresses,
    });
  } catch (error) {
    console.error("Update address error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   DELETE /api/users/:id/addresses/:addressId
// @desc    Delete user address
// @access  Private
router.delete("/:id/addresses/:addressId", authenticate, async (req, res) => {
  try {
    const userId = req.params.id;
    const addressId = req.params.addressId;

    // Users can only delete their own addresses
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === addressId
    );
    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const wasDefault = user.addresses[addressIndex].isDefault;
    user.addresses.splice(addressIndex, 1);

    // If deleted address was default and there are other addresses, make the first one default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.json({
      success: true,
      message: "Address deleted successfully",
      data: user.addresses,
    });
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   PUT /api/users/:id/seller-info
// @desc    Update seller information
// @access  Private/Seller
router.put(
  "/:id/seller-info",
  authenticate,
  authorize("seller", "admin"),
  [
    body("businessName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Business name must be between 2 and 100 characters"),
    body("businessType")
      .optional()
      .isIn(["individual", "company", "partnership"])
      .withMessage("Business type must be individual, company, or partnership"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const userId = req.params.id;

      // Sellers can only update their own info unless admin
      if (req.user._id.toString() !== userId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const {
        businessName,
        businessType,
        taxId,
        businessAddress,
        bankDetails,
      } = req.body;

      const updateData = {};
      if (businessName) updateData["sellerInfo.businessName"] = businessName;
      if (businessType) updateData["sellerInfo.businessType"] = businessType;
      if (taxId) updateData["sellerInfo.taxId"] = taxId;
      if (businessAddress)
        updateData["sellerInfo.businessAddress"] = businessAddress;
      if (bankDetails) updateData["sellerInfo.bankDetails"] = bankDetails;

      const user = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      }).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        message: "Seller information updated successfully",
        data: user,
      });
    } catch (error) {
      console.error("Update seller info error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   GET /api/users/sellers
// @desc    Get all sellers
// @access  Public
router.get("/sellers", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { verified, search } = req.query;

    const query = {
      role: "seller",
      isActive: true,
    };

    if (verified !== undefined) {
      query["sellerInfo.isVerified"] = verified === "true";
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { "sellerInfo.businessName": { $regex: search, $options: "i" } },
      ];
    }

    const sellers = await User.find(query)
      .select(
        "name sellerInfo.businessName sellerInfo.rating sellerInfo.totalSales sellerInfo.isVerified createdAt"
      )
      .sort({ "sellerInfo.rating": -1, "sellerInfo.totalSales": -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        sellers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get sellers error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
