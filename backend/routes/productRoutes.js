const express = require('express');
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  adjustStock,
  getExpiringSoon,
  getLowStock,
} = require('../controllers/productController');
const { protect, restrictTo } = require('../middleware/auth');

// ============================================
// 🔒 PROTECTED ROUTES (Authentication required)
// ============================================
router.use(protect);

// Specific routes must come BEFORE parameterized /:id route
router.get('/expiring', getExpiringSoon);
router.get('/low-stock', getLowStock);
router.patch('/stock', restrictTo('admin', 'manager'), adjustStock);

// Product collection routes
router
  .route('/')
  .get(getAllProducts)
  .post(restrictTo('admin', 'manager'), createProduct);

// Product detail / update / delete by ID
router
  .route('/:id')
  .get(getProductById)
  .put(restrictTo('admin', 'manager'), updateProduct)
  .delete(restrictTo('admin'), deleteProduct);

module.exports = router;
