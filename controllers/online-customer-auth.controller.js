const Joi = require('joi')
const { createJWT } = require('../utils/jwt')
const { hashPassword, comparePassword } = require('../utils/password')
const Customer = require('../models/customer.model')
const axios = require('axios')

async function register(req, res) {
  const schema = Joi.object({
    name: Joi.string().required(),
    phone: Joi.string().length(11).required(),
    password: Joi.string().min(6).required(),
    email: Joi.string().email().allow(''),
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    const { name, phone, password, email } = req.body

    const existingUser = await Customer.findOne({ phone })
    if (existingUser) {
      return res.status(400).json({ message: 'Phone number already registered' })
    }

    const hashedPassword = await hashPassword(password)

    // Generate OTP for phone verification
    const otp = Math.floor(1000 + Math.random() * 9000)
    const otpExpires = new Date(Date.now() + 10 * 60000) // 10 minutes

    const customer = new Customer({
      name,
      phone,
      email,
      password: hashedPassword,
      customerType: 'online',
      otp,
      otpExpires,
    })

    console.log('Customer to be saved:', customer)

    await customer.save()

    // Send OTP via SMS
    const message = `Your registration OTP is ${otp}. Valid for 10 minutes.`
    const greenwebsms = new URLSearchParams()
    greenwebsms.append('token', process.env.BDBULKSMS_TOKEN)
    greenwebsms.append('to', phone)
    greenwebsms.append('message', message)
    await axios.post('https://api.greenweb.com.bd/api.php', greenwebsms)

    return res.status(201).json({
      message: 'Registration successful. Please verify your phone number with the OTP sent.',
      phone,
    })
  } catch (error) {
    return res.status(500).json({
      message: 'Registration failed',
      error: error.message,
    })
  }
}

async function verifyPhone(req, res) {
  const schema = Joi.object({
    phone: Joi.string().length(11).required(),
    otp: Joi.string().required(),
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    const { phone, otp } = req.body

    const customer = await Customer.findOne({
      phone,
      otp,
      otpExpires: { $gt: Date.now() },
    })

    if (!customer) {
      return res.status(400).json({ message: 'Invalid OTP or OTP expired' })
    }

    customer.isPhoneVerified = true
    customer.otp = null
    customer.otpExpires = null
    await customer.save()

    const token = await createJWT({
      customerId: customer._id,
      name: customer.name,
      phone: customer.phone,
      customerType: 'online',
    })

    return res.status(200).json({
      message: 'Phone verification successful',
      token,
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
      },
    })
  } catch (error) {
    return res.status(500).json({
      message: 'Phone verification failed',
      error: error.message,
    })
  }
}

async function login(req, res) {
  const schema = Joi.object({
    phone: Joi.string().length(11).required(),
    password: Joi.string().required(),
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    const { phone, password } = req.body

    const customer = await Customer.findOne({ phone, customerType: 'online' })
    if (!customer) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }


    const isPasswordCorrect = await comparePassword(password, customer.password)
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    if (!customer.isPhoneVerified) {
      return res.status(403).json({ message: 'Please verify your phone number first' })
    }

    const token = await createJWT({
      customerId: customer._id,
      name: customer.name,
      phone: customer.phone,
      customerType: customer.customerType
    })

    return res.status(200).json({
      token,
      message: 'Login successful',
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        customerType: customer.customerType
      },
    })
  } catch (error) {
    return res.status(500).json({
      message: 'Login failed',
      error: error.message,
    })
  }
}

async function requestPasswordReset(req, res) {
  const schema = Joi.object({
    phone: Joi.string().length(11).required(),
  })

  try {
    await schema.validateAsync(req.body)
    const { phone } = req.body

    const customer = await Customer.findOne({ phone, customerType: 'online' })
    if (!customer) {
      return res.status(404).json({ message: 'No account found with this phone number' })
    }

    const otp = Math.floor(1000 + Math.random() * 9000)
    const otpExpires = new Date(Date.now() + 10 * 60000)

    customer.otp = otp
    customer.otpExpires = otpExpires
    await customer.save()

    const message = `Your OTP for password reset is ${otp}. Valid for 10 minutes.`
    const greenwebsms = new URLSearchParams()
    greenwebsms.append('token', process.env.BDBULKSMS_TOKEN)
    greenwebsms.append('to', phone)
    greenwebsms.append('message', message)
    await axios.post('https://api.greenweb.com.bd/api.php', greenwebsms)

    return res.status(200).json({ message: 'Password reset OTP sent to your phone' })
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to send password reset OTP',
      error: error.message,
    })
  }
}

async function resetPassword(req, res) {
  const schema = Joi.object({
    phone: Joi.string().length(11).required(),
    otp: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
  })

  try {
    await schema.validateAsync(req.body)
    const { phone, otp, newPassword } = req.body

    const customer = await Customer.findOne({
      phone,
      customerType: 'online',
      otp,
      otpExpires: { $gt: Date.now() },
    })

    if (!customer) {
      return res.status(400).json({ message: 'Invalid OTP or OTP expired' })
    }

    const hashedPassword = await hashPassword(newPassword)
    customer.password = hashedPassword
    customer.otp = null
    customer.otpExpires = null
    await customer.save()

    return res.status(200).json({ message: 'Password reset successful' })
  } catch (error) {
    return res.status(500).json({
      message: 'Password reset failed',
      error: error.message,
    })
  }
}

module.exports = {
  register,
  verifyPhone,
  login,
  requestPasswordReset,
  resetPassword,
}
