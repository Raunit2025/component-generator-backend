// config/passport.js
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GithubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

const BACKEND_URL = process.env.BACKEND_URL;

const opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = process.env.JWT_SECRET;

module.exports = (passport) => {
  // JWT Strategy
  passport.use('jwt', new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const user = await User.findById(jwt_payload.sub);
      if (user) {
        return done(null, user);
      }
      return done(null, false);
    } catch (err) {
      return done(err, false);
    }
  }));

  // Google Strategy
  passport.use('google', new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${BACKEND_URL}/auth/google/callback`,
      scope: ['email', 'profile'],
    },
    (accessToken, refreshToken, profile, done) => {
      const userProfile = {
        provider: 'google',
        providerId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        picture: profile.photos[0].value,
      };
      return done(null, userProfile);
    }
  ));

  // GitHub Strategy
  passport.use('github', new GithubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${BACKEND_URL}/auth/github/callback`,
      scope: ['user:email'],
    },
    (accessToken, refreshToken, profile, done) => {
      const userProfile = {
        provider: 'github',
        providerId: profile.id,
        email: profile.emails[0].value,
        name: profile.username,
        picture: profile.photos[0].value,
      };
      return done(null, userProfile);
    }
  ));
};
