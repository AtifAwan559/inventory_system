const Product = require('../models/Product');
const mongoose = require('mongoose');

// Helper to sanitize variant SKUs before saving
const ensureVariantSkus = (brand, variants) => {
  if (!Array.isArray(variants)) return [];
  return variants.map((variant) => {
    if (!variant.sku || variant.sku.trim() === '') {
      const cleanBrand = (brand || 'PRD').replace(/\s+/g, '-').toUpperCase();
      const cleanShade = (variant.shade || 'GEN').replace(/\s+/g, '-').toUpperCase();
      const cleanSize = (variant.size || 'STD').replace(/\s+/g, '-').toUpperCase();
      const random = Math.floor(1000 + Math.random() * 9000);
      variant.sku = `${cleanBrand}-${cleanShade}-${cleanSize}-${random}`;
    } else {
      variant.sku = variant.sku.trim().toUpperCase();
    }
    return variant;
  });
};

// ============================================
// 1. CREATE PRODUCT
// ============================================
exports.createProduct = async (req, res) => {
  try {
    const productData = { ...req.body };

    if (typeof productData.variants === 'string') {
      try {
        productData.variants = JSON.parse(productData.variants);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid variants JSON format',
        });
      }
    }

    if (!productData.name || !productData.brand || !productData.category || !productData.subCategory) {
      return res.status(400).json({
        success: false,
        message: 'Name, brand, category and sub-category are required',
      });
    }

    if (!productData.variants || productData.variants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one variant with size and price is required',
      });
    }

    // Ensure SKUs
    productData.variants = ensureVariantSkus(productData.brand, productData.variants);

    productData.createdBy = req.user._id || req.user.id;
    productData.updatedBy = req.user._id || req.user.id;

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    console.error('Create Product Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating product',
    });
  }
};

// ============================================
// 2. GET ALL PRODUCTS (with search & filters)
// ============================================
exports.getAllProducts = async (req, res) => {
  try {
    const filter = {};

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { brand: { $regex: req.query.search, $options: 'i' } },
        { 'variants.sku': { $regex: req.query.search, $options: 'i' } },
      ];
    }

    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }

    if (req.query.subCategory && req.query.subCategory !== 'all') {
      filter.subCategory = req.query.subCategory;
    }

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error('Get All Products Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching products',
      error: error.message,
    });
  }
};

// ============================================
// 3. GET SINGLE PRODUCT BY ID
// ============================================
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Get Product By ID Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching product',
      error: error.message,
    });
  }
};

// ============================================
// 4. UPDATE PRODUCT
// ============================================
exports.updateProduct = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (typeof updateData.variants === 'string') {
      try {
        updateData.variants = JSON.parse(updateData.variants);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid variants JSON format',
        });
      }
    }

    if (updateData.variants) {
      updateData.variants = ensureVariantSkus(updateData.brand, updateData.variants);
    }

    updateData.updatedBy = req.user._id || req.user.id;

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    console.error('Update Product Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating product',
    });
  }
};

// ============================================
// 5. DELETE PRODUCT (Permanent)
// ============================================
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete Product Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting product',
      error: error.message,
    });
  }
};

// ============================================
// 6. ADJUST STOCK (Add or Deduct from a specific batch)
// ============================================
exports.adjustStock = async (req, res) => {
  try {
    const { productId, variantId, batchId, quantity, operation } = req.body;

    const qty = parseInt(quantity);
    if (!productId || !variantId || !batchId || isNaN(qty) || qty <= 0 || !operation) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid productId, variantId, batchId, positive quantity, and operation',
      });
    }

    if (!['add', 'deduct'].includes(operation)) {
      return res.status(400).json({
        success: false,
        message: 'Operation must be either "add" or "deduct"',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Variant not found on product',
      });
    }

    const batch = variant.batches.id(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found in variant',
      });
    }

    if (operation === 'add') {
      batch.quantity += qty;
    } else {
      if (batch.quantity < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock. Available in batch: ${batch.quantity}, requested to deduct: ${qty}`,
        });
      }
      batch.quantity -= qty;
    }

    product.updatedBy = req.user._id || req.user.id;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Stock successfully ${operation === 'add' ? 'added to' : 'deducted from'} batch ${batch.batchNumber}`,
      data: product,
    });
  } catch (error) {
    console.error('Adjust Stock Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adjusting stock',
      error: error.message,
    });
  }
};

// ============================================
// 7. GET PRODUCTS EXPIRING SOON
// ============================================
exports.getExpiringSoon = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + days);

    const allProducts = await Product.find({
      'variants.batches.expiryDate': { $lte: thresholdDate },
    });

    let totalExpiringBatches = 0;
    const expiringList = [];

    allProducts.forEach((prod) => {
      let productHasExpiringBatch = false;
      const matchedVariants = [];

      prod.variants.forEach((v) => {
        const expiringBatches = v.batches.filter((b) => {
          const exp = new Date(b.expiryDate);
          return exp <= thresholdDate && b.quantity > 0;
        });

        if (expiringBatches.length > 0) {
          productHasExpiringBatch = true;
          totalExpiringBatches += expiringBatches.length;
          matchedVariants.push({
            variantId: v._id,
            shade: v.shade,
            size: v.size,
            sku: v.sku,
            batches: expiringBatches,
          });
        }
      });

      if (productHasExpiringBatch) {
        expiringList.push({
          _id: prod._id,
          name: prod.name,
          brand: prod.brand,
          category: prod.category,
          subCategory: prod.subCategory,
          variants: matchedVariants,
        });
      }
    });

    res.status(200).json({
      success: true,
      count: expiringList.length,
      totalExpiringBatches,
      daysThreshold: days,
      data: expiringList,
    });
  } catch (error) {
    console.error('Get Expiring Soon Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching expiring products',
      error: error.message,
    });
  }
};

// ============================================
// 8. GET PRODUCTS WITH LOW STOCK
// ============================================
exports.getLowStock = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;

    const products = await Product.find({});

    let totalLowStockBatches = 0;
    const lowStockList = [];

    products.forEach((prod) => {
      let hasLowStock = false;
      const matchedVariants = [];

      prod.variants.forEach((v) => {
        const lowBatches = v.batches.filter((b) => b.quantity <= threshold);
        if (lowBatches.length > 0) {
          hasLowStock = true;
          totalLowStockBatches += lowBatches.length;
          matchedVariants.push({
            variantId: v._id,
            shade: v.shade,
            size: v.size,
            sku: v.sku,
            batches: lowBatches,
          });
        }
      });

      if (hasLowStock) {
        lowStockList.push({
          _id: prod._id,
          name: prod.name,
          brand: prod.brand,
          category: prod.category,
          subCategory: prod.subCategory,
          variants: matchedVariants,
        });
      }
    });

    res.status(200).json({
      success: true,
      threshold,
      totalLowStockBatches,
      count: lowStockList.length,
      data: lowStockList,
    });
  } catch (error) {
    console.error('Get Low Stock Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching low stock products',
      error: error.message,
    });
  }
};
