// server.js
const express = require('express')
const app = express()
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { xss } = require('express-xss-sanitizer')
const mongoSanitize = require('express-mongo-sanitize')
const rateLimit = require('express-rate-limit')
const colors = require('colors')

const port = process.env.PORT || 5000

require('dotenv').config()

const onlineAuth = require('./routes/online-customer-auth.routes')
const onlineProfile = require('./routes/online-customer-profile.routes')
const staffAuth = require('./routes/auth.routes')
const customerRoutes = require('./routes/customer.routes')
const stallRoutes = require('./routes/stall.routes')
const orderRoutes = require('./routes/order.routes')

const connectDB = require('./utils/db')
const errorHandler = require('./utils/error-handler')
const { authenticateUser } = require('./utils/authorize-authenticate')
const notFoundError = require('./utils/not-found-404')

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`[${new Date().toISOString()}] Rate limit exceeded for IP: ${req.ip}`.red)
    res.status(429).json({
      message: 'Too many requests from this IP, please try again later',
    })
  },
})

// Custom morgan logging format
morgan.token('custom-date', () => new Date().toISOString())
morgan.token('body', (req) => JSON.stringify(req.body))

const customFormat = ':custom-date [:method] :url :status :response-time ms - :res[content-length] - :remote-addr'

// Apply rate limiter
app.use(limiter)

// Security middleware
app.use(helmet())
app.use(cors())
app.use(xss())
app.use(mongoSanitize())

// Logging middleware
app.use(
  morgan(customFormat, {
    stream: {
      write: (message) => {
        // Color-code status codes
        const colorizedMessage = message.replace(/(\s[0-9]{3}\s)/, (match) => {
          const status = parseInt(match)
          if (status >= 500) return colors.red(match)
          if (status >= 400) return colors.yellow(match)
          if (status >= 300) return colors.cyan(match)
          if (status >= 200) return colors.green(match)
          return match
        })
        console.log(colorizedMessage.trim())
      },
    },
  })
)

app.use(
  express.json({
    limit: '10kb',
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf)
      } catch (e) {
        console.log(`[${new Date().toISOString()}] Invalid JSON received:`.red, e.message)
        res.status(400).json({ message: 'Invalid JSON payload' })
        throw new Error('Invalid JSON')
      }
    },
  })
)

// Test route
app.get('/api/showme', authenticateUser, (req, res) => {
  res.json(req.user)
})

// API routes
app.use('/api', onlineAuth)
app.use('/api', onlineProfile)
app.use('/api', staffAuth)
app.use('/api', customerRoutes)
app.use('/api', stallRoutes)
app.use('/api', orderRoutes)

// Error handling
app.use(notFoundError)
app.use(errorHandler)

// Unhandled rejection handling
process.on('unhandledRejection', (err) => {
  console.log('[Unhandled Rejection]'.red, err.message)
  console.log(err.stack)
})

// Uncaught exception handling
process.on('uncaughtException', (err) => {
  console.log('[Uncaught Exception]'.red, err.message)
  console.log(err.stack)
  process.exit(1)
})

const startServer = async () => {
  try {
    await connectDB(process.env.MONGO_URL)
    console.log('[Database]'.green, 'Connected to MongoDB')

    app.listen(port, () => {
      console.log('[Server]'.green, `Started on port ${port}`)
    })
  } catch (error) {
    console.log('[Startup Error]'.red, error.message)
    process.exit(1)
  }
}

startServer()


