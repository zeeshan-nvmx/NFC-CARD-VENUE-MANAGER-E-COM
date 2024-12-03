// controllers/customer.controller.js
const Customer = require('../models/customer.model')
const User = require('../models/auth.model')
const axios = require('axios')
const Joi = require('joi')

async function createCustomer(req, res) {
  const schema = Joi.object({
    name: Joi.string().required(),
    phone: Joi.string().length(11).required(),
    cardUid: Joi.string().required(),
    createdBy: Joi.string().required(),
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    const { name, phone, cardUid, createdBy } = req.body

    // Verify creator's role
    const creator = await User.findById(createdBy)
    if (!creator || (creator.role !== 'recharger' && creator.role !== 'rechargerAdmin')) {
      return res.status(403).json({ message: 'Unauthorized to create customers' })
    }

    // Check if card is already assigned
    const existingCardCustomer = await Customer.findOne({ cardUid })
    if (existingCardCustomer) {
      return res.status(400).json({ message: 'This card is already assigned to a customer' })
    }

    // Check if phone is already registered
    const existingCustomer = await Customer.findOne({ phone })
    if (existingCustomer) {
      return res.status(400).json({ message: 'Phone number already registered' })
    }

    const newCustomer = await Customer.create({
      name,
      phone,
      cardUid,
      createdBy,
      customerType: 'nfc',
    })

    // Send welcome SMS
    const message = `Hello, ${newCustomer.name}. Your customer account has been successfully created and you have a current balance of ${newCustomer.moneyLeft} taka`
    const greenwebsms = new URLSearchParams()
    greenwebsms.append('token', process.env.BDBULKSMS_TOKEN)
    greenwebsms.append('to', newCustomer.phone)
    greenwebsms.append('message', message)
    await axios.post('https://api.greenweb.com.bd/api.php', greenwebsms)

    return res.status(201).json({
      message: 'Customer created successfully',
      data: newCustomer,
    })
  } catch (error) {
    return res.status(400).json({
      message: 'Customer creation failed',
      error: error.message,
    })
  }
}

async function getAllCustomersWithDetails(req, res) {
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 10
  const skip = (page - 1) * limit
  const customerType = req.query.customerType // 'nfc' or 'online'

  try {
    const query = customerType ? { customerType } : {}

    const customers = await Customer.find(query, 'name phone moneyLeft customerType createdBy')
      .populate({ path: 'createdBy', select: 'name' })
      .skip(skip)
      .limit(limit)
      .sort('-createdAt')

    const total = await Customer.countDocuments(query)

    return res.status(200).json({
      message: 'Customers fetched successfully',
      data: customers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    })
  } catch (error) {
    return res.status(400).json({
      message: 'Failed to fetch customers',
      error: error.message,
    })
  }
}

async function getCustomerByPhoneNumber(req, res) {
  const { phone } = req.params

  try {
    const customer = await Customer.findOne({ phone }).populate({ path: 'createdBy', select: 'name' })

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' })
    }

    return res.status(200).json({
      message: 'Customer retrieved successfully',
      data: customer,
    })
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to retrieve customer',
      error: error.message,
    })
  }
}

