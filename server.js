// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const passport = require('passport');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// --- UPDATE CORS OPTIONS HERE ---
const allowedOrigins = [
  'http://localhost:3000', // For local development
  'https://component-generator-frontend-xzms.vercel.app/' // <-- IMPORTANT: REPLACE with your actual Vercel URL
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));
// --- END OF CORS UPDATE ---


// Passport middleware
app.use(passport.initialize());

// Passport config
require('./config/passport')(passport);

// Mount routers
app.use('/auth', require('./routes/auth'));
app.use('/sessions', require('./routes/sessions'));

app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});