// controllers/stall.controller.js
const Joi = require('joi')
const Stall = require('../models/stall.model')
const { uploadToS3, deleteFromS3 } = require('../utils/image')

async function createStall(req, res) {
  const menuItemSchema = Joi.object({
    foodName: Joi.string().required(),
    foodPrice: Joi.number().required(),
    isAvailable: Joi.boolean().required(),
    currentStock: Joi.number().required(),
    description: Joi.string().allow(''),
    isAvailableForDelivery: Joi.boolean().default(true),
  })

  const stallValidationSchema = Joi.object({
    motherStall: Joi.string().required(),
    stallAdmin: Joi.string().pattern(new RegExp('^[0-9a-fA-F]{24}$')),
    stallCashiers: Joi.array()
      .items(Joi.string().pattern(new RegExp('^[0-9a-fA-F]{24}$')))
      .default([]),
    menu: Joi.array().items(menuItemSchema),
    minimumOrderAmount: Joi.number().min(0).default(0),
  })

  try {
    await stallValidationSchema.validateAsync(req.body, { abortEarly: false })
    const { motherStall, stallAdmin, stallCashiers, menu, minimumOrderAmount } = req.body

    let imageUrl = null
    let thumbnailUrl = null

    if (req.file) {
      const uploadResult = await uploadToS3(req.file, 'stalls')
      imageUrl = uploadResult.imageUrl
      thumbnailUrl = uploadResult.thumbnailUrl
    }

    const newStall = await Stall.create({
      motherStall,
      stallAdmin,
      stallCashiers,
      menu,
      minimumOrderAmount,
      imageUrl,
      thumbnailUrl,
    })

    return res.status(201).json({
      message: 'Stall created successfully',
      data: newStall,
    })
  } catch (error) {
    console.error(error)
    return res.status(400).json({
      message: 'Error creating stall',
      error: error.message,
    })
  }
}

async function getStallMenu(req, res) {
  try {
    const stalls = await Stall.find({}, 'motherStall menu -_id').sort('motherStall')
    return res.status(200).json({
      message: 'Menu retrieved successfully',
      data: stalls,
    })
  } catch (error) {
    return res.status(400).json({
      message: 'Error retrieving menu',
      error: error.message,
    })
  }
}

async function getAllStalls(req, res) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const stalls = await Stall.aggregate([
      {
        $sort: { motherStall: 1 },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'stallAdmin',
          foreignField: '_id',
          as: 'stallAdminDetails',
        },
      },
      {
        $unwind: {
          path: '$stallAdminDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'orders',
          let: { stallId: '$_id', today: today },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$stallId', '$$stallId'] }, { $gte: ['$orderDate', '$$today'] }],
                },
              },
            },
            {
              $group: {
                _id: null,
                todayTotalOrderValue: { $sum: '$totalAmount' },
                todayOrderCount: { $sum: 1 },
              },
            },
          ],
          as: 'todayOrders',
        },
      },
      {
        $lookup: {
          from: 'orders',
          let: { stallId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$stallId', '$$stallId'],
                },
              },
            },
            {
              $group: {
                _id: null,
                lifetimeTotalOrderValue: { $sum: '$totalAmount' },
                lifetimeOrderCount: { $sum: 1 },
              },
            },
          ],
          as: 'lifetimeOrders',
        },
      },
      {
        $addFields: {
          todayTotalOrderValue: {
            $ifNull: [{ $arrayElemAt: ['$todayOrders.todayTotalOrderValue', 0] }, 0],
          },
          todayOrderCount: {
            $ifNull: [{ $arrayElemAt: ['$todayOrders.todayOrderCount', 0] }, 0],
          },
          lifetimeTotalOrderValue: {
            $ifNull: [{ $arrayElemAt: ['$lifetimeOrders.lifetimeTotalOrderValue', 0] }, 0],
          },
          lifetimeOrderCount: {
            $ifNull: [{ $arrayElemAt: ['$lifetimeOrders.lifetimeOrderCount', 0] }, 0],
          },
        },
      },
      {
        $project: {
          motherStall: 1,
          imageUrl: 1,
          thumbnailUrl: 1,
          minimumOrderAmount: 1,
          'stallAdminDetails._id': 1,
          'stallAdminDetails.name': 1,
          'stallAdminDetails.phone': 1,
          todayTotalOrderValue: 1,
          todayOrderCount: 1,
          lifetimeTotalOrderValue: 1,
          lifetimeOrderCount: 1,
        },
      },
    ])

    return res.status(200).json({
      message: 'Stalls retrieved successfully',
      data: stalls,
    })
  } catch (error) {
    return res.status(400).json({
      message: 'Error retrieving stalls',
      error: error.message,
    })
  }
}

async function editStall(req, res) {
  const { stallId } = req.params
  const updates = req.body

  try {
    const stall = await Stall.findById(stallId)
    if (!stall) {
      return res.status(404).json({ message: 'Stall not found' })
    }

    if (req.file) {
      // Delete old images if they exist
      if (stall.imageUrl) {
        const oldKey = stall.imageUrl.split('/').pop()
        await deleteFromS3(`stalls/${oldKey}`)
      }

      // Upload new images
      const uploadResult = await uploadToS3(req.file, 'stalls')
      updates.imageUrl = uploadResult.imageUrl
      updates.thumbnailUrl = uploadResult.thumbnailUrl
    }

    const updatedStall = await Stall.findByIdAndUpdate(stallId, updates, { new: true })

    return res.status(200).json({
      message: 'Stall updated successfully',
      data: updatedStall,
    })
  } catch (error) {
    return res.status(400).json({
      message: 'Error updating stall',
      error: error.message,
    })
  }
}

