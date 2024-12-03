const errorHandler = (err, req, res, next) => {
  console.log('[Error]'.red, `${err.name}: ${err.message}`)
  console.log(err.stack)

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: Object.values(err.errors).map((e) => e.message),
    })
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid ID format',
    })
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(400).json({
      message: `Duplicate value for ${field}`,
    })
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token',
    })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired',
    })
  }

  // Default error
  const statusCode = err.statusCode || 500
  const message = err.statusCode ? err.message : 'Internal Server Error'

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack,
    }),
  })
}

module.exports = errorHandler
