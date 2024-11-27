const mongoose = require('mongoose')

const connectDB = async (url) => {
  try {
    await mongoose.connect(url)
    console.log('Connected to MongoDB Serverless Instance')
  } catch (err) {
    console.error('Error connecting to MongoDB:', err)
  }
}

module.exports = connectDB
