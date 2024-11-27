// controllers/online-customer-profile.controller.js
const Joi = require('joi')
const Customer = require('../models/customer.model')

async function getProfile(req, res) {
  try {
    const customer = await Customer.findById(req.user.customerId).select('-password -otp -otpExpires')
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' })
    }
    return res.status(200).json({
      message: 'Profile retrieved successfully',
      data: customer,
    })
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to retrieve profile',
      error: error.message,
    })
  }
}

async function updateProfile(req, res) {
  const schema = Joi.object({
    name: Joi.string(),
    email: Joi.string().email().allow(''),
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    const customer = await Customer.findByIdAndUpdate(req.user.customerId, { $set: req.body }, { new: true }).select('-password -otp -otpExpires')

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

async function addAddress(req, res) {
  const schema = Joi.object({
    label: Joi.string().required(),
    street: Joi.string().required(),
    area: Joi.string().required(),
    city: Joi.string().required(),
    postalCode: Joi.string(),
    isDefault: Joi.boolean().default(false),
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    const customer = await Customer.findById(req.user.customerId)

    if (req.body.isDefault) {
      customer.addresses.forEach((addr) => (addr.isDefault = false))
    } else if (customer.addresses.length === 0) {
      req.body.isDefault = true
    }

    customer.addresses.push(req.body)
    await customer.save()

    return res.status(201).json({
      message: 'Address added successfully',
      data: customer.addresses,
    })
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to add address',
      error: error.message,
    })
  }
}

async function updateAddress(req, res) {
  const schema = Joi.object({
    addressId: Joi.string().required(),
    label: Joi.string(),
    street: Joi.string(),
    area: Joi.string(),
    city: Joi.string(),
    postalCode: Joi.string(),
    isDefault: Joi.boolean(),
  })

  try {
    await schema.validateAsync(req.body, { abortEarly: false })
    const customer = await Customer.findById(req.user.customerId)

    const address = customer.addresses.id(req.body.addressId)
    if (!address) {
      return res.status(404).json({ message: 'Address not found' })
    }

    if (req.body.isDefault) {
      customer.addresses.forEach((addr) => (addr.isDefault = false))
    }

    Object.assign(address, req.body)
    await customer.save()

    return res.status(200).json({
      message: 'Address updated successfully',
      data: customer.addresses,
    })
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update address',
      error: error.message,
    })
  }
}

async function deleteAddress(req, res) {
  const { addressId } = req.params

  try {
    const customer = await Customer.findById(req.user.customerId)
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' })
    }

    const addressIndex = customer.addresses.findIndex((addr) => addr._id.toString() === addressId)

    if (addressIndex === -1) {
      return res.status(404).json({ message: 'Address not found' })
    }

    const address = customer.addresses[addressIndex]

    // Handle default address reassignment
    if (address.isDefault && customer.addresses.length > 1) {
      const newDefault = customer.addresses.find((addr) => addr._id.toString() !== addressId)
      if (newDefault) {
        newDefault.isDefault = true
      }
    }

    // Remove the address from the array
    customer.addresses.splice(addressIndex, 1)
    await customer.save()

    return res.status(200).json({
      message: 'Address deleted successfully',
      data: customer.addresses,
    })
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete address',
      error: error.message,
    })
  }
}


// async function deleteAddress(req, res) {
//   const { addressId } = req.params

//   try {
//     const customer = await Customer.findById(req.user.customerId)
//     const address = customer.addresses.id(addressId)

//     if (!address) {
//       return res.status(404).json({ message: 'Address not found' })
//     }

//     if (address.isDefault && customer.addresses.length > 1) {
//       customer.addresses.find((addr) => addr._id != addressId).isDefault = true
//     }

//     address.remove()
//     await customer.save()

//     return res.status(200).json({
//       message: 'Address deleted successfully',
//       data: customer.addresses,
//     })
//   } catch (error) {
//     return res.status(500).json({
//       message: 'Failed to delete address',
//       error: error.message,
//     })
//   }
// }

module.exports = {
  getProfile,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
}
