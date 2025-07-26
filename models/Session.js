// models/Session.js
const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant'],
  },
  content: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
  _id: false
});

const SessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    default: 'Untitled Component',
  },
  chatHistory: [ChatMessageSchema],
  jsxCode: {
    type: String,
    default: 'const GeneratedComponent = () => { return <div>Hello World</div>; };',
  },
  cssCode: {
    type: String,
    default: '/* Add your CSS here */',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Session', SessionSchema);
