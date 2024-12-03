// const mongoose = require('mongoose')

// const stallSchema = new mongoose.Schema(
//   {
//     motherStall: {
//       type: String,
//       required: true,
//     },
//     stallAdmin: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//     },
//     stallCashiers: {
//       type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
//       default: [],
//     },
//     menu: [
//       {
//         foodName: {
//           type: String,
//           required: true,
//         },
//         foodPrice: {
//           type: Number,
//           required: true,
//         },
//         isAvailable: {
//           type: Boolean,
//           default: true,
//         },
//         currentStock: {
//           type: Number,
//           default: 0,
//         },
//         description: String,
//         imageUrl: String,
//         thumbnailUrl: String,
//         isAvailableForDelivery: {
//           type: Boolean,
//           default: true,
//         },
//       },
//     ],
//     minimumOrderAmount: {
//       type: Number,
//       default: 0,
//     },
//     imageUrl: String,
//     thumbnailUrl: String,
//   },
//   { timestamps: true }
// )

// module.exports = mongoose.model('Stall', stallSchema)

const mongoose = require('mongoose')

const stallSchema = new mongoose.Schema(
  {
    motherStall: {
      type: String,
      required: true,
    },
    stallAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    stallCashiers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    menu: [
      {
        foodName: {
          type: String,
          required: true,
        },
        foodPrice: {
          type: Number,
          required: true,
        },
        isAvailable: {
          type: Boolean,
          default: true,
        },
        currentStock: {
          type: Number,
          default: 0,
        },
        description: String,
        imageUrl: String,
        thumbnailUrl: String,
        isAvailableForDelivery: {
          type: Boolean,
          default: true,
        },
      },
    ],
    minimumOrderAmount: {
      type: Number,
      default: 0,
    },
    imageUrl: String,
    thumbnailUrl: String,
    bannerUrl: String,
    address: {
      street: String,
      area: String,
      city: String,
      postalCode: String,
    },
    deliveryTime: {
      min: Number,
      max: Number,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Stall', stallSchema)