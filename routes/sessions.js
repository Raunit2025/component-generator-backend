// routes/sessions.js
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Session = require('../models/Session');
const { generateComponentCode } = require('../services/aiService');

const router = express.Router();
router.use(protect);

// Generate code using MongoDB as the direct source of truth
router.post('/:id/generate', async (req, res) => {
  const { prompt, targetElement } = req.body;
  const { id } = req.params;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ message: 'Prompt cannot be empty' });
  }

  try {
    const session = await Session.findOne({ _id: id, user: req.user._id });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.chatHistory.push({ role: 'user', content: prompt });

    const jsxBodyMatch = session.jsxCode.match(/return \(([\s\S]*?)\);/);
    const existingJsxBody = jsxBodyMatch ? jsxBodyMatch[1].trim() : session.jsxCode;

    const { jsxCode, cssCode } = await generateComponentCode(
      prompt,
      existingJsxBody,
      session.cssCode,
      targetElement
    );

    session.chatHistory.push({ role: 'assistant', content: "Sure, I've updated the code for you." });
    session.jsxCode = jsxCode;
    session.cssCode = cssCode;

    const updatedSession = await session.save();

    res.json(updatedSession);

  } catch (error) {
    console.error('Error generating code:', error);
    res.status(500).json({ message: 'Server error generating code' });
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
    console.error('Error creating session:', error);
    res.status(500).json({ message: 'Server error creating session' });
  }
});

// Get all sessions for the logged-in user
router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
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
        res.status(200).json({ message: 'Session deleted successfully' });
    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ message: 'Server error deleting session' });
    }
});

module.exports = router;