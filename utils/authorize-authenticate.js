const { verifyToken } = require('./jwt')

async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication token is required' })
    }

    const token = authHeader.split(' ')[1]
    const verifiedToken = await verifyToken(token)

    console.log(verifiedToken)

    if (verifiedToken.customerType === 'online') {
      return res.status(401).json({ message: 'Invalid access token for this route' })
    }

    const { userId, name, phone, role, motherStall, stallId } = verifiedToken
    req.user = { userId, name, phone, role, motherStall, stallId }
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

async function authenticateOnlineCustomer(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication token is required' })
    }

    const token = authHeader.split(' ')[1]
    const verifiedToken = await verifyToken(token)

    if (verifiedToken.customerType !== 'online') {
      return res.status(401).json({ message: 'Invalid access token for this route' })
    }

    const { customerId, name, phone } = verifiedToken
    req.user = { customerId, name, phone, customerType: 'online' }
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

function authorizeUser(...roles) {
  return function (req, res, next) {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `User role: ${req.user.role} is not authorized to access this route` })
    }
    next()
  }
}

module.exports = { authenticateUser, authenticateOnlineCustomer, authorizeUser }
