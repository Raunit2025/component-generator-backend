// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const passport = require('passport');
const connectDB = require('./config/db');
const redisClient = require('./config/redis'); // This might be null

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();

// Listen for Redis connection events only if the client was initialized
if (redisClient) {
  redisClient.on('connect', () => {
    console.log('Connected to Redis...');
  });
}

const app = express();

// Body parser
app.use(express.json());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000', // For local development
  'https://component-generator-frontend-xzms.vercel.app' // Your Vercel URL
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
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