async function rechargeCard(req, res) {
  const schema = Joi.object({
    cardUid: Joi.string().required(),
    amount: Joi.number().min(0).required(),
    rechargerId: Joi.string().required(),
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    const { cardUid, amount, rechargerId } = req.body

    const customer = await Customer.findOne({ cardUid, customerType: 'nfc' })
    if (!customer) {
      return res.status(404).json({ message: 'Card not found or not assigned to any customer' })
    }

    const recharger = await User.findById(rechargerId)
    if (!recharger) {
      return res.status(404).json({ message: 'Recharger not found' })
    }

    const prevMoneyLeft = customer.moneyLeft
    const updatedMoneyLeft = prevMoneyLeft + Number(amount)

    const rechargeHistory = {
      rechargerName: recharger.name,
      rechargerId,
      amount: Number(amount),
      balanceBeforeRecharge: prevMoneyLeft,
      date: new Date(),
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      customer._id,
      {
        $set: { moneyLeft: updatedMoneyLeft },
        $push: { rechargeHistory },
      },
      { new: true }
    )

    // Send SMS notification
    const message = `Your card recharge was successful. Previous balance: ${prevMoneyLeft} taka. New balance: ${updatedCustomer.moneyLeft} taka`
    const greenwebsms = new URLSearchParams()
    greenwebsms.append('token', process.env.BDBULKSMS_TOKEN)
    greenwebsms.append('to', updatedCustomer.phone)
    greenwebsms.append('message', message)
    await axios.post('https://api.greenweb.com.bd/api.php', greenwebsms)

    return res.status(200).json({
      message: 'Card recharged successfully',
      data: updatedCustomer,
    })
  } catch (error) {
    return res.status(500).json({
      message: 'Recharge failed',
      error: error.message,
    })
  }
}

async function deleteCustomer(req, res) {
  try {
    const { customerId } = req.params
    const customer = await Customer.findById(customerId)

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' })
    }

    await Customer.findByIdAndDelete(customerId)
    return res.status(200).json({ message: 'Customer deleted successfully' })
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete customer',
      error: error.message,
    })
  }
}

async function removeCardUid(req, res) {
  try {
    const { cardUid } = req.body
    const updatedCustomer = await Customer.findOneAndUpdate(
      { cardUid, customerType: 'nfc' },
      {
        $unset: { cardUid: '' },
        $set: { moneyLeft: 0 },
      },
      { new: true }
    )

    if (!updatedCustomer) {
      return res.status(404).json({ message: 'Card not found or not assigned to any customer' })
    }

    return res.status(200).json({
      message: 'Card removed successfully',
      data: updatedCustomer,
    })
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to remove card',
      error: error.message,
    })
  }
}

async function getCustomerByCardUidOrPhone(req, res) {
  const { identifier } = req.params

  try {
    const customer = await Customer.findOne({
      $or: [{ cardUid: identifier }, { phone: identifier }],
    })

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' })
    }

    return res.status(200).json({
      message: 'Customer found successfully',
      data: customer,
    })
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to find customer',
      error: error.message,
    })
  }
}

async function addCardToCustomerByPhone(req, res) {
  const { phone, newCardUid } = req.body

  try {
    // Check if card is already assigned
    const existingCardCustomer = await Customer.findOne({ cardUid: newCardUid })
    if (existingCardCustomer) {
      return res.status(400).json({ message: 'This card is already assigned to a customer' })
    }

    const customer = await Customer.findOneAndUpdate({ phone, customerType: 'nfc' }, { cardUid: newCardUid }, { new: true })

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' })
    }

    return res.status(200).json({
      message: 'Card added successfully',
      data: customer,
    })
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to add card',
      error: error.message,
    })
  }
}

async function updateCustomerProfile(req, res) {
  const schema = Joi.object({
    name: Joi.string(),
    email: Joi.string().email().allow(''),
    addresses: Joi.array().items(
      Joi.object({
        label: Joi.string().required(),
        street: Joi.string().required(),
        area: Joi.string().required(),
        city: Joi.string().required(),
        postalCode: Joi.string(),
        isDefault: Joi.boolean().default(false),
      })
    ),
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })

    const customer = await Customer.findById(req.user.customerId)
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' })
    }

    if (req.body.addresses) {
      // Ensure only one default address
      const addresses = req.body.addresses
      const defaultAddress = addresses.filter((addr) => addr.isDefault)
      if (defaultAddress.length > 1) {
        return res.status(400).json({ message: 'Only one address can be set as default' })
      }
      if (defaultAddress.length === 0 && addresses.length > 0) {
        addresses[0].isDefault = true
      }
      customer.addresses = addresses
    }

    if (req.body.name) customer.name = req.body.name
    if (req.body.email) customer.email = req.body.email

    await customer.save()

    return res.status(200).json({
      message: 'Profile updated successfully',
      data: customer,
    })
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update profile',
      error: error.message,
    })
  }
}

module.exports = {
  createCustomer,
  getAllCustomersWithDetails,
  getCustomerByPhoneNumber,
  rechargeCard,
  deleteCustomer,
  removeCardUid,
  getCustomerByCardUidOrPhone,
  addCardToCustomerByPhone,
  updateCustomerProfile,
}
