// routes/sessions.js
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Session = require('../models/Session');
const { generateComponentCode } = require('../services/aiService');
const redisClient = require('../config/redis'); // This will be null if REDIS_URL is not set

const router = express.Router();
router.use(protect);

const isRedisEnabled = !!redisClient;
const ACTIVE_SESSION_EXPIRY = 3600; // 1 hour

const getActiveSessionKey = (userId, sessionId) => `active_session:${userId}:${sessionId}`;

// Activate a session: Load into Redis if enabled, otherwise do nothing.
router.get('/:id/activate', async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (isRedisEnabled) {
      const activeSessionKey = getActiveSessionKey(req.user._id, req.params.id);
      await redisClient.hSet(activeSessionKey, {
        _id: session._id.toString(),
        name: session.name,
        jsxCode: session.jsxCode,
        cssCode: session.cssCode,
        chatHistory: JSON.stringify(session.chatHistory),
      });
      await redisClient.expire(activeSessionKey, ACTIVE_SESSION_EXPIRY);
    }

    res.json(session);
  } catch (error) {
    console.error('Error activating session:', error);
    res.status(500).json({ message: 'Server error activating session' });
  }
});

// Generate code: Use Redis if enabled, otherwise use MongoDB.
router.post('/:id/generate', async (req, res) => {
  const { prompt, targetElement } = req.body;
  const { id } = req.params;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ message: 'Prompt cannot be empty' });
  }

  try {
    let currentSession;
    let chatHistory;

    // --- LOGIC FOR REDIS (PRODUCTION) ---
    if (isRedisEnabled) {
      const activeSessionKey = getActiveSessionKey(req.user._id, id);
      const cachedSession = await redisClient.hGetAll(activeSessionKey);
      if (!cachedSession || !cachedSession.jsxCode) {
        // As a fallback, try to load from DB if cache is empty/expired
        const sessionFromDB = await Session.findOne({ _id: id, user: req.user._id });
        if (!sessionFromDB) {
          return res.status(404).json({ message: 'Session not found in DB after cache miss.' });
        }
        // Activate it again
        await router.get(`/${id}/activate`, req, res);
        currentSession = sessionFromDB;
      } else {
        currentSession = cachedSession;
      }
      chatHistory = JSON.parse(currentSession.chatHistory);
    }
    // --- FALLBACK LOGIC FOR MONGODB (LOCAL) ---
    else {
      const sessionFromDB = await Session.findOne({ _id: id, user: req.user._id });
      if (!sessionFromDB) {
        return res.status(404).json({ message: 'Session not found' });
      }
      currentSession = sessionFromDB;
      chatHistory = currentSession.chatHistory;
    }

    chatHistory.push({ role: 'user', content: prompt });

    const jsxBodyMatch = currentSession.jsxCode.match(/return \(([\s\S]*?)\);/);
    const existingJsxBody = jsxBodyMatch ? jsxBodyMatch[1].trim() : '';

    const { jsxCode, cssCode } = await generateComponentCode(
      prompt,
      existingJsxBody,
      currentSession.cssCode,
      targetElement
    );
    
    chatHistory.push({ role: 'assistant', content: "Sure, I've updated the code for you." });

    // --- UPDATE DATA SOURCE ---
    if (isRedisEnabled) {
      const activeSessionKey = getActiveSessionKey(req.user._id, id);
      // Use hSet to update multiple fields at once
      await redisClient.hSet(activeSessionKey, {
          jsxCode: jsxCode,
          cssCode: cssCode,
          chatHistory: JSON.stringify(chatHistory)
      });
      await redisClient.expire(activeSessionKey, ACTIVE_SESSION_EXPIRY);
    } else {
      currentSession.jsxCode = jsxCode;
      currentSession.cssCode = cssCode;
      currentSession.chatHistory = chatHistory;
      await currentSession.save();
    }

    res.json({
      _id: currentSession._id.toString(),
      name: currentSession.name,
      jsxCode,
      cssCode,
      chatHistory,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error generating code' });
  }
});

// Persist session: Only does something if Redis is enabled.
router.put('/:id/persist', async (req, res) => {
  if (!isRedisEnabled) {
    return res.status(200).json({ message: 'Redis is not enabled, no action taken.' });
  }
  try {
    const { id } = req.params;
    const activeSessionKey = getActiveSessionKey(req.user._id, id);
    const cachedSession = await redisClient.hGetAll(activeSessionKey);

    if (!cachedSession || !cachedSession.jsxCode) {
      return res.status(404).json({ message: 'No active session found in cache to persist.' });
    }

    await Session.findOneAndUpdate(
      { _id: id, user: req.user._id },
      {
        name: cachedSession.name,
        jsxCode: cachedSession.jsxCode,
        cssCode: cachedSession.cssCode,
        chatHistory: JSON.parse(cachedSession.chatHistory),
      }
    );
    res.status(200).json({ message: 'Session persisted to database successfully.' });
  } catch (error) {
    console.error('Error persisting session:', error);
    res.status(500).json({ message: 'Server error persisting session.' });
  }
});

// Create a new session
router.post('/', async (req, res) => {
  try {
    const initialJsxCode = `const GeneratedComponent = () => {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#9CA3AF',
          fontFamily: 'sans-serif',
          fontSize: '1.25rem',
          textAlign: 'center',
          padding: '1rem'
        }}>
          Hello! Describe the component you want to build in the chat.
        </div>
      );
    };`;

    const newSession = new Session({
      user: req.user._id,
      name: 'New Component',
      jsxCode: initialJsxCode,
      cssCode: '/* Your component CSS will appear here */',
      chatHistory: [],
    });

    const savedSession = await newSession.save();
    res.status(201).json(savedSession);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating session' });
  }
});

// Get all sessions for the logged-in user
router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching sessions' });
  }
});

// Rename a session
router.put('/:id/rename', async (req, res) => {
  const { name } = req.body;
  const { id } = req.params;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Name cannot be empty' });
  }

  try {
    const session = await Session.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { name: name },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (isRedisEnabled) {
        const activeSessionKey = getActiveSessionKey(req.user._id, id);
        if (await redisClient.exists(activeSessionKey)) {
            await redisClient.hSet(activeSessionKey, 'name', name);
        }
    }

    res.json(session);
  } catch (error) {
    console.error('Error renaming session:', error);
    res.status(500).json({ message: 'Server error renaming session' });
  }
});

// Delete a session
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const session = await Session.findOneAndDelete({ _id: id, user: req.user._id });

        if (!session) {
            return res.status(404).json({ message: 'Session not found or you do not have permission to delete it.' });
        }

        if (isRedisEnabled) {
            const activeSessionKey = getActiveSessionKey(req.user._id, id);
            await redisClient.del(activeSessionKey);
        }

        res.status(200).json({ message: 'Session deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting session' });
    }
});

module.exports = router;
