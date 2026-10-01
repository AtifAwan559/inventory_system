const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  updateMe,
  changePassword,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');

// ============================================
// 🔐 AUTHENTICATION ROUTES (Public & Self)
// ============================================

// Public routes (No authentication needed)
router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);

// Protected routes (User must be logged in)
router.post('/auth/logout', protect, logoutUser);
router.get('/auth/me', protect, getMe);
router.put('/auth/updateme', protect, updateMe);
router.put('/auth/changepassword', protect, changePassword);

// ============================================
// 👑 ADMIN-ONLY USER MANAGEMENT ROUTES
// ============================================

// Get all users (with pagination & filters)
router.get(
  '/users',
  protect,
  restrictTo('admin'),
  getAllUsers
);

// Get, Update, or Delete a specific user by ID
router
  .route('/users/:id')
  .get(protect, restrictTo('admin'), getUserById)
  .put(protect, restrictTo('admin'), updateUser)
  .delete(protect, restrictTo('admin'), deleteUser);

module.exports = router;