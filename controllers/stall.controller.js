const Joi = require('joi')
const mongoose = require('mongoose')
const Stall = require('../models/stall.model')
const { uploadToS3, deleteFromS3 } = require('../utils/image')

// async function createStall(req, res) {
//   const menuItemSchema = Joi.object({
//     foodName: Joi.string().required(),
//     foodPrice: Joi.number().required(),
//     isAvailable: Joi.boolean().required(),
//     currentStock: Joi.number().required(),
//     description: Joi.string().allow(''),
//     isAvailableForDelivery: Joi.boolean().default(true),
//   })

//   const stallValidationSchema = Joi.object({
//     motherStall: Joi.string().required(),
//     stallAdmin: Joi.string().pattern(new RegExp('^[0-9a-fA-F]{24}$')),
//     stallCashiers: Joi.string(),
//     menu: Joi.string(),
//     minimumOrderAmount: Joi.number().min(0).default(0),
//   })

//   try {
//     await stallValidationSchema.validateAsync(req.body, { abortEarly: false })
//     let { motherStall, stallAdmin, stallCashiers, menu, minimumOrderAmount } = req.body

//     // Parse JSON strings for arrays
//     try {
//       stallCashiers = stallCashiers ? JSON.parse(stallCashiers) : []
//       menu = menu ? JSON.parse(menu) : []
//     } catch (error) {
//       return res.status(400).json({ 
//         message: 'Invalid JSON format for stallCashiers or menu', 
//         error: error.message 
//       })
//     }

//     // Validate menu items after parsing
//     for (const item of menu) {
//       try {
//         await menuItemSchema.validateAsync(item, { abortEarly: false })
//       } catch (error) {
//         return res.status(400).json({ 
//           message: 'Invalid menu item format', 
//           error: error.message 
//         })
//       }
//     }

//     let imageUrl = null
//     let thumbnailUrl = null

//     if (req.file) {
//       const uploadResult = await uploadToS3(req.file, 'stalls')
//       imageUrl = uploadResult.imageUrl
//       thumbnailUrl = uploadResult.thumbnailUrl
//     }

//     const newStall = await Stall.create({
//       motherStall,
//       stallAdmin,
//       stallCashiers,
//       menu,
//       minimumOrderAmount,
//       imageUrl,
//       thumbnailUrl
//     })

//     return res.status(201).json({
//       message: 'Stall created successfully',
//       data: newStall
//     })
//   } catch (error) {
//     return res.status(400).json({
//       message: 'Error creating stall',
//       error: error.message
//     })
//   }
// }

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
    stallCashiers: Joi.string(),
    menu: Joi.string(),
    minimumOrderAmount: Joi.number().min(0).default(0),
    address: Joi.object({
      street: Joi.string().required(),
      area: Joi.string().required(),
      city: Joi.string().required(),
      postalCode: Joi.string(),
    }).required(),
    deliveryTime: Joi.object({
      min: Joi.number().required(),
      max: Joi.number().required(),
    }).required(),
  })

  try {
    await stallValidationSchema.validateAsync(req.body, { abortEarly: false })
    let { motherStall, stallAdmin, stallCashiers, menu, minimumOrderAmount, address, deliveryTime } = req.body

    try {
      stallCashiers = stallCashiers ? JSON.parse(stallCashiers) : []
      menu = menu ? JSON.parse(menu) : []
    } catch (error) {
      return res.status(400).json({
        message: 'Invalid JSON format for stallCashiers or menu',
        error: error.message,
      })
    }

    for (const item of menu) {
      try {
        await menuItemSchema.validateAsync(item, { abortEarly: false })
      } catch (error) {
        return res.status(400).json({
          message: 'Invalid menu item format',
          error: error.message,
        })
      }
    }

    let imageUrl = null
    let thumbnailUrl = null
    let bannerUrl = null

    if (req.files) {
      if (req.files['image']) {
        const uploadResult = await uploadToS3(req.files['image'][0], 'stalls')
        imageUrl = uploadResult.imageUrl
        thumbnailUrl = uploadResult.thumbnailUrl
      }
      if (req.files['banner']) {
        const uploadResult = await uploadToS3(req.files['banner'][0], 'stalls/banners')
        bannerUrl = uploadResult.imageUrl
      }
    }

    const newStall = await Stall.create({
      motherStall,
      stallAdmin,
      stallCashiers,
      menu,
      minimumOrderAmount,
      imageUrl,
      thumbnailUrl,
      bannerUrl,
      address,
      deliveryTime,
    })

    return res.status(201).json({
      message: 'Stall created successfully',
      data: newStall,
    })
  } catch (error) {
    return res.status(400).json({
      message: 'Error creating stall',
      error: error.message,
    })
  }
}

