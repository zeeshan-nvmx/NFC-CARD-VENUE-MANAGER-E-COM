// const mongoose = require('mongoose')

// const orderItemSchema = new mongoose.Schema(
//   {
//     foodName: { type: String, required: true },
//     foodPrice: { type: Number, required: true },
//     quantity: { type: Number, required: true, min: 1 },
//   },
//   { _id: false }
// )

// const sslCommerzPaymentSchema = new mongoose.Schema({
//   transactionId: { type: String, unique: true },
//   status: {
//     type: String,
//     enum: ['PENDING', 'VALIDATED', 'FAILED', 'CANCELLED'],
//     default: 'PENDING',
//   },
//   amount: Number,
//   cardType: String,
//   bankTransactionId: String,
//   cardIssuer: String,
//   cardBrand: String,
//   cardSubBrand: String,
//   cardIssuerCountry: String,
//   currency: String,
//   apiConnect: String,
//   validatedOn: Date,
// })

// const deliveryAddressSchema = new mongoose.Schema({
//   street: { type: String, required: true },
//   area: { type: String, required: true },
//   city: { type: String, required: true },
//   postalCode: String,
//   deliveryInstructions: String,
// })

// const orderSchema = new mongoose.Schema(
//   {
//     customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
//     stallId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stall', required: true },
//     orderItems: [orderItemSchema],
//     totalAmount: { type: Number, required: true },
//     vat: { type: Number, default: 0 },
//     orderServedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//     orderType: {
//       type: String,
//       enum: ['nfc', 'online'],
//       required: true,
//     },
//     orderStatus: {
//       type: String,
//       enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
//       default: 'PENDING',
//     },
//     paymentMethod: {
//       type: String,
//       enum: ['NFC', 'COD', 'SSLCOMMERZ'],
//       required: true,
//     },
//     paymentStatus: {
//       type: String,
//       enum: ['PENDING', 'PAID', 'FAILED'],
//       default: 'PENDING',
//     },
//     sslCommerzPayment: sslCommerzPaymentSchema,
//     deliveryAddress: deliveryAddressSchema,
//     deliveryFee: { type: Number, default: 0 },
//     estimatedDeliveryTime: Date,
//     actualDeliveryTime: Date,
//     cancelReason: String,
//     orderDate: { type: Date, default: Date.now },
//   },
//   { timestamps: true }
// )

// module.exports = mongoose.model('Order', orderSchema)


// order.model.js
const mongoose = require('mongoose')

const orderItemSchema = new mongoose.Schema(
  {
    foodName: { type: String, required: true },
    foodPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
)

const sslCommerzPaymentSchema = new mongoose.Schema({
  transactionId: { 
    type: String,
    unique: true,
    sparse: true  // Add this line to allow multiple null values
  },
  status: {
    type: String,
    enum: ['PENDING', 'VALIDATED', 'FAILED', 'CANCELLED'],
    default: 'PENDING'
  },
  amount: Number,
  cardType: String,
  bankTransactionId: String,
  cardIssuer: String,
  cardBrand: String,
  cardSubBrand: String,
  cardIssuerCountry: String,
  currency: String,
  apiConnect: String,
  validatedOn: Date,
})

const deliveryAddressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  area: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: String,
  deliveryInstructions: String,
})

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    stallId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stall', required: true },
    orderItems: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    vat: { type: Number, default: 0},
    orderServedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderType: {
      type: String,
      enum: ['nfc', 'online'],
      required: true,
    },
    orderStatus: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
      default: 'PENDING',
    },
    paymentMethod: {
      type: String,
      enum: ['NFC', 'COD', 'SSLCOMMERZ'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED'],
      default: 'PENDING',
    },
    sslCommerzPayment: sslCommerzPaymentSchema,
    deliveryAddress: deliveryAddressSchema,
    deliveryFee: { type: Number, default: 0 },
    estimatedDeliveryTime: Date,
    actualDeliveryTime: Date,
    cancelReason: String,
    orderDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

// Add sparse index on sslCommerzPayment.transactionId
orderSchema.index({ 'sslCommerzPayment.transactionId': 1 }, { sparse: true })

module.exports = mongoose.model('Order', orderSchema)