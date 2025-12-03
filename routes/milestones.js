// Milestone Routes - Manages milestone types and participant milestones
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// List all milestones with participant info
router.get('/', async (req, res) => {
  const { search, type, dateSort = 'desc', page = 1 } = req.query;
  const limit = 15;
  const offset = (page - 1) * limit;
  
  try {
    let query = db('milestones')
      .join('participants', 'milestones.participant_id', 'participants.participant_id')
      .join('milestonetypes', 'milestones.milestone_type_id', 'milestonetypes.milestone_type_id')
      .select('milestones.*',
              'participants.participant_first_name as first_name',
              'participants.participant_last_name as last_name',
              'milestonetypes.milestone_title as milestone_name');

    // Search functionality
    if (search) {
      query = query.where(function() {
        this.where('participants.participant_first_name', 'ilike', `%${search}%`)
          .orWhere('participants.participant_last_name', 'ilike', `%${search}%`)
          .orWhere('milestonetypes.milestone_title', 'ilike', `%${search}%`);
      });
    }

    // Filter by milestone type
    if (type) {
      query = query.where('milestonetypes.milestone_title', type);
    }

    // Get total count for pagination
    let countQuery = db('milestones')
      .join('participants', 'milestones.participant_id', 'participants.participant_id')
      .join('milestonetypes', 'milestones.milestone_type_id', 'milestonetypes.milestone_type_id');
    if (search) {
      countQuery = countQuery.where(function() {
        this.where('participants.participant_first_name', 'ilike', `%${search}%`)
          .orWhere('participants.participant_last_name', 'ilike', `%${search}%`)
          .orWhere('milestonetypes.milestone_title', 'ilike', `%${search}%`);
      });
    }
    if (type) {
      countQuery = countQuery.where('milestonetypes.milestone_title', type);
    }
    const [{ count }] = await countQuery.count('* as count');
    const totalPages = Math.ceil(parseInt(count) / limit);

    // Sort by date
    const sortDirection = dateSort === 'asc' ? 'asc' : 'desc';
    const milestones = await query
      .orderBy('milestones.milestone_date', sortDirection)
      .limit(limit)
      .offset(offset);

    // Get distinct milestone types for filter
    let milestoneTypes = [];
    try {
      // Try the table name used in the join first
      const types = await db('milestonetypes')
        .distinct('milestone_title')
        .whereNotNull('milestone_title')
        .orderBy('milestone_title');
      milestoneTypes = types.map(t => t.milestone_title || t.milestone_name || t);
    } catch (err) {
      // Fallback if table name is different
      try {
        const types = await db('milestone_types')
          .distinct('milestone_name')
          .whereNotNull('milestone_name')
          .orderBy('milestone_name');
        milestoneTypes = types.map(t => t.milestone_name || t.milestone_title || t);
      } catch (err2) {
        console.error('Error fetching milestone types:', err2);
        milestoneTypes = [];
      }
    }

    res.render('milestones/index', {
      title: 'Participant Milestones',
      milestones: milestones || [],
      milestoneTypes: milestoneTypes || [],
      search: search || '',
      selectedType: type || '',
      dateSort: sortDirection,
      currentPage: parseInt(page),
      totalPages,
      isManager: req.session.user.role === 'manager' || req.session.user.role === 'admin'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to load milestones', error });
  }
});

// Milestone types management
router.get('/types', async (req, res) => {
  try {
    const types = await db('milestone_types').select('*').orderBy('milestone_name');
    res.render('milestones/types', {
      title: 'Milestone Types',
      types,
      isManager: req.session.user.role === 'manager' || req.session.user.role === 'admin'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to load milestone types', error });
  }
});

// Show add milestone form (Manager only)
router.get('/new', async (req, res) => {
  if (req.session.user.role !== 'manager' && req.session.user.role !== 'admin') {
    return res.status(403).send('Access denied');
  }

  try {
    // Get all participants for dropdown
    const participants = await db('participants')
      .select('participant_id', 'participant_first_name', 'participant_last_name', 'participant_email')
      .orderBy('participant_last_name')
      .orderBy('participant_first_name');

    // Get all milestone types for dropdown
    let milestoneTypes = [];
    try {
      const types = await db('milestonetypes')
        .select('milestone_type_id', 'milestone_title')
        .orderBy('milestone_title');
      milestoneTypes = types;
    } catch (err) {
      try {
        const types = await db('milestone_types')
          .select('milestone_type_id', 'milestone_name')
          .orderBy('milestone_name');
        milestoneTypes = types.map(t => ({
          milestone_type_id: t.milestone_type_id,
          milestone_title: t.milestone_name
        }));
      } catch (err2) {
        console.error('Error fetching milestone types:', err2);
      }
    }

    res.render('milestones/form', {
      title: 'Add New Milestone',
      milestone: {},
      participants,
      milestoneTypes,
      action: '/milestones',
      method: 'POST',
      isManager: true
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to load form', error });
  }
});

// Add milestone to participant (Manager only)
router.post('/', async (req, res) => {
  if (req.session.user.role !== 'manager' && req.session.user.role !== 'admin') return res.status(403).send('Access denied');
  
  try {
    await db('milestones').insert({
      participant_id: req.body.participant_id,
      milestone_type_id: req.body.milestone_type_id,
      milestone_date: req.body.milestone_date || new Date(),
      notes: req.body.notes || null
    });
    res.redirect('/milestones?success=Milestone added');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to add milestone', error });
  }
});

// Delete milestone (Manager only)
router.post('/:id/delete', async (req, res) => {
  if (req.session.user.role !== 'manager' && req.session.user.role !== 'admin') return res.status(403).send('Access denied');
  
  try {
    await db('milestones').where({ milestone_id: req.params.id }).del();
    res.redirect('/milestones?success=Milestone deleted');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', { title: 'Error', message: 'Unable to delete milestone', error });
  }
});

module.exports = router;
