// Donation Routes - Manages donations
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// List all donations
router.get('/', async (req, res) => {
  const { search, amountFilter, dateSort = 'desc', page = 1 } = req.query;
  const limit = 15;
  const offset = (page - 1) * limit;

  try {
    let query = db('donations')
      .leftJoin('participants', 'donations.participant_id', 'participants.participant_id')
      .select('donations.*',
              'participants.participant_first_name as first_name',
              'participants.participant_last_name as last_name');

    // Search functionality
    if (search) {
      query = query.where(function() {
        this.where('participants.participant_first_name', 'ilike', `%${search}%`)
          .orWhere('participants.participant_last_name', 'ilike', `%${search}%`)
          .orWhere('donations.participant_email', 'ilike', `%${search}%`);
      });
    }

    // Filter by amount
    if (amountFilter) {
      if (amountFilter === 'under50') {
        query = query.where('donations.donation_amount', '<', 50);
      } else if (amountFilter === '50-100') {
        query = query.whereBetween('donations.donation_amount', [50, 100]);
      } else if (amountFilter === '100-500') {
        query = query.whereBetween('donations.donation_amount', [100, 500]);
      } else if (amountFilter === 'over500') {
        query = query.where('donations.donation_amount', '>', 500);
      }
    }

    // Get total count for pagination
    let countQuery = db('donations').leftJoin('participants', 'donations.participant_id', 'participants.participant_id');
    if (search) {
      countQuery = countQuery.where(function() {
        this.where('participants.participant_first_name', 'ilike', `%${search}%`)
          .orWhere('participants.participant_last_name', 'ilike', `%${search}%`)
          .orWhere('donations.participant_email', 'ilike', `%${search}%`);
      });
    }
    if (amountFilter) {
      if (amountFilter === 'under50') {
        countQuery = countQuery.where('donations.donation_amount', '<', 50);
      } else if (amountFilter === '50-100') {
        countQuery = countQuery.whereBetween('donations.donation_amount', [50, 100]);
      } else if (amountFilter === '100-500') {
        countQuery = countQuery.whereBetween('donations.donation_amount', [100, 500]);
      } else if (amountFilter === 'over500') {
        countQuery = countQuery.where('donations.donation_amount', '>', 500);
      }
    }
    const [{ count }] = await countQuery.count('* as count');
    const totalPages = Math.ceil(parseInt(count) / limit);

    // Sort by date
    const sortDirection = dateSort === 'asc' ? 'asc' : 'desc';
    const donations = await query
      .orderBy('donations.donation_date', sortDirection)
      .limit(limit)
      .offset(offset);

    res.render('donations/index', {
      title: 'Donations',
      donations,
      search: search || '',
      selectedAmountFilter: amountFilter || '',
      dateSort: sortDirection,
      currentPage: parseInt(page),
      totalPages,
      isManager: req.session.user.role === 'manager' || req.session.user.role === 'admin'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to load donations', error });
  }
});

// View donation details
router.get('/:id', async (req, res) => {
  try {
    const donation = await db('donations')
      .leftJoin('participants', 'donations.participant_email', 'participants.participant_email')
      .where({ 'donations.donation_id': req.params.id })
      .select('donations.*', 'participants.first_name', 'participants.last_name')
      .first();

    if (!donation) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Donation not found',
        error: { status: 404 }
      });
    }

    res.render('donations/detail', {
      title: 'Donation Details',
      donation,
      isManager: req.session.user.role === 'manager' || req.session.user.role === 'admin'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to load donation', error });
  }
});

// Delete donation (Manager only)
router.post('/:id/delete', async (req, res) => {
  if (req.session.user.role !== 'manager' && req.session.user.role !== 'admin') return res.status(403).send('Access denied');
  
  try {
    await db('donations').where({ donation_id: req.params.id }).del();
    res.redirect('/donations?success=Donation deleted');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to delete donation', error });
  }
});

module.exports = router;
