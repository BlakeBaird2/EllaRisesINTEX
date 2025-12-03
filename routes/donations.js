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
    // Trim search query to handle leading/trailing spaces
    const trimmedSearch = (search && typeof search === 'string') ? search.trim() : '';

    let query = db('donations')
      .leftJoin('participants', 'donations.participant_id', 'participants.participant_id')
      .select('donations.donation_id',
              'donations.donation_date',
              'donations.donation_amount',
              'participants.participant_first_name as first_name',
              'participants.participant_last_name as last_name');

    // Search functionality - supports searching by participant first name, last name, or full name
    if (trimmedSearch) {
      query = query.where(function() {
        this.where('participants.participant_first_name', 'ilike', `%${trimmedSearch}%`)
          .orWhere('participants.participant_last_name', 'ilike', `%${trimmedSearch}%`)
          .orWhereRaw(`COALESCE(participants.participant_first_name, '') || ' ' || COALESCE(participants.participant_last_name, '') ILIKE ?`, [`%${trimmedSearch}%`]);
      });
    }

    // Filter by amount
    if (amountFilter) {
      if (amountFilter === 'under25') {
        query = query.where('donations.donation_amount', '<', 25);
      } else if (amountFilter === '25-50') {
        query = query.whereBetween('donations.donation_amount', [25, 50]);
      } else if (amountFilter === '50-100') {
        query = query.whereBetween('donations.donation_amount', [50, 100]);
      } else if (amountFilter === '100-250') {
        query = query.whereBetween('donations.donation_amount', [100, 250]);
      } else if (amountFilter === '250-500') {
        query = query.whereBetween('donations.donation_amount', [250, 500]);
      } else if (amountFilter === '500-1000') {
        query = query.whereBetween('donations.donation_amount', [500, 1000]);
      } else if (amountFilter === 'over1000') {
        query = query.where('donations.donation_amount', '>', 1000);
      }
    }

    // Get total count for pagination
    let countQuery = db('donations').leftJoin('participants', 'donations.participant_id', 'participants.participant_id');
    if (trimmedSearch) {
      countQuery = countQuery.where(function() {
        this.where('participants.participant_first_name', 'ilike', `%${trimmedSearch}%`)
          .orWhere('participants.participant_last_name', 'ilike', `%${trimmedSearch}%`)
          .orWhereRaw(`COALESCE(participants.participant_first_name, '') || ' ' || COALESCE(participants.participant_last_name, '') ILIKE ?`, [`%${trimmedSearch}%`]);
      });
    }
    if (amountFilter) {
      if (amountFilter === 'under25') {
        countQuery = countQuery.where('donations.donation_amount', '<', 25);
      } else if (amountFilter === '25-50') {
        countQuery = countQuery.whereBetween('donations.donation_amount', [25, 50]);
      } else if (amountFilter === '50-100') {
        countQuery = countQuery.whereBetween('donations.donation_amount', [50, 100]);
      } else if (amountFilter === '100-250') {
        countQuery = countQuery.whereBetween('donations.donation_amount', [100, 250]);
      } else if (amountFilter === '250-500') {
        countQuery = countQuery.whereBetween('donations.donation_amount', [250, 500]);
      } else if (amountFilter === '500-1000') {
        countQuery = countQuery.whereBetween('donations.donation_amount', [500, 1000]);
      } else if (amountFilter === 'over1000') {
        countQuery = countQuery.where('donations.donation_amount', '>', 1000);
      }
    }
    const [{ count }] = await countQuery.count('* as count');
    const totalPages = Math.ceil(parseInt(count) / limit);

    // Sort by date - put UNKNOWN_DATE and NULL dates at the end, then sort valid dates
    const sortDirection = dateSort === 'asc' ? 'asc' : 'desc';
    const donations = await query
      .orderByRaw(`CASE WHEN donations.donation_date = 'UNKNOWN_DATE' OR donations.donation_date IS NULL THEN 1 ELSE 0 END`)
      .orderBy('donations.donation_date', sortDirection)
      .limit(limit)
      .offset(offset);

    res.render('donations/index', {
      title: 'Donations',
      donations,
      search: trimmedSearch || '',
      selectedAmountFilter: amountFilter || '',
      dateSort: sortDirection,
      currentPage: parseInt(page),
      totalPages,
      isManager: req.session.user.role === 'manager' || req.session.user.role === 'admin'
    });
  } catch (error) {
    console.error('Error loading donations:', error);
    console.error('Error stack:', error.stack);
    res.status(500).render('error', { 
      title: 'Error', 
      message: 'Unable to load donations', 
      error: process.env.NODE_ENV === 'development' ? error : { message: error.message }
    });
  }
});

// View donation details
router.get('/:id', async (req, res) => {
  try {
    const donation = await db('donations')
      .leftJoin('participants', 'donations.participant_id', 'participants.participant_id')
      .where({ 'donations.donation_id': req.params.id })
      .select('donations.donation_id',
              'donations.donation_date',
              'donations.donation_amount',
              'participants.participant_first_name as first_name',
              'participants.participant_last_name as last_name')
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
