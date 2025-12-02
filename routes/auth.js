// ========================================================================
// Authentication Routes
// Handles login, logout, and registration
// ========================================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db } = require('../server');

// ========================================================================
// GET /login - Display login page
// ========================================================================
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login', {
    title: 'Login',
    error: req.query.error || null
  });
});

// ========================================================================
// POST /login - Process login
// ========================================================================
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find user by username
    const user = await db('users')
      .where({ username })
      .andWhere({ is_active: true })
      .first();

    if (!user) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid username or password'
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid username or password'
      });
    }

    // Update last login
    await db('users')
      .where({ user_id: user.user_id })
      .update({ last_login: db.fn.now() });

    // Set session
    req.session.user = {
      id: user.user_id,
      username: user.username,
      role: user.role,
      email: user.email,
      full_name: user.full_name
    };

    // Redirect based on role
    if (user.role === 'manager') {
      res.redirect('/dashboard');
    } else {
      res.redirect('/dashboard');
    }

  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', {
      title: 'Login',
      error: 'An error occurred. Please try again.'
    });
  }
});

// ========================================================================
// GET /logout - Logout user
// ========================================================================
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

module.exports = router;
