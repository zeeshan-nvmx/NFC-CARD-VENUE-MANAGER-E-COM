const bcrypt = require('bcryptjs')

async function hashPassword(unhashedPassword) {
  const hashedPassword = await bcrypt.hash(unhashedPassword, 12)
  return hashedPassword
}

async function comparePassword(sentPassword, storedPassword) {
  const isCorrect = bcrypt.compare(sentPassword, storedPassword)
  return isCorrect
}

module.exports = { hashPassword, comparePassword }
