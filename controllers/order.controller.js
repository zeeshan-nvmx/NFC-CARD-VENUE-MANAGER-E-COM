// controllers/order.controller.js
const Order = require('../models/order.model')
const Customer = require('../models/customer.model')
const User = require('../models/auth.model')
const Stall = require('../models/stall.model')
const mongoose = require('mongoose')
const axios = require('axios')
const Joi = require('joi')
const { initiatePayment, validatePayment } = require('../utils/sslcommerz')

// async function createOrder(req, res) {
//   const orderItemSchema = Joi.object({
//     foodName: Joi.string().required(),
//     quantity: Joi.number().integer().min(1).required(),
//     foodPrice: Joi.number().min(0).required(),
//   })

//   const orderSchema = Joi.object({
//     customer: Joi.string().required(),
//     stallId: Joi.string().required(),
//     orderItems: Joi.array().items(orderItemSchema).required(),
//     totalAmount: Joi.number().required(),
//     vat: Joi.number().required(),
//     orderType: Joi.string().valid('nfc', 'online').required(),
//     orderServedBy: Joi.string().when('orderType', {
//         is: 'nfc',
//         then: Joi.required(),
//         otherwise: Joi.forbidden()
//     }),
//     paymentMethod: Joi.string().valid('NFC', 'COD', 'SSLCOMMERZ').required(),
//     deliveryAddress: Joi.when('orderType', {
//       is: 'online',
//       then: Joi.object({
//         street: Joi.string().required(),
//         area: Joi.string().required(),
//         city: Joi.string().required(),
//         postalCode: Joi.string(),
//         deliveryInstructions: Joi.string(),
//       }).required(),
//       otherwise: Joi.forbidden(),
//     }),
//     deliveryFee: Joi.when('orderType', {
//       is: 'online',
//       then: Joi.number().min(0).required(),
//       otherwise: Joi.forbidden(),
//     }),
//   })

//   try {
//     await orderSchema.validateAsync(req.body, { abortEarly: false })
//     const { customer, stallId, orderItems, totalAmount, vat, orderServedBy, orderType, paymentMethod, deliveryAddress, deliveryFee = 0 } = req.body

//     const customerDetails = await Customer.findById(customer)
//     if (!customerDetails) {
//       return res.status(404).json({ message: 'Customer not found' })
//     }

//     const stallDetails = await Stall.findById(stallId)
//     if (!stallDetails) {
//       return res.status(404).json({ message: 'Stall not found' })
//     }

//     // Validate minimum order amount for online orders
//     if (orderType === 'online' && totalAmount < stallDetails.minimumOrderAmount) {
//       return res.status(400).json({
//         message: `Minimum order amount is ${stallDetails.minimumOrderAmount}`,
//       })
//     }

//     // Check stock availability
//     let insufficientStockItem = ''
//     for (const orderItem of orderItems) {
//       const menuItem = stallDetails.menu.find((item) => item.foodName === orderItem.foodName)
//       if (!menuItem || menuItem.currentStock < orderItem.quantity) {
//         insufficientStockItem = orderItem.foodName
//         break
//       }
//     }

//     if (insufficientStockItem) {
//       return res.status(400).json({
//         message: `Insufficient stock of ${insufficientStockItem}`,
//       })
//     }

//     const finalAmount = totalAmount + (orderType === 'online' ? deliveryFee : 0)

//     // Handle NFC payment
//     if (paymentMethod === 'NFC') {
//       if (customerDetails.moneyLeft < finalAmount) {
//         return res.status(400).json({
//           message: 'Insufficient funds in NFC card',
//         })
//       }

//       customerDetails.moneyLeft -= finalAmount
//       await customerDetails.save()
//     }

//     // Deduct stock
//     for (const orderItem of orderItems) {
//       const menuItem = stallDetails.menu.find((item) => item.foodName === orderItem.foodName)
//       menuItem.currentStock -= orderItem.quantity
//     }
//     await stallDetails.save()

//     const orderData = {
//       customer,
//       stallId,
//       orderItems,
//       totalAmount: finalAmount,
//       vat,
//       orderServedBy,
//       orderType,
//       paymentMethod,
//       orderStatus: paymentMethod === 'COD' ? 'PENDING' : 'CONFIRMED',
//       paymentStatus: paymentMethod === 'NFC' ? 'PAID' : 'PENDING',
//     }

