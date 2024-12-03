const express = require('express')
const router = express.Router()
const {authenticateUser, authorizeUser} = require('../utils/authorize-authenticate')
const authController = require('../controllers/auth.controller')

router.post('/auth/register', authController.register)
router.post('/auth/login', authController.login)
router.post('/auth/request-password-reset', authController.requestPasswordReset)
router.post('/auth/reset-password', authController.resetPassword)


router.get('/auth/recharger-admins', authenticateUser, authorizeUser('masterAdmin'), authController.getAllRechargerAdmins)

router.get('/auth/rechargers', authenticateUser, authorizeUser('masterAdmin', 'rechargerAdmin'), authController.getAllRechargers)

module.exports = router
