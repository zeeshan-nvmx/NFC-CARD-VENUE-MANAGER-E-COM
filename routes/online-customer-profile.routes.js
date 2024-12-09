// routes/online-customer-profile.routes.js
const express = require('express')
const router = express.Router()
const onlineCustomerProfileController = require('../controllers/online-customer-profile.controller')
const { authenticateOnlineCustomer } = require('../utils/authorize-authenticate')

router.get('/online/profile', authenticateOnlineCustomer, onlineCustomerProfileController.getProfile)
router.get('/online/customer/orders/:orderId', authenticateOnlineCustomer, onlineCustomerProfileController.getOrderDetails)
router.put('/online/profile', authenticateOnlineCustomer, onlineCustomerProfileController.updateProfile)
router.post('/online/address', authenticateOnlineCustomer, onlineCustomerProfileController.addAddress)
router.put('/online/address', authenticateOnlineCustomer, onlineCustomerProfileController.updateAddress)
router.delete('/online/address/:addressId', authenticateOnlineCustomer, onlineCustomerProfileController.deleteAddress)

module.exports = router
