// User Management Routes (Manager only)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/database');

// List all users
router.get('/', async (req, res) => {
  const { search, role, dateSort = 'desc', page = 1 } = req.query;
  const limit = 15;
  const offset = (page - 1) * limit;
  
  try {
    let query = db('websiteusers')
      .select('user_id', 'username', 'email', 'first_name', 'last_name', 'user_role', 'account_status', 'created_at', 'last_login');

    // Trim search query to handle leading/trailing spaces
    const trimmedSearch = search ? search.trim() : '';

    // Search functionality - supports searching by username, email, first name, last name, or full name
    if (trimmedSearch) {
      query = query.where(function() {
        this.where('username', 'ilike', `%${trimmedSearch}%`)
          .orWhere('email', 'ilike', `%${trimmedSearch}%`)
          .orWhere('first_name', 'ilike', `%${trimmedSearch}%`)
          .orWhere('last_name', 'ilike', `%${trimmedSearch}%`)
          .orWhereRaw(`COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') ILIKE ?`, [`%${trimmedSearch}%`]);
      });
    }

    // Filter by role
    if (role && role !== '') {
      query = query.where('user_role', role);
    }

    // Get total count for pagination
    let countQuery = db('websiteusers');
    if (trimmedSearch) {
      countQuery = countQuery.where(function() {
        this.where('username', 'ilike', `%${trimmedSearch}%`)
          .orWhere('email', 'ilike', `%${trimmedSearch}%`)
          .orWhere('first_name', 'ilike', `%${trimmedSearch}%`)
          .orWhere('last_name', 'ilike', `%${trimmedSearch}%`)
          .orWhereRaw(`COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') ILIKE ?`, [`%${trimmedSearch}%`]);
      });
    }
    if (role && role !== '') {
      countQuery = countQuery.where('user_role', role);
    }
    const [{ count }] = await countQuery.count('* as count');
    const totalPages = Math.ceil(parseInt(count) / limit);

    // Sort by date
    const sortDirection = dateSort === 'asc' ? 'asc' : 'desc';
    const users = await query
      .orderBy('websiteusers.created_at', sortDirection)
      .orderBy('username', 'asc')
      .limit(limit)
      .offset(offset)
      .then(users => users.map(user => ({
        ...user,
        full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        role: user.user_role,
        is_active: user.account_status === 'active'
      })));

    res.render('users/index', {
      title: 'User Management',
      users,
      search: trimmedSearch || '',
      selectedRole: typeof role !== 'undefined' ? role : '',
      dateSort: sortDirection,
      currentPage: parseInt(page),
      totalPages,
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
  const { username, email, first_name, last_name, role, is_active, password } = req.body;

  try {
    // Validate username if provided
    if (!username || username.trim() === '') {
      const user = await db('websiteusers').where({ user_id: req.params.id }).first();
      if (!user) return res.status(404).render('error', { title: 'Not Found', message: 'User not found' });

      user.full_name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      user.role = user.user_role;
      user.is_active = user.account_status === 'active';

      return res.render('users/form', {
        title: 'Edit User',
        user,
        action: `/users/${req.params.id}`,
        method: 'POST',
        isManager: true,
        error: 'Username is required.'
      });
    }

    const trimmedUsername = username.trim();

    // Check if username is being changed and if it's already taken by another user
    const existingUser = await db('websiteusers')
      .where({ username: trimmedUsername })
      .whereNot({ user_id: req.params.id })
      .first();

    if (existingUser) {
      const user = await db('websiteusers').where({ user_id: req.params.id }).first();
      if (!user) return res.status(404).render('error', { title: 'Not Found', message: 'User not found' });

      user.full_name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      user.role = user.user_role;
      user.is_active = user.account_status === 'active';

      return res.render('users/form', {
        title: 'Edit User',
        user,
        action: `/users/${req.params.id}`,
        method: 'POST',
        isManager: true,
        error: 'Username is already taken. Please choose a different username.'
      });
    }

    const updateData = {
      username: trimmedUsername,
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

    // Update session if the current user is editing their own profile
    if (req.session.user && req.session.user.id === parseInt(req.params.id)) {
      req.session.user.username = trimmedUsername;
      req.session.save();
    }

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
