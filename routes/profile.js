// ========================================================================
// Profile Routes - Users can view and edit their own information
// ========================================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/database');

// ========================================================================
// GET /profile - Show user's own profile
// ========================================================================
router.get('/', async (req, res) => {
  try {
    const user = await db('websiteusers')
      .where({ user_id: req.session.user.id })
      .first();

    if (!user) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'User not found',
        error: { status: 404 }
      });
    }

    // Don't send password hash to view
    res.render('profile/index', {
      title: 'My Profile',
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        role: user.user_role,
        created_at: user.created_at,
        last_login: user.last_login
      },
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load profile',
      error
    });
  }
});

// ========================================================================
// POST /profile - Update user's own profile
// ========================================================================
router.post('/', async (req, res) => {
  const { username, password, confirm_password } = req.body;

  try {
    // Validate password confirmation if password is being changed
    if (password && password.trim() !== '') {
      if (!confirm_password || password !== confirm_password) {
        return res.redirect('/profile?error=Passwords do not match');
      }
      if (password.length < 6) {
        return res.redirect('/profile?error=Password must be at least 6 characters long');
      }
    } else if (confirm_password && confirm_password.trim() !== '') {
      // If confirm_password is provided but password is not, that's an error
      return res.redirect('/profile?error=Please enter a new password');
    }

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await db('websiteusers')
        .where({ username })
        .whereNot({ user_id: req.session.user.id })
        .first();

      if (existingUser) {
        return res.redirect('/profile?error=Username is already taken');
      }
    }

    const updateData = {
      updated_at: db.fn.now()
    };

    // Update username if provided
    if (username && username.trim() !== '') {
      updateData.username = username.trim();
    }

    // Update password if provided
    if (password && password.trim() !== '') {
      updateData.password_hash = await bcrypt.hash(password, 10);
      updateData.last_password_change = db.fn.now();
    }

    // Update the user
    await db('websiteusers')
      .where({ user_id: req.session.user.id })
      .update(updateData);

    // Update session if username changed
    if (username && username.trim() !== '') {
      req.session.user.username = username.trim();
      req.session.save();
    }

    res.redirect('/profile?success=Profile updated successfully');
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to update profile',
      error
    });
  }
});

module.exports = router;

