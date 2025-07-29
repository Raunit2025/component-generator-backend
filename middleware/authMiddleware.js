// middleware/authMiddleware.js
const passport = require('passport');

const protect = passport.authenticate('jwt', { session: false });

module.exports = { protect };