//     if (orderType === 'online') {
//       orderData.deliveryAddress = deliveryAddress
//       orderData.deliveryFee = deliveryFee
//     }

//     const newOrder = await Order.create(orderData)

//     // If payment method is SSL Commerz, initiate payment
//     if (paymentMethod === 'SSLCOMMERZ') {
//       const successUrl = `${process.env.BASE_URL}/api/orders/payment/success`
//       const failUrl = `${process.env.BASE_URL}/api/orders/payment/fail`
//       const cancelUrl = `${process.env.BASE_URL}/api/orders/payment/cancel`

//       const paymentInit = await initiatePayment(newOrder, customerDetails, successUrl, failUrl, cancelUrl)

//       if (!paymentInit.success) {
//         return res.status(400).json({
//           message: 'Payment initiation failed',
//           error: paymentInit.error,
//         })
//       }

//       return res.status(201).json({
//         message: 'Order created and payment initiated',
//         paymentUrl: paymentInit.redirectGatewayURL,
//         order: newOrder,
//       })
//     }

//     // Send SMS notification
//     const itemsDescription = orderItems.map((item) => `${item.quantity} x ${item.foodName}`).join(', ')

//     const message =
//       orderType === 'nfc'
//         ? `Order confirmed. Amount: ${finalAmount}, Items: ${itemsDescription}, Balance: ${customerDetails.moneyLeft}`
//         : `Order confirmed. Amount: ${finalAmount}, Items: ${itemsDescription}. Payment: ${paymentMethod}`

//     const greenwebsms = new URLSearchParams()
//     greenwebsms.append('token', process.env.BDBULKSMS_TOKEN)
//     greenwebsms.append('to', customerDetails.phone)
//     greenwebsms.append('message', message)
//     await axios.post('https://api.greenweb.com.bd/api.php', greenwebsms)

//     return res.status(201).json({
//       message: 'Order created successfully',
//       order: newOrder,
//     })
//   } catch (error) {
//     console.error(error)
//     return res.status(400).json({
//       message: 'Order creation failed',
//       error: error.message,
//     })
//   }
// }

