// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const passport = require('passport');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Body parser
app.use(express.json());

// --- SECURE CORS CONFIGURATION WITH LOGGING ---
const allowedOrigins = [
  'http://localhost:3000', // For local development
  'https://component-generator-frontend.vercel.app' // Your known Vercel URL
];

app.use(cors({
  origin: function (origin, callback) {
    // Log the incoming origin for debugging purposes
    console.log('Incoming request from origin:', origin);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      // If the origin is in our whitelist, allow it
      callback(null, true);
    } else {
      // If the origin is not whitelisted, reject it
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      callback(new Error(msg), false);
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));


// Passport middleware
app.use(passport.initialize());

// Passport config
require('./config/passport')(passport);

// Mount routers
app.use('/auth', require('./routes/auth'));
app.use('/sessions', require('./routes/sessions'));

// Health check route
app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});