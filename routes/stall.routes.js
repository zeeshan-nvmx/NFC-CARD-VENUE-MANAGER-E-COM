// routes/stall.routes.js
const express = require('express')
const router = express.Router()
const stallController = require('../controllers/stall.controller')
const { authenticateUser, authorizeUser } = require('../utils/authorize-authenticate')
const { upload } = require('../utils/image')

// Public routes
router.get('/stall/menu', stallController.getStallMenu)

// Protected routes
router.post('/stall', authenticateUser, authorizeUser('masterAdmin'), upload.single('image'), stallController.createStall)

router.get('/stall/:stallId', authenticateUser, authorizeUser('masterAdmin', 'rechargerAdmin', 'recharger', 'stallAdmin', 'stallCashier'), stallController.getStall)

router.get('/stall', authenticateUser, authorizeUser('masterAdmin', 'rechargerAdmin', 'recharger'), stallController.getAllStalls)

// router.delete('/stall/:stallId', authenticateUser, authorizeUser('masterAdmin'), stallController.deleteStall)

router.put('/stall/:stallId', authenticateUser, authorizeUser('masterAdmin', 'stallAdmin'), upload.single('image'), stallController.editStall)

// Menu item routes
router.post('/stall/:stallId/menu', authenticateUser, authorizeUser('stallAdmin'), upload.single('image'), stallController.addMenuItem)

router.put('/stall/:stallId/menu/:menuId', authenticateUser, authorizeUser('stallAdmin'), upload.single('image'), stallController.updateMenuItem)

router.delete('/stall/:stallId/menu/:menuId', authenticateUser, authorizeUser('stallAdmin'), stallController.removeMenuItem)

module.exports = router




// const express = require('express')
// const router = express.Router()
// const stallController = require('../controllers/stall.controller')
// const { authenticateUser, authorizeUser } = require('../utils/authorize-authenticate')

// // Public route for menu access
// router.get('/stall/menu', stallController.getStallMenu)

// // Protected routes
// router.post('/stall', authenticateUser, authorizeUser('masterAdmin'), stallController.createStall)

// router.get('/stall/:stallId', authenticateUser, authorizeUser('masterAdmin', 'rechargerAdmin', 'recharger', 'stallAdmin', 'stallCashier'), stallController.getStall)

// router.get('/stall', authenticateUser, authorizeUser('masterAdmin', 'rechargerAdmin', 'recharger'), stallController.getAllStalls)

// router.put('/stall/:stallId', authenticateUser, authorizeUser('masterAdmin', 'stallAdmin'), stallController.editStall)

// // router.delete('/stall/:stallId', authenticateUser, authorizeUser('masterAdmin'), stallController.deleteStall)

// router.post('/stall/:stallId/menu', authenticateUser, authorizeUser('stallAdmin'), stallController.addMenuItem)

// router.put('/stall/:stallId/menu/:menuId', authenticateUser, authorizeUser('stallAdmin'), stallController.updateMenuItem)

// router.delete('/stall/:stallId/menu/:menuId', authenticateUser, authorizeUser('stallAdmin'), stallController.removeMenuItem)

// // router.get('/stall/:stallId/menu', authenticateUser, authorizeUser('masterAdmin', 'rechargerAdmin', 'recharger', 'stallAdmin', 'stallCashier'), stallController.getMenu)

// module.exports = router
