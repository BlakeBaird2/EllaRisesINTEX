// User Management Routes (Manager only)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/database');

// List all users
router.get('/', async (req, res) => {
  try {
    const users = await db('websiteusers')
      .select('user_id', 'username', 'email', 'first_name', 'last_name', 'user_role', 'account_status', 'created_at', 'last_login')
      .orderBy('username')
      .then(users => users.map(user => ({
        ...user,
        full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        role: user.user_role,
        is_active: user.account_status === 'active'
      })));

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
  const { username, email, password, first_name, last_name, role } = req.body;

  try {
    const password_hash = await bcrypt.hash(password, 10);

    await db('websiteusers').insert({
      username,
      email,
      password_hash,
      first_name,
      last_name,
      user_role: role || 'user',
      account_status: 'active',
      is_email_verified: false,
      failed_login_attempts: 0
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
    const user = await db('websiteusers').where({ user_id: req.params.id }).first();
    if (!user) return res.status(404).render('error', { title: 'Not Found', message: 'User not found' });

    // Map database fields to form fields
    user.full_name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    user.role = user.user_role;
    user.is_active = user.account_status === 'active';

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
  const { email, first_name, last_name, role, is_active, password } = req.body;

  try {
    const updateData = {
      email,
      first_name,
      last_name,
      user_role: role,
      account_status: is_active === 'true' ? 'active' : 'inactive',
      updated_at: db.fn.now()
    };

    if (password && password.trim() !== '') {
      updateData.password_hash = await bcrypt.hash(password, 10);
      updateData.last_password_change = db.fn.now();
    }

    await db('websiteusers').where({ user_id: req.params.id }).update(updateData);
    res.redirect('/users?success=User updated successfully');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to update user', error });
  }
});

// Delete user
router.post('/:id/delete', async (req, res) => {
  try {
    await db('websiteusers').where({ user_id: req.params.id }).del();
    res.redirect('/users?success=User deleted successfully');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to delete user', error });
  }
});

module.exports = router;
