// ========================================================================
// Authentication Routes
// Handles login, logout, and registration
// ========================================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/database');

// ========================================================================
// GET /login - Display login page
// ========================================================================
router.get('/login', (req, res) => {
  if (req.session.user) {
    // Redirect based on role if already logged in
    if (req.session.user.role === 'manager' || req.session.user.role === 'admin') {
      return res.redirect('/dashboard');
    } else {
      return res.redirect('/');
    }
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
    const user = await db('websiteusers')
      .where({ username })
      .andWhere({ account_status: 'active' })
      .first();

    if (!user) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid username or password'
      });
    }

    // Verify password
    // Check if password is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 chars)
    let passwordMatch = false;
    if (user.password_hash && user.password_hash.length === 60 && user.password_hash.startsWith('$2')) {
      // Bcrypt hashed password
      passwordMatch = await bcrypt.compare(password, user.password_hash);
    } else if (user.password_hash) {
      // Plain text password (for development/testing only - INSECURE!)
      console.warn('WARNING: Using plain text password comparison. This is insecure!');
      passwordMatch = password === user.password_hash;
    } else {
      // No password hash set
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid username or password'
      });
    }

    if (!passwordMatch) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid username or password'
      });
    }

    // Update last login
    await db('websiteusers')
      .where({ user_id: user.user_id })
      .update({ last_login: db.fn.now() });

    // Set session
    req.session.user = {
      id: user.user_id,
      username: user.username,
      role: user.user_role,
      email: user.email,
      full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim()
    };

    // Save session before redirect to ensure it persists
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.render('auth/login', {
          title: 'Login',
          error: 'An error occurred. Please try again.'
        });
      }

      console.log('Login successful for user:', username);
      // Redirect based on role
      if (user.user_role === 'manager' || user.user_role === 'admin') {
        res.redirect('/dashboard');
      } else {
        // Regular users go to home page
        res.redirect('/');
      }
    });

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
