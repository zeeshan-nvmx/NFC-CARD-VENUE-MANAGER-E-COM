const express = require('express')
const app = express()
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { xss } = require('express-xss-sanitizer')
const mongoSanitize = require('express-mongo-sanitize')

const port = process.env.PORT || 5000

require('dotenv').config()

const onlineAuth = require('./routes/online-customer-auth.routes')
const onlineProfile = require('./routes/online-customer-profile.routes')
const staffAuth = require('./routes/auth.routes')

const connectDB = require('./utils/db')
// const errorHandler = require('./utils/error-handler')
const { authenticateUser } = require('./utils/authorize-authenticate')
// const notFoundError = require('./utils/not-found-404')

app.use(helmet())
app.use(cors())
app.use(xss())
app.use(mongoSanitize())
app.use(morgan('short'))
app.use(express.json())

app.get('/api/showme', authenticateUser, (req, res) => {
  res.json(req.user)
})

app.use('/api', onlineAuth)
app.use('/api', onlineProfile)
app.use('/api', staffAuth)

// app.use(notFoundError)
// app.use(errorHandler)

const startServer = () => {
  app.listen(port, () => {
    connectDB(process.env.MONGO_URL)
    console.log(`server started on port ${port}`)
  })
}

startServer()
