const axios = require('axios')
const Joi = require('joi')
const User = require('../models/auth.model')
const Stall = require('../models/stall.model')
const { createJWT } = require('../utils/jwt')
const { hashPassword, comparePassword } = require('../utils/password')

async function register(req, res) {
  const schema = Joi.object({
    name: Joi.string().required(),
    phone: Joi.string().length(11).required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('masterAdmin', 'rechargerAdmin', 'recharger', 'stallAdmin', 'stallCashier').required(),
    motherStall: Joi.string().when('role', {
      is: Joi.string().valid('stallAdmin', 'stallCashier'),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    stallId: Joi.string().when('role', {
      is: Joi.string().valid('stallAdmin', 'stallCashier'),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    creatorsRole: Joi.string().required(),
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    const { name, phone, password, role, motherStall, stallId, creatorsRole } = req.body

    const userExists = await User.findOne({ phone })
    if (userExists) {
      return res.status(400).json({ message: 'User with this phone already exists' })
    }

    const allowedCreations = {
      masterAdmin: ['recharger', 'stallAdmin', 'rechargerAdmin'],
      rechargerAdmin: ['recharger'],
      stallAdmin: ['stallCashier'],
    }

    if (!allowedCreations[creatorsRole] || !allowedCreations[creatorsRole].includes(role)) {
      return res.status(400).json({ message: `Not authorized to create a user with role: ${role}` })
    }

    const hashedPassword = await hashPassword(password)

    const user = new User({
      name,
      phone,
      role,
      password: hashedPassword,
      motherStall: role === 'stallAdmin' || role === 'stallCashier' ? motherStall : undefined,
      stallId: role === 'stallAdmin' || role === 'stallCashier' ? stallId : undefined,
    })

    const savedUser = await user.save()

    if (role === 'stallAdmin') {
      await Stall.findByIdAndUpdate(stallId, { $set: { stallAdmin: savedUser._id } })
    } else if (role === 'stallCashier') {
      await Stall.findByIdAndUpdate(stallId, { $push: { stallCashiers: savedUser._id } })
    }

    const token = await createJWT({
      userId: savedUser._id,
      name: savedUser.name,
      phone: savedUser.phone,
      role: savedUser.role,
      stallId: savedUser.stallId,
      motherStall: savedUser.motherStall,
    })

    return res.status(201).json({
      token,
      data: {
        message: `New user registered with role: ${role}`,
        user: {
          id: savedUser._id,
          name: savedUser.name,
          role: savedUser.role,
          motherStall: savedUser.motherStall,
          stallId: savedUser.stallId,
        }
      }
    })
  } catch (error) {
    return res.status(500).json({
      message: 'Registration failed',
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

    const user = await User.findOne({ phone })
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const isPasswordCorrect = await comparePassword(password, user.password)
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const token = await createJWT({
      userId: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      stallId: user.stallId,
      motherStall: user.motherStall,
    })

    return res.status(200).json({
      message: `User ${user.name} logged in successfully`,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          motherStall: user.motherStall,
          stallId: user.stallId,
        }
      }
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

    const user = await User.findOne({ phone })
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const otp = Math.floor(1000 + Math.random() * 9000)
    const otpExpires = new Date(Date.now() + 10 * 60000)

    await User.findOneAndUpdate({ phone }, { otp, otpExpires })

    const greenwebsms = new URLSearchParams()
    greenwebsms.append('token', process.env.BDBULKSMS_TOKEN)
    greenwebsms.append('to', phone)
    greenwebsms.append('message', `Your OTP for password reset is ${otp}`)
    await axios.post('https://api.greenweb.com.bd/api.php', greenwebsms)

    return res.status(200).json({ message: 'OTP sent to your phone' })
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to send OTP',
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
    await schema.validateAsync(req.body, { abortEarly: false })
    const { phone, otp, newPassword } = req.body

    const user = await User.findOne({
      phone,
      otp,
      otpExpires: { $gt: Date.now() },
    })

    if (!user) {
      return res.status(400).json({ message: 'Invalid OTP or OTP expired' })
    }

    const hashedPassword = await hashPassword(newPassword)
    await User.findOneAndUpdate(
      { phone },
      {
        password: hashedPassword,
        otp: null,
        otpExpires: null,
      }
    )

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
  login,
  requestPasswordReset,
  resetPassword,
}
