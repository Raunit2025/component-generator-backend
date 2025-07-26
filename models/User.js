// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    sparse: true, // Allows multiple documents to have a null value for this field
  },
  passwordHash: {
    type: String,
    required: false,
  },
  provider: {
    type: String,
  },
  providerId: {
    type: String,
  },
}, {
  timestamps: true,
});

// Compound index for OAuth users
UserSchema.index({ provider: 1, providerId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', UserSchema);
