const mongoose = require("mongoose");

// ============================================
// 1. SUB-SCHEMA: Individual Inventory Batch
//    (Tracks expiry, quantity, and warehouse location)
// ============================================
const BatchSchema = new mongoose.Schema(
  {
    batchNumber: {
      type: String,
      required: [true, "Batch number is required"],
      trim: true,
    },
    manufactureDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required for cosmetics"],
      index: true, // 🔥 CRUCIAL: Allows fast queries for "expiring soon"
    },
    quantity: {
      type: Number,
      required: [true, "Batch quantity is required"],
      min: [0, "Quantity cannot be negative"],
      default: 0,
    },
    warehouseLocation: {
      type: String,
      default: "Main Warehouse",
      trim: true,
    },
  },
  {
    _id: true, // Keep unique _id for each batch to easily reference it later
    timestamps: true, // Track when this batch was added/updated
  },
);

// ============================================
// 2. SUB-SCHEMA: Product Variant
//    (e.g., "Ivory" shade in "50ml" size)
// ============================================
const VariantSchema = new mongoose.Schema(
  {
    shade: {
      type: String,
      trim: true,
      default: "N/A", // Useful for skincare that doesn't have shades
    },
    size: {
      type: String,
      required: [true, "Size is required (e.g., 50ml, 30g)"],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, "SKU is required for inventory tracking"],
      unique: true, // 🔥 Ensures no two variants share the same barcode/SKU globally
      trim: true,
      uppercase: true,
    },
    costPrice: {
      type: Number,
      required: [true, "Cost price is required"],
      min: [0, "Cost price cannot be negative"],
    },
    sellingPrice: {
      type: Number,
      required: [true, "Selling price is required"],
      min: [0, "Selling price cannot be negative"],
    },
    // 💡 EMBEDDED BATCHES: Each variant contains its own stock batches with expiry dates
    batches: [BatchSchema],
  },
  {
    _id: true,
    timestamps: true,
  },
);

// ============================================
// 3. MAIN PRODUCT SCHEMA
// ============================================
const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [100, "Product name cannot exceed 100 characters"],
    },
    brand: {
      type: String,
      required: [true, "Brand is required"],
      trim: true,
      index: true, // For fast brand-based searches
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: [
          "Skincare",
          "Makeup",
          "Haircare",
          "Fragrance",
          "Body Care",
          "Tools",
        ],
        message: "{VALUE} is not a valid category",
      },
      index: true,
    },
    subCategory: {
      type: String,
      required: [true, "Sub-category is required"],
      enum: {
        values: [
          "Foundation",
          "Lipstick",
          "Mascara",
          "Eyeshadow",
          "Moisturizer",
          "Serum",
          "Sunscreen",
          "Shampoo",
          "Conditioner",
          "Perfume",
          "Other",
        ],
        message: "{VALUE} is not a valid sub-category",
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },
    images: {
      type: [String], // Array of Cloudinary/ImgBB URLs
      default: [],
      validate: {
        validator: function (arr) {
          return arr.length <= 10; // Max 10 images per product
        },
        message: "A product can have at most 10 images",
      },
    },
    isActive: {
      type: Boolean,
      default: true, // Soft delete / hide out-of-stock products
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // 🔥 EMBEDDED VARIANTS: All shades/sizes for this product live here
    variants: [VariantSchema],
  },
  {
    timestamps: true, // Adds createdAt & updatedAt
    toJSON: { virtuals: true }, // Enables virtual fields to show in JSON responses
    toObject: { virtuals: true },
  },
  // Add these fields inside your ProductSchema definition
);

// ============================================
// 4. VIRTUAL: Calculate total stock across all variants & batches
// ============================================
ProductSchema.virtual("totalStock").get(function () {
  let total = 0;
  this.variants.forEach((variant) => {
    variant.batches.forEach((batch) => {
      total += batch.quantity;
    });
  });
  return total;
});

// ============================================
// 5. INSTANCE METHOD: Reduce stock from a specific batch
//    (Used when a sale is made)
// ============================================
ProductSchema.methods.deductBatchStock = function (
  variantId,
  batchId,
  quantityToDeduct,
) {
  const variant = this.variants.id(variantId);
  if (!variant) throw new Error("Variant not found");

  const batch = variant.batches.id(batchId);
  if (!batch) throw new Error("Batch not found");

  if (batch.quantity < quantityToDeduct) {
    throw new Error(`Insufficient stock in batch ${batch.batchNumber}`);
  }

  batch.quantity -= quantityToDeduct;
  return this.save();
};

// ============================================
// 6. PRE-SAVE MIDDLEWARE: Auto-generate SKU if missing
//    (e.g., LOREAL-FOUNDATION-IVORY-50ML)
// ============================================
ProductSchema.pre("save", function () {
  this.variants.forEach((variant) => {
    if (!variant.sku) {
      const brand = (this.brand || "PRD").replace(/\s+/g, "-").toUpperCase();
      const shade = (variant.shade || "GEN").replace(/\s+/g, "-").toUpperCase();
      const size = (variant.size || "STD").replace(/\s+/g, "-").toUpperCase();
      const random = Math.floor(1000 + Math.random() * 9000);
      variant.sku = `${brand}-${shade}-${size}-${random}`;
    }
  });
});

// ============================================
// 7. COMPOUND INDEXES for Fast Performance
// ============================================
ProductSchema.index({ brand: 1, category: 1 });


// ============================================
// 8. STATIC METHOD: Get all products expiring in the next X days
// ============================================
ProductSchema.statics.findExpiringSoon = function (days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  // This returns products that have at least one batch expiring within `days`
  return this.find({
    "variants.batches.expiryDate": {
      $gte: new Date(), // Expiry is in the future
      $lte: futureDate, // Expiry is within the next X days
    },
  });
};

module.exports = mongoose.model("Product", ProductSchema);
