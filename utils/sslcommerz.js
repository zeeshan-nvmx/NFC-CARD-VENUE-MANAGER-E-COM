const axios = require('axios')
const crypto = require('crypto')

function generateTransactionId() {
  return crypto.randomBytes(16).toString('hex')
}

async function initiatePayment(order, customer, successUrl, failUrl, cancelUrl) {
  const payload = {
    store_id: process.env.SSLCOMMERZ_STORE_ID,
    store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,
    total_amount: order.totalAmount,
    currency: 'BDT',
    tran_id: generateTransactionId(),
    success_url: successUrl,
    fail_url: failUrl,
    cancel_url: cancelUrl,
    ipn_url: process.env.SSLCOMMERZ_IPN_URL,
    shipping_method: 'NO',
    product_name: 'Food Order',
    product_category: 'Food',
    product_profile: 'general',
    cus_name: customer.name,
    cus_email: customer.email || 'customer@example.com',
    cus_add1: order.deliveryAddress.street,
    cus_add2: order.deliveryAddress.area,
    cus_city: order.deliveryAddress.city,
    cus_postcode: order.deliveryAddress.postalCode || '1000',
    cus_country: 'Bangladesh',
    cus_phone: customer.phone,
    ship_name: customer.name,
    ship_add1: order.deliveryAddress.street,
    ship_add2: order.deliveryAddress.area,
    ship_city: order.deliveryAddress.city,
    ship_postcode: order.deliveryAddress.postalCode || '1000',
    ship_country: 'Bangladesh',
  }

  try {
    const response = await axios.post(`${process.env.SSLCOMMERZ_API_URL}/gwprocess/v4/api.php`, payload)

    return {
      success: true,
      sessionKey: response.data.sessionkey,
      redirectGatewayURL: response.data.GatewayPageURL,
      transactionId: payload.tran_id,
    }
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    }
  }
}

async function validatePayment(data) {
  const validationPayload = {
    store_id: process.env.SSLCOMMERZ_STORE_ID,
    store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,
    val_id: data.val_id,
  }

  try {
    const response = await axios.post(`${process.env.SSLCOMMERZ_API_URL}/validator/api/validationserverAPI.php`, validationPayload)

    return {
      success: true,
      data: response.data,
    }
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    }
  }
}

async function initiateRefund(transactionId, amount, reason) {
  const refundPayload = {
    store_id: process.env.SSLCOMMERZ_STORE_ID,
    store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,
    refund_amount: amount,
    refund_remarks: reason,
    bank_tran_id: transactionId,
  }

  try {
    const response = await axios.post(`${process.env.SSLCOMMERZ_API_URL}/api/refund.php`, refundPayload)

    return {
      success: true,
      data: response.data,
    }
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    }
  }
}

module.exports = {
  initiatePayment,
  validatePayment,
  initiateRefund,
  generateTransactionId,
}
