const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'please provide a name'],
  },
  phone: {
    type: String,
    required: [true, 'please provide a phone number'],
    unique: [true, 'phone number needs to be unique'],
    minlength: 11,
  },
  email: {
    type: String,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
    sparse: true,
  },
  password: {
    type: String,
    required: [true, 'please provide a password'],
    minlength: 6,
  },
  motherStall: {
    type: String,
  },
  stallId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stall',
  },
  role: {
    type: String,
    enum: ['masterAdmin', 'rechargerAdmin', 'recharger', 'stallAdmin', 'stallCashier', 'onlineCustomer'],
    default: 'user',
  },
  otp: {
    type: Number,
    default: null,
  },
  otpExpires: {
    type: Date,
    default: null,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
})

module.exports = mongoose.model('User', UserSchema)