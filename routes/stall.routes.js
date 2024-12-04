// routes/stall.routes.js
const express = require('express')
const router = express.Router()
const stallController = require('../controllers/stall.controller')
const { authenticateUser, authorizeUser } = require('../utils/authorize-authenticate')
const { upload } = require('../utils/image')

// Public routes
router.get('/stall/menu', stallController.getStallMenu)
router.get('/stall/public', stallController.getAllStallsPublic)

// Protected routes

// router.post('/stall', authenticateUser, authorizeUser('masterAdmin'), upload.single('image'), stallController.createStall)

router.post(
  '/stall',
  authenticateUser,
  authorizeUser('masterAdmin'),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]),
  stallController.createStall
)


router.get('/stall/:stallId', authenticateUser, authorizeUser('masterAdmin', 'rechargerAdmin', 'recharger', 'stallAdmin', 'stallCashier'), stallController.getStall)

router.get('/stall', authenticateUser, authorizeUser('masterAdmin', 'rechargerAdmin', 'recharger', 'stallAdmin', 'stallCashier'), stallController.getAllStalls)

// router.delete('/stall/:stallId', authenticateUser, authorizeUser('masterAdmin'), stallController.deleteStall)

// router.put('/stall/:stallId', authenticateUser, authorizeUser('masterAdmin', 'stallAdmin'), upload.single('image'), stallController.editStall)


router.put(
  '/stall/:stallId',
  authenticateUser,
  authorizeUser('masterAdmin', 'stallAdmin'),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]),
  stallController.editStall
)

// Menu item routes
router.post('/stall/:stallId/menu', authenticateUser, authorizeUser('stallAdmin'), upload.single('image'), stallController.addMenuItem)

router.put('/stall/:stallId/menu/:menuId', authenticateUser, authorizeUser('stallAdmin'), upload.single('image'), stallController.updateMenuItem)

router.delete('/stall/:stallId/menu/:menuId', authenticateUser, authorizeUser('stallAdmin'), stallController.removeMenuItem)

module.exports = router