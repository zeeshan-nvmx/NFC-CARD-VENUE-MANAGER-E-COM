const mongoose = require('mongoose')

const addressSchema = new mongoose.Schema({
  label: { type: String, required: true },
  street: { type: String, required: true },
  area: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: String,
  isDefault: { type: Boolean, default: false },
})

const rechargeHistorySchema = new mongoose.Schema(
  {
    rechargerName: String,
    rechargerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    balanceBeforeRecharge: Number,
    date: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

const orderHistorySchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    totalAmount: Number,
    orderServedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: {
      type: String,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
      sparse: true,
      unique: true,
    },
    password: {
      type: String,
      minlength: 6,
    },
    cardUid: { type: String, required: false },
    moneyLeft: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    customerType: {
      type: String,
      enum: ['nfc', 'online'],
      required: true,
    },
    otp: {
      type: Number,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    addresses: [addressSchema],
    rechargeHistory: [rechargeHistorySchema],
    orderHistory: [orderHistorySchema],
  },
  { timestamps: true }
)

customerSchema.index({ cardUid: 1 }, { unique: true, sparse: true })

module.exports = mongoose.model('Customer', customerSchema)