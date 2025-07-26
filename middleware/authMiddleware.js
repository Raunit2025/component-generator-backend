// middleware/authMiddleware.js
const passport = require('passport');

// This middleware uses the 'jwt' strategy and ensures no session is created
const protect = passport.authenticate('jwt', { session: false });

module.exports = { protect };
