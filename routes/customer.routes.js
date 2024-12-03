// routes/customer.routes.js
const express = require('express')
const router = express.Router()
const customerController = require('../controllers/customer.controller')
const { authenticateUser, authorizeUser, authenticateOnlineCustomer } = require('../utils/authorize-authenticate')

// NFC Customer Management (Staff Only)
router.post('/customers/create', authenticateUser, authorizeUser('rechargerAdmin', 'recharger'), customerController.createCustomer)

router.post('/customers/recharge', authenticateUser, authorizeUser('rechargerAdmin', 'recharger'), customerController.rechargeCard)

router.delete('/customers/delete/:customerId', authenticateUser, authorizeUser('rechargerAdmin', 'recharger'), customerController.deleteCustomer)

router.post('/customers/removeCard', authenticateUser, authorizeUser('rechargerAdmin', 'recharger'), customerController.removeCardUid)

router.get(
  '/customers/getCustomer/:identifier',
  authenticateUser,
  authorizeUser('rechargerAdmin', 'recharger', 'stallAdmin', 'stallCashier'),
  customerController.getCustomerByCardUidOrPhone
)

router.post('/customers/addCard', authenticateUser, authorizeUser('rechargerAdmin', 'recharger'), customerController.addCardToCustomerByPhone)

// Customer Listing (Staff Only)
router.get('/customers', authenticateUser, authorizeUser('rechargerAdmin', 'recharger', 'masterAdmin'), customerController.getAllCustomersWithDetails)

router.get('/customers/:phone', authenticateUser, authorizeUser('rechargerAdmin', 'recharger', 'masterAdmin'), customerController.getCustomerByPhoneNumber)

// Online Customer Profile Management
router.put('/customers/profile', authenticateOnlineCustomer, customerController.updateCustomerProfile)

module.exports = router
