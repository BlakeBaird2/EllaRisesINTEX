// User Management Routes (Manager only)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db } = require('../server');

// List all users
router.get('/', async (req, res) => {
  try {
    const users = await db('users')
      .select('user_id', 'username', 'email', 'full_name', 'role', 'is_active', 'created_at', 'last_login')
      .orderBy('username');

    res.render('users/index', {
      title: 'User Management',
      users,
      isManager: true
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to load users', error });
  }
});

// Show create user form
router.get('/new', (req, res) => {
  res.render('users/form', {
    title: 'Add New User',
    user: {},
    action: '/users',
    method: 'POST',
    isManager: true
  });
});

// Create new user
router.post('/', async (req, res) => {
  const { username, email, password, full_name, role } = req.body;

  try {
    const password_hash = await bcrypt.hash(password, 10);
    
    await db('users').insert({
      username,
      email,
      password_hash,
      full_name,
      role: role || 'user',
      is_active: true
    });

    res.redirect('/users?success=User created successfully');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to create user', error });
  }
});

// Show edit user form
router.get('/:id/edit', async (req, res) => {
  try {
    const user = await db('users').where({ user_id: req.params.id }).first();
    if (!user) return res.status(404).render('error', { title: 'Not Found', message: 'User not found' });

    res.render('users/form', {
      title: 'Edit User',
      user,
      action: `/users/${req.params.id}`,
      method: 'POST',
      isManager: true
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to load user', error });
  }
});

// Update user
router.post('/:id', async (req, res) => {
  const { email, full_name, role, is_active, password } = req.body;

  try {
    const updateData = {
      email,
      full_name,
      role,
      is_active: is_active === 'true'
    };

    if (password && password.trim() !== '') {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    await db('users').where({ user_id: req.params.id }).update(updateData);
    res.redirect('/users?success=User updated successfully');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to update user', error });
  }
});

// Delete user
router.post('/:id/delete', async (req, res) => {
  try {
    await db('users').where({ user_id: req.params.id }).del();
    res.redirect('/users?success=User deleted successfully');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to delete user', error });
  }
});

module.exports = router;
