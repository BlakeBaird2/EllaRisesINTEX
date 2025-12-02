// Donation Routes - Manages donations
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// List all donations
router.get('/', async (req, res) => {
  try {
    const donations = await db('donations')
      .leftJoin('participants', 'donations.participant_email', 'participants.participant_email')
      .select('donations.*', 'participants.first_name', 'participants.last_name')
      .orderBy('donations.donation_date', 'desc')
      .limit(100);

    res.render('donations/index', {
      title: 'Donations',
      donations,
      isManager: req.session.user.role === 'manager'
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
      isManager: req.session.user.role === 'manager'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to load donation', error });
  }
});

// Delete donation (Manager only)
router.post('/:id/delete', async (req, res) => {
  if (req.session.user.role !== 'manager') return res.status(403).send('Access denied');
  
  try {
    await db('donations').where({ donation_id: req.params.id }).del();
    res.redirect('/donations?success=Donation deleted');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to delete donation', error });
  }
});

module.exports = router;
