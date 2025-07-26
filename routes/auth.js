const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// --- Local Auth ---
router.post('/signup', async (req, res) => {
  const { email, password, confirmPassword } = req.body; // Add confirmPassword
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ message: 'Please provide a valid email and a password of at least 6 characters.' });
  }

  // --- New Validation Step ---
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({ email, passwordHash, provider: 'email' });
    const savedUser = await newUser.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: savedUser._id,
        email: savedUser.email,
        createdAt: savedUser.createdAt,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !user.passwordHash) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const payload = { sub: user._id, email: user.email };
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            message: 'Logged in successfully',
            user: { id: user._id, email: user.email },
            accessToken,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

router.get('/profile', protect, (req, res) => {
    res.json({
        id: req.user._id,
        email: req.user.email,
        createdAt: req.user.createdAt,
    });
});


// --- OAuth Logic ---
const handleOAuthCallback = async (req, res) => {
    const { provider, providerId, email } = req.user;
    try {
        let user = await User.findOne({ provider, providerId });
        if (!user) {
            user = await User.findOne({ email });
            if (user) {
                user.provider = provider;
                user.providerId = providerId;
                await user.save();
            } else {
                user = await User.create({ provider, providerId, email });
            }
        }
        const payload = { sub: user._id, email: user.email };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.redirect(`http://localhost:3000/auth/callback?token=${token}`);
    } catch (error) {
        console.error('OAuth Error:', error);
        res.redirect('http://localhost:3000/auth/login?error=oauth_failed');
    }
};

// --- Google OAuth Routes ---
router.get('/google', passport.authenticate('google'));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/auth/login' }), handleOAuthCallback);

// --- GitHub OAuth Routes ---
router.get('/github', passport.authenticate('github'));
router.get('/github/callback', passport.authenticate('github', { session: false, failureRedirect: '/auth/login' }), handleOAuthCallback);


module.exports = router;