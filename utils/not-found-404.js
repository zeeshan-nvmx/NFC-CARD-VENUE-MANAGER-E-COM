const notFoundError = (req, res) => {
  console.log('[404]'.yellow, `Route not found: ${req.method} ${req.originalUrl}`)

  res.status(404).json({
    message: 'The requested resource was not found',
  })
}

module.exports = notFoundError