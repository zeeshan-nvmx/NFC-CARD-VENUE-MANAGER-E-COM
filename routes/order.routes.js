// routes/order.routes.js
const express = require('express')
const router = express.Router()
const orderController = require('../controllers/order.controller')
const { authenticateUser, authorizeUser, authenticateOnlineCustomer } = require('../utils/authorize-authenticate')

// NFC order routes (protected with staff roles)
router.post('/orders/nfc', authenticateUser, authorizeUser('stallAdmin', 'stallCashier'), orderController.createOrder)

// Online customer order routes
router.post('/orders/online', authenticateOnlineCustomer, orderController.createOrder)

// Common order routes
router.get('/stall/:stallId/orders', authenticateUser, authorizeUser('stallAdmin', 'stallCashier', 'masterAdmin'), orderController.getOrdersByStall)

router.get('/orders/:orderId', authenticateUser, authorizeUser('stallAdmin', 'stallCashier', 'masterAdmin'), orderController.getOrder)

// Order status update
router.patch('/orders/:orderId/status', authenticateUser, authorizeUser('stallAdmin', 'stallCashier'), orderController.updateOrderStatus)

// Payment webhook routes (public)
router.post('/orders/payment/success', orderController.handlePaymentSuccess)
router.post('/orders/payment/fail', orderController.handlePaymentFailure)
router.post('/orders/payment/cancel', orderController.handlePaymentCancel)

module.exports = router