async function createOrder(req, res) {
  const orderItemSchema = Joi.object({
    foodName: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
    foodPrice: Joi.number().min(0).required(),
  })

  const orderSchema = Joi.object({
    customer: Joi.string().required(),
    stallId: Joi.string().required(),
    orderItems: Joi.array().items(orderItemSchema).required(),
    totalAmount: Joi.number().required(),
    vat: Joi.number().required(),
    orderType: Joi.string().valid('nfc', 'online').required(),
    orderServedBy: Joi.string().when('orderType', {
      is: 'nfc',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    paymentMethod: Joi.string().valid('NFC', 'COD', 'SSLCOMMERZ').required(),
    deliveryAddress: Joi.when('orderType', {
      is: 'online',
      then: Joi.object({
        street: Joi.string().required(),
        area: Joi.string().required(),
        city: Joi.string().required(),
        postalCode: Joi.string(),
        deliveryInstructions: Joi.string(),
      }).required(),
      otherwise: Joi.forbidden(),
    }),
    deliveryFee: Joi.when('orderType', {
      is: 'online',
      then: Joi.number().min(0).required(),
      otherwise: Joi.forbidden(),
    }),
  })

  try {
    await orderSchema.validateAsync(req.body, { abortEarly: false })
    const { customer, stallId, orderItems, totalAmount, vat, orderServedBy, orderType, paymentMethod, deliveryAddress, deliveryFee = 0 } = req.body

    const customerDetails = await Customer.findById(customer)
    if (!customerDetails) {
      return res.status(404).json({ message: 'Customer not found' })
    }

    const stallDetails = await Stall.findById(stallId)
    if (!stallDetails) {
      return res.status(404).json({ message: 'Stall not found' })
    }

    // Validate minimum order amount for online orders
    if (orderType === 'online' && totalAmount < stallDetails.minimumOrderAmount) {
      return res.status(400).json({
        message: `Minimum order amount is ${stallDetails.minimumOrderAmount}`,
      })
    }

    // Check stock availability
    let insufficientStockItem = ''
    for (const orderItem of orderItems) {
      const menuItem = stallDetails.menu.find((item) => item.foodName === orderItem.foodName)
      if (!menuItem || menuItem.currentStock < orderItem.quantity) {
        insufficientStockItem = orderItem.foodName
        break
      }
    }

    if (insufficientStockItem) {
      return res.status(400).json({
        message: `Insufficient stock of ${insufficientStockItem}`,
      })
    }

    const finalAmount = totalAmount + (orderType === 'online' ? deliveryFee : 0)

    // Handle NFC payment
    if (paymentMethod === 'NFC') {
      if (customerDetails.moneyLeft < finalAmount) {
        return res.status(400).json({
          message: 'Insufficient funds in NFC card',
        })
      }

      customerDetails.moneyLeft -= finalAmount
      await customerDetails.save()
    }

    // Deduct stock
    for (const orderItem of orderItems) {
      const menuItem = stallDetails.menu.find((item) => item.foodName === orderItem.foodName)
      menuItem.currentStock -= orderItem.quantity
    }
    await stallDetails.save()

    const orderData = {
      customer,
      stallId,
      orderItems,
      totalAmount: finalAmount,
      vat,
      orderServedBy,
      orderType,
      paymentMethod,
      orderStatus: paymentMethod === 'COD' ? 'PENDING' : 'CONFIRMED',
      paymentStatus: paymentMethod === 'NFC' ? 'PAID' : 'PENDING',
    }

    if (orderType === 'online') {
      orderData.deliveryAddress = deliveryAddress
      orderData.deliveryFee = deliveryFee
    }

    // Only add sslCommerzPayment if the payment method is SSLCOMMERZ
    if (paymentMethod === 'SSLCOMMERZ') {
      orderData.sslCommerzPayment = {
        status: 'PENDING',
      }
    }

    const newOrder = await Order.create(orderData)

    // Add order to customer's order history
    await Customer.findByIdAndUpdate(customer, {
      $push: {
        orderHistory: {
          orderId: newOrder._id,
          totalAmount: finalAmount,
          orderServedBy,
        },
      },
    })

    // If payment method is SSL Commerz, initiate payment
    if (paymentMethod === 'SSLCOMMERZ') {
      const successUrl = `${process.env.BASE_URL}/api/orders/payment/success`
      const failUrl = `${process.env.BASE_URL}/api/orders/payment/fail`
      const cancelUrl = `${process.env.BASE_URL}/api/orders/payment/cancel`

      const paymentInit = await initiatePayment(newOrder, customerDetails, successUrl, failUrl, cancelUrl)

      if (!paymentInit.success) {
        return res.status(400).json({
          message: 'Payment initiation failed',
          error: paymentInit.error,
        })
      }

      return res.status(201).json({
        message: 'Order created and payment initiated',
        paymentUrl: paymentInit.redirectGatewayURL,
        order: newOrder,
      })
    }

    // Send SMS notification
    const itemsDescription = orderItems.map((item) => `${item.quantity} x ${item.foodName}`).join(', ')

    const message =
      orderType === 'nfc'
        ? `Order confirmed. Amount: ${finalAmount}, Items: ${itemsDescription}, Balance: ${customerDetails.moneyLeft}`
        : `Order confirmed. Amount: ${finalAmount}, Items: ${itemsDescription}. Payment: ${paymentMethod}`

    const greenwebsms = new URLSearchParams()
    greenwebsms.append('token', process.env.BDBULKSMS_TOKEN)
    greenwebsms.append('to', customerDetails.phone)
    greenwebsms.append('message', message)
    await axios.post('https://api.greenweb.com.bd/api.php', greenwebsms)

    return res.status(201).json({
      message: 'Order created successfully',
      order: newOrder,
    })
  } catch (error) {
    console.error(error)
    return res.status(400).json({
      message: 'Order creation failed',
      error: error.message,
    })
  }
}

async function getOrdersByStall(req, res) {
  const { stallId } = req.params
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const skip = (page - 1) * limit
  const { startDate, endDate } = req.query

  let queryCondition = { stallId }
  if (startDate && endDate) {
    queryCondition.orderDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    }
  } else if (startDate) {
    queryCondition.orderDate = {
      $gte: new Date(startDate),
    }
  } else if (endDate) {
    queryCondition.orderDate = {
      $lte: new Date(endDate),
    }
  }

  try {
    const orders = await Order.find(queryCondition)
      .populate({
        path: 'customer',
        select: 'name phone',
      })
      .skip(skip)
      .limit(limit)
      .sort('-orderDate')
      .exec()

    const total = await Order.countDocuments(queryCondition)

    return res.status(200).json({
      message: 'Orders fetched successfully',
      data: {
        orders,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return res.status(400).json({
      message: 'Failed to fetch orders',
      error: error.message,
    })
  }
}

async function getOrder(req, res) {
  const { orderId } = req.params

  try {
    const order = await Order.findById(orderId).populate('orderServedBy', 'name').populate('customer', 'name phone')

    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    return res.status(200).json({
      message: 'Order fetched successfully',
      data: order,
    })
  } catch (error) {
    return res.status(400).json({
      message: 'Failed to fetch order',
      error: error.message,
    })
  }
}

async function updateOrderStatus(req, res) {
  const { orderId } = req.params
  const { orderStatus } = req.body

  const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']

  if (!validStatuses.includes(orderStatus)) {
    return res.status(400).json({ message: 'Invalid order status' })
  }

  try {
    const order = await Order.findById(orderId).populate('customer', 'phone')

    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    order.orderStatus = orderStatus
    if (orderStatus === 'DELIVERED' && order.paymentMethod === 'COD') {
      order.paymentStatus = 'PAID'
    }

    await order.save()

    // Send SMS notification for status update
    const message = `Your order #${order._id} status has been updated to ${orderStatus}`
    const greenwebsms = new URLSearchParams()
    greenwebsms.append('token', process.env.BDBULKSMS_TOKEN)
    greenwebsms.append('to', order.customer.phone)
    greenwebsms.append('message', message)
    await axios.post('https://api.greenweb.com.bd/api.php', greenwebsms)

    return res.status(200).json({
      message: 'Order status updated successfully',
      data: order,
    })
  } catch (error) {
    return res.status(400).json({
      message: 'Failed to update order status',
      error: error.message,
    })
  }
}

async function handlePaymentSuccess(req, res) {
  try {
    const paymentValidation = await validatePayment(req.body)
    if (!paymentValidation.success) {
      return res.status(400).json({
        message: 'Payment validation failed',
        error: paymentValidation.error,
      })
    }

    const order = await Order.findOne({
      'sslCommerzPayment.transactionId': req.body.tran_id,
    })

    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    order.paymentStatus = 'PAID'
    order.orderStatus = 'CONFIRMED'
    order.sslCommerzPayment = {
      status: 'VALIDATED',
      validatedOn: new Date(),
      ...req.body,
    }

    await order.save()

    // Redirect to frontend success page
    res.redirect(`${process.env.FRONTEND_URL}/payment/success`)
  } catch (error) {
    console.error('Payment success handler error:', error)
    res.redirect(`${process.env.FRONTEND_URL}/payment/error`)
  }
}

async function handlePaymentFailure(req, res) {
  try {
    const order = await Order.findOne({
      'sslCommerzPayment.transactionId': req.body.tran_id,
    })

    if (order) {
      order.paymentStatus = 'FAILED'
      order.sslCommerzPayment = {
        status: 'FAILED',
        ...req.body,
      }
      await order.save()
    }

    res.redirect(`${process.env.FRONTEND_URL}/payment/failed`)
  } catch (error) {
    console.error('Payment failure handler error:', error)
    res.redirect(`${process.env.FRONTEND_URL}/payment/error`)
  }
}

async function handlePaymentCancel(req, res) {
  try {
    const order = await Order.findOne({
      'sslCommerzPayment.transactionId': req.body.tran_id,
    })

    if (order) {
      order.paymentStatus = 'FAILED'
      order.sslCommerzPayment = {
        status: 'CANCELLED',
        ...req.body,
      }
      await order.save()
    }

    res.redirect(`${process.env.FRONTEND_URL}/payment/cancelled`)
  } catch (error) {
    console.error('Payment cancel handler error:', error)
    res.redirect(`${process.env.FRONTEND_URL}/payment/error`)
  }
}

module.exports = {
  createOrder,
  getOrdersByStall,
  getOrder,
  updateOrderStatus,
  handlePaymentSuccess,
  handlePaymentFailure,
  handlePaymentCancel,
}
