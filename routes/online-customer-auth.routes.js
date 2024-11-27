const express = require('express')
const router = express.Router()
const onlineCustomerAuthController = require('../controllers/online-customer-auth.controller')

router.post('/online/register', onlineCustomerAuthController.register)
router.post('/online/verify-phone', onlineCustomerAuthController.verifyPhone)
router.post('/online/login', onlineCustomerAuthController.login)
router.post('/online/request-password-reset', onlineCustomerAuthController.requestPasswordReset)
router.post('/online/reset-password', onlineCustomerAuthController.resetPassword)

module.exports = router