async function getAllStalls(req, res) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

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
        $lookup: {
          from: 'users',
          localField: 'stallCashiers',
          foreignField: '_id',
          as: 'stallCashierDetails',
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
          let: { stallId: '$_id', startOfMonth: startOfMonth },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$stallId', '$$stallId'] }, { $gte: ['$orderDate', '$$startOfMonth'] }],
                },
              },
            },
            {
              $group: {
                _id: null,
                monthlyTotalOrderValue: { $sum: '$totalAmount' },
                monthlyOrderCount: { $sum: 1 },
              },
            },
          ],
          as: 'monthlyOrders',
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
          monthlyTotalOrderValue: {
            $ifNull: [{ $arrayElemAt: ['$monthlyOrders.monthlyTotalOrderValue', 0] }, 0],
          },
          monthlyOrderCount: {
            $ifNull: [{ $arrayElemAt: ['$monthlyOrders.monthlyOrderCount', 0] }, 0],
          },
        },
      },
      {
        $project: {
          motherStall: 1,
          imageUrl: 1,
          thumbnailUrl: 1,
          minimumOrderAmount: 1,
          menu: 1,
          'stallAdminDetails._id': 1,
          'stallAdminDetails.name': 1,
          'stallAdminDetails.phone': 1,
          'stallAdminDetails.role': 1,
          stallCashierDetails: {
            $map: {
              input: '$stallCashierDetails',
              as: 'cashier',
              in: {
                _id: '$$cashier._id',
                name: '$$cashier.name',
                phone: '$$cashier.phone',
                role: '$$cashier.role',
              },
            },
          },
          todayTotalOrderValue: 1,
          todayOrderCount: 1,
          monthlyTotalOrderValue: 1,
          monthlyOrderCount: 1,
          createdAt: 1,
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

async function getAllStallsPublic(req, res) {
  try {
    const stalls = await Stall.aggregate([
      {
        $sort: { motherStall: 1 },
      },
      {
        $project: {
          motherStall: 1,
          imageUrl: 1,
          thumbnailUrl: 1,
          bannerUrl: 1,
          minimumOrderAmount: 1,
          menu: 1,
          address: 1,
          deliveryTime: 1,
          createdAt: 1,
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

async function getStall(req, res) {
  const { stallId } = req.params
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  try {
    const aggregation = await Stall.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(stallId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'stallAdmin',
          foreignField: '_id',
          as: 'stallAdminDetails',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'stallCashiers',
          foreignField: '_id',
          as: 'stallCashierDetails',
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
          as: 'todayOrdersInfo',
        },
      },
      {
        $lookup: {
          from: 'orders',
          let: { stallId: '$_id', startOfMonth: startOfMonth },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$stallId', '$$stallId'] }, { $gte: ['$orderDate', '$$startOfMonth'] }],
                },
              },
            },
            {
              $group: {
                _id: null,
                monthlyTotalOrderValue: { $sum: '$totalAmount' },
                monthlyOrderCount: { $sum: 1 },
              },
            },
          ],
          as: 'monthlyOrdersInfo',
        },
      },
      {
        $unwind: {
          path: '$todayOrdersInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$monthlyOrdersInfo',
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
          monthlyTotalOrderValue: {
            $ifNull: ['$monthlyOrdersInfo.monthlyTotalOrderValue', 0],
          },
          monthlyOrderCount: {
            $ifNull: ['$monthlyOrdersInfo.monthlyOrderCount', 0],
          },
        },
      },
      {
        $project: {
          motherStall: 1,
          imageUrl: 1,
          thumbnailUrl: 1,
          minimumOrderAmount: 1,
          menu: 1,
          'stallAdminDetails._id': 1,
          'stallAdminDetails.name': 1,
          'stallAdminDetails.phone': 1,
          'stallAdminDetails.role': 1,
          stallCashierDetails: {
            $map: {
              input: '$stallCashierDetails',
              as: 'cashier',
              in: {
                _id: '$$cashier._id',
                name: '$$cashier.name',
                phone: '$$cashier.phone',
                role: '$$cashier.role',
              },
            },
          },
          todayTotalOrderValue: 1,
          todayOrderCount: 1,
          monthlyTotalOrderValue: 1,
          monthlyOrderCount: 1,
          createdAt: 1,
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


async function getStallMenu(req, res) {
  try {
    const stalls = await Stall.find({}, 'motherStall menu -_id').sort('motherStall')
    return res.status(200).json({
      message: 'Menu retrieved successfully',
      data: stalls
    })
  } catch (error) {
    return res.status(400).json({
      message: 'Error retrieving menu',
      error: error.message
    })
  }
}

// async function editStall(req, res) {
//   const { stallId } = req.params
  
//   try {
//     const stall = await Stall.findById(stallId)
//     if (!stall) {
//       return res.status(404).json({ message: 'Stall not found' })
//     }
    
//     let updates = { ...req.body }
    
//     // Parse JSON strings if present
//     if (updates.stallCashiers) {
//       try {
//         updates.stallCashiers = JSON.parse(updates.stallCashiers)
//       } catch (error) {
//         return res.status(400).json({
//           message: 'Invalid JSON format for stallCashiers',
//           error: error.message
//         })
//       }
//     }
    
//     if (updates.menu) {
//       try {
//         updates.menu = JSON.parse(updates.menu)
//       } catch (error) {
//         return res.status(400).json({
//           message: 'Invalid JSON format for menu',
//           error: error.message
//         })
//       }
//     }
    
//     if (req.file) {
//       if (stall.imageUrl) {
//         const oldKey = stall.imageUrl.split('/').pop()
//         await deleteFromS3(`stalls/${oldKey}`)
//       }
      
//       const uploadResult = await uploadToS3(req.file, 'stalls')
//       updates.imageUrl = uploadResult.imageUrl
//       updates.thumbnailUrl = uploadResult.thumbnailUrl
//     }
    
//     const updatedStall = await Stall.findByIdAndUpdate(
//       stallId,
//       updates,
//       { new: true }
//     )
    
//     return res.status(200).json({
//       message: 'Stall updated successfully',
//       data: updatedStall
//     })
//   } catch (error) {
//     return res.status(400).json({
//       message: 'Error updating stall',
//       error: error.message
//     })
//   }
// }

async function editStall(req, res) {
  const { stallId } = req.params

  const validationSchema = Joi.object({
    motherStall: Joi.string(),
    stallAdmin: Joi.string().pattern(new RegExp('^[0-9a-fA-F]{24}$')),
    stallCashiers: Joi.string(),
    menu: Joi.string(),
    minimumOrderAmount: Joi.number().min(0),
    address: Joi.object({
      street: Joi.string(),
      area: Joi.string(),
      city: Joi.string(),
      postalCode: Joi.string(),
    }),
    deliveryTime: Joi.object({
      min: Joi.number(),
      max: Joi.number(),
    }),
  })

  try {
    await validationSchema.validateAsync(req.body, { abortEarly: false })

    const stall = await Stall.findById(stallId)
    if (!stall) {
      return res.status(404).json({ message: 'Stall not found' })
    }

    let updates = { ...req.body }

    if (updates.stallCashiers) {
      try {
        updates.stallCashiers = JSON.parse(updates.stallCashiers)
      } catch (error) {
        return res.status(400).json({
          message: 'Invalid JSON format for stallCashiers',
          error: error.message,
        })
      }
    }

    if (updates.menu) {
      try {
        updates.menu = JSON.parse(updates.menu)
      } catch (error) {
        return res.status(400).json({
          message: 'Invalid JSON format for menu',
          error: error.message,
        })
      }
    }

    if (req.files) {
      if (req.files['image']) {
        if (stall.imageUrl) {
          const oldKey = stall.imageUrl.split('/').pop()
          await deleteFromS3(`stalls/${oldKey}`)
        }
        const uploadResult = await uploadToS3(req.files['image'][0], 'stalls')
        updates.imageUrl = uploadResult.imageUrl
        updates.thumbnailUrl = uploadResult.thumbnailUrl
      }
      if (req.files['banner']) {
        if (stall.bannerUrl) {
          const oldKey = stall.bannerUrl.split('/').pop()
          await deleteFromS3(`stalls/banners/${oldKey}`)
        }
        const uploadResult = await uploadToS3(req.files['banner'][0], 'stalls/banners')
        updates.bannerUrl = uploadResult.imageUrl
      }
    }

    const updatedStall = await Stall.findByIdAndUpdate(stallId, { $set: updates }, { new: true })

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
      foodPrice: Number(foodPrice),
      isAvailable: isAvailable === 'true',
      currentStock: Number(currentStock),
      description,
      isAvailableForDelivery: isAvailableForDelivery === 'true',
      imageUrl,
      thumbnailUrl
    }
    
    stall.menu.push(menuItem)
    await stall.save()
    
    return res.status(201).json({
      message: 'Menu item added successfully',
      data: stall
    })
  } catch (error) {
    return res.status(400).json({
      message: 'Error adding menu item',
      error: error.message
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
      if (menuItem.imageUrl) {
        const oldKey = menuItem.imageUrl.split('/').pop()
        await deleteFromS3(`menu-items/${oldKey}`)
      }
      
      const uploadResult = await uploadToS3(req.file, 'menu-items')
      updates.imageUrl = uploadResult.imageUrl
      updates.thumbnailUrl = uploadResult.thumbnailUrl
    }
    
    // Convert string values to appropriate types
    if (updates.foodPrice) updates.foodPrice = Number(updates.foodPrice)
      if (updates.isAvailable !== undefined) updates.isAvailable = updates.isAvailable === 'true'
    if (updates.currentStock) updates.currentStock = Number(updates.currentStock)
      if (updates.isAvailableForDelivery !== undefined) updates.isAvailableForDelivery = updates.isAvailableForDelivery === 'true'
    
    Object.assign(menuItem, updates)
    await stall.save()
    
    return res.status(200).json({
      message: 'Menu item updated successfully',
      data: stall
    })
  } catch (error) {
    return res.status(400).json({
      message: 'Error updating menu item',
      error: error.message
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
    
    if (menuItem.imageUrl) {
      const imageKey = menuItem.imageUrl.split('/').pop()
      await deleteFromS3(`menu-items/${imageKey}`)
    }
    
    stall.menu = stall.menu.filter(item => item.id !== menuId)
    await stall.save()
    
    return res.status(200).json({
      message: 'Menu item removed successfully',
      data: stall
    })
  } catch (error) {
    return res.status(400).json({
      message: 'Error removing menu item',
      error: error.message
    })
  }
}

// async function getStall(req, res) {
//   const { stallId } = req.params
//   const today = new Date()
//   today.setHours(0, 0, 0, 0)
  
//   try {
//     const aggregation = await Stall.aggregate([
//       { $match: { _id: new mongoose.Types.ObjectId(stallId) } },
//       {
//         $lookup: {
//           from: 'orders',
//           let: { stallId: '$_id', today: today },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ['$stallId', '$$stallId'] },
//                     { $gte: ['$orderDate', '$$today'] }
//                   ],
//                 },
//               },
//             },
//             {
//               $group: {
//                 _id: null,
//                 todayTotalOrderValue: { $sum: '$totalAmount' },
//                 todayOrderCount: { $sum: 1 },
//               },
//             },
//           ],
//           as: 'todayOrdersInfo',
//         },
//       },
//       {
//         $lookup: {
//           from: 'orders',
//           localField: '_id',
//           foreignField: 'stallId',
//           as: 'lifetimeOrdersInfo',
//         },
//       },
//       {
//         $unwind: {
//           path: '$todayOrdersInfo',
//           preserveNullAndEmptyArrays: true
//         },
//       },
//       {
//         $addFields: {
//           todayTotalOrderValue: {
//             $ifNull: ['$todayOrdersInfo.todayTotalOrderValue', 0]
//           },
//           todayOrderCount: {
//             $ifNull: ['$todayOrdersInfo.todayOrderCount', 0]
//           },
//           lifetimeTotalOrderValue: {
//             $sum: '$lifetimeOrdersInfo.totalAmount'
//           },
//           lifetimeOrderCount: {
//             $size: '$lifetimeOrdersInfo'
//           },
//         },
//       },
//       {
//         $project: {
//           todayOrdersInfo: 0,
//           lifetimeOrdersInfo: 0,
//         },
//       },
//     ])
    
//     if (aggregation.length === 0) {
//       return res.status(404).json({ message: 'Stall not found' })
//     }

//     return res.status(200).json({
//       message: 'Stall retrieved successfully',
//       data: aggregation[0],
//     })
//   } catch (error) {
//     return res.status(400).json({
//       message: 'Error retrieving stall',
//       error: error.message
//     })
//   }
// }

// async function getAllStalls(req, res) {
//   try {
//     const today = new Date()
//     today.setHours(0, 0, 0, 0)

//     const stalls = await Stall.aggregate([
//       {
//         $sort: { motherStall: 1 },
//       },
//       {
//         $lookup: {
//           from: 'users',
//           localField: 'stallAdmin',
//           foreignField: '_id',
//           as: 'stallAdminDetails',
//         },
//       },
//       {
//         $unwind: {
//           path: '$stallAdminDetails',
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $lookup: {
//           from: 'orders',
//           let: { stallId: '$_id', today: today },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ['$stallId', '$$stallId'] },
//                     { $gte: ['$orderDate', '$$today'] }
//                   ],
//                 },
//               },
//             },
//             {
//               $group: {
//                 _id: null,
//                 todayTotalOrderValue: { $sum: '$totalAmount' },
//                 todayOrderCount: { $sum: 1 },
//               },
//             },
//           ],
//           as: 'todayOrders',
//         },
//       },
//       {
//         $lookup: {
//           from: 'orders',
//           let: { stallId: '$_id' },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $eq: ['$stallId', '$$stallId'],
//                 },
//               },
//             },
//             {
//               $group: {
//                 _id: null,
//                 lifetimeTotalOrderValue: { $sum: '$totalAmount' },
//                 lifetimeOrderCount: { $sum: 1 },
//               },
//             },
//           ],
//           as: 'lifetimeOrders',
//         },
//       },
//       {
//         $addFields: {
//           todayTotalOrderValue: {
//             $ifNull: [{ $arrayElemAt: ['$todayOrders.todayTotalOrderValue', 0] }, 0]
//           },
//           todayOrderCount: {
//             $ifNull: [{ $arrayElemAt: ['$todayOrders.todayOrderCount', 0] }, 0]
//           },
//           lifetimeTotalOrderValue: {
//             $ifNull: [{ $arrayElemAt: ['$lifetimeOrders.lifetimeTotalOrderValue', 0] }, 0]
//           },
//           lifetimeOrderCount: {
//             $ifNull: [{ $arrayElemAt: ['$lifetimeOrders.lifetimeOrderCount', 0] }, 0]
//           },
//         },
//       },
//       {
//         $project: {
//           motherStall: 1,
//           imageUrl: 1,
//           thumbnailUrl: 1,
//           minimumOrderAmount: 1,
//           'stallAdminDetails._id': 1,
//           'stallAdminDetails.name': 1,
//           'stallAdminDetails.phone': 1,
//           todayTotalOrderValue: 1,
//           todayOrderCount: 1,
//           lifetimeTotalOrderValue: 1,
//           lifetimeOrderCount: 1,
//         },
//       },
//     ])

//     return res.status(200).json({
//       message: 'Stalls retrieved successfully',
//       data: stalls
//     })
//   } catch (error) {
//     return res.status(400).json({
//       message: 'Error retrieving stalls',
//       error: error.message
//     })
//   }
// }

module.exports = {
  createStall,
  getStallMenu,
  getAllStalls,
  getAllStallsPublic,
  editStall,
  addMenuItem,
  updateMenuItem,
  removeMenuItem,
  getStall,
}