async function deleteStall(req, res) {
  const { stallId } = req.params

  try {
    const stall = await Stall.findById(stallId)
    if (!stall) {
      return res.status(404).json({ message: 'Stall not found' })
    }

    // Delete stall images if they exist
    if (stall.imageUrl) {
      const imageKey = stall.imageUrl.split('/').pop()
      await deleteFromS3(`stalls/${imageKey}`)
    }

    // Delete menu item images
    for (const menuItem of stall.menu) {
      if (menuItem.imageUrl) {
        const menuImageKey = menuItem.imageUrl.split('/').pop()
        await deleteFromS3(`menu-items/${menuImageKey}`)
      }
    }

    await stall.remove()

    return res.status(200).json({
      message: 'Stall deleted successfully',
    })
  } catch (error) {
    return res.status(400).json({
      message: 'Error deleting stall',
      error: error.message,
    })
  }
}

async function addMenuItem(req, res) {
  const { stallId } = req.params
  const { foodName, foodPrice, isAvailable, currentStock, description, isAvailableForDelivery } = req.body

  try {
    const stall = await Stall.findById(stallId)
    if (!stall) {
      return res.status(404).json({ message: 'Stall not found' })
    }

    let imageUrl = null
    let thumbnailUrl = null

    if (req.file) {
      const uploadResult = await uploadToS3(req.file, 'menu-items')
      imageUrl = uploadResult.imageUrl
      thumbnailUrl = uploadResult.thumbnailUrl
    }

    const menuItem = {
      foodName,
      foodPrice,
      isAvailable,
      currentStock,
      description,
      isAvailableForDelivery,
      imageUrl,
      thumbnailUrl,
    }

    stall.menu.push(menuItem)
    await stall.save()

    return res.status(201).json({
      message: 'Menu item added successfully',
      data: stall,
    })
  } catch (error) {
    return res.status(400).json({
      message: 'Error adding menu item',
      error: error.message,
    })
  }
}

async function updateMenuItem(req, res) {
  const { stallId, menuId } = req.params
  const updates = req.body

  try {
    const stall = await Stall.findById(stallId)
    if (!stall) {
      return res.status(404).json({ message: 'Stall not found' })
    }

    const menuItem = stall.menu.id(menuId)
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' })
    }

    if (req.file) {
      // Delete old images if they exist
      if (menuItem.imageUrl) {
        const oldKey = menuItem.imageUrl.split('/').pop()
        await deleteFromS3(`menu-items/${oldKey}`)
      }

      // Upload new images
      const uploadResult = await uploadToS3(req.file, 'menu-items')
      updates.imageUrl = uploadResult.imageUrl
      updates.thumbnailUrl = uploadResult.thumbnailUrl
    }

    Object.assign(menuItem, updates)
    await stall.save()

    return res.status(200).json({
      message: 'Menu item updated successfully',
      data: stall,
    })
  } catch (error) {
    return res.status(400).json({
      message: 'Error updating menu item',
      error: error.message,
    })
  }
}

async function removeMenuItem(req, res) {
  const { stallId, menuId } = req.params

  try {
    const stall = await Stall.findById(stallId)
    if (!stall) {
      return res.status(404).json({ message: 'Stall not found' })
    }

    const menuItem = stall.menu.id(menuId)
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' })
    }

    // Delete menu item images if they exist
    if (menuItem.imageUrl) {
      const imageKey = menuItem.imageUrl.split('/').pop()
      await deleteFromS3(`menu-items/${imageKey}`)
    }

    stall.menu = stall.menu.filter((item) => item.id !== menuId)
    await stall.save()

    return res.status(200).json({
      message: 'Menu item removed successfully',
      data: stall,
    })
  } catch (error) {
    return res.status(400).json({
      message: 'Error removing menu item',
      error: error.message,
    })
  }
}

async function getStall(req, res) {
  const { stallId } = req.params
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    const aggregation = await Stall.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(stallId) } },
      {
        $lookup: {
          from: 'orders',
          let: { stallId: '$_id', today: today },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$stallId', '$$stallId'] }, { $gte: ['$orderDate', '$$today'] }],
                },
              },
            },
            {
              $group: {
                _id: null,
                todayTotalOrderValue: { $sum: '$totalAmount' },
                todayOrderCount: { $sum: 1 },
              },
            },
          ],
          as: 'todayOrdersInfo',
        },
      },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'stallId',
          as: 'lifetimeOrdersInfo',
        },
      },
      {
        $unwind: {
          path: '$todayOrdersInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          todayTotalOrderValue: {
            $ifNull: ['$todayOrdersInfo.todayTotalOrderValue', 0],
          },
          todayOrderCount: {
            $ifNull: ['$todayOrdersInfo.todayOrderCount', 0],
          },
          lifetimeTotalOrderValue: {
            $sum: '$lifetimeOrdersInfo.totalAmount',
          },
          lifetimeOrderCount: {
            $size: '$lifetimeOrdersInfo',
          },
        },
      },
      {
        $project: {
          todayOrdersInfo: 0,
          lifetimeOrdersInfo: 0,
        },
      },
    ])

    if (aggregation.length === 0) {
      return res.status(404).json({ message: 'Stall not found' })
    }

    return res.status(200).json({
      message: 'Stall retrieved successfully',
      data: aggregation[0],
    })
  } catch (error) {
    return res.status(400).json({
      message: 'Error retrieving stall',
      error: error.message,
    })
  }
}

module.exports = {
  createStall,
  getStallMenu,
  getAllStalls,
  editStall,
  deleteStall,
  addMenuItem,
  updateMenuItem,
  removeMenuItem,
  getStall,
}
