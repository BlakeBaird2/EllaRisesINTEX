// ========================================================================
// Participant Routes
// Manages participant data with full CRUD operations
// Common users: view only | Managers: full access
// ========================================================================

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ========================================================================
// GET /participants - List all participants
// ========================================================================
router.get('/', async (req, res) => {
  const { search, page = 1 } = req.query;
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    let query = db('participants').select('*');

    // Search functionality
    if (search) {
      query = query.where(function() {
        this.where('participant_first_name', 'ilike', `%${search}%`)
          .orWhere('participant_last_name', 'ilike', `%${search}%`)
          .orWhere('participant_email', 'ilike', `%${search}%`);
      });
    }

    // Get total count for pagination
    const [{ count }] = await db('participants')
      .count('* as count')
      .where(builder => {
        if (search) {
          builder.where(function() {
            this.where('participant_first_name', 'ilike', `%${search}%`)
              .orWhere('participant_last_name', 'ilike', `%${search}%`)
              .orWhere('participant_email', 'ilike', `%${search}%`);
          });
        }
      });
    const totalPages = Math.ceil(count / limit);

    // Get paginated results
    const participants = await query
      .orderBy('participant_last_name', 'asc')
      .limit(limit)
      .offset(offset);

    res.render('participants/index', {
      title: 'Participants',
      participants,
      search: search || '',
      currentPage: parseInt(page),
      totalPages,
      isManager: req.session.user.role === 'manager' || req.session.user.role === 'admin'
    });

  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load participants',
      error
    });
  }
});

// ========================================================================
// GET /participants/new - Show create participant form (Manager only)
// ========================================================================
router.get('/new', async (req, res) => {
  if (req.session.user.role !== 'manager' && req.session.user.role !== 'admin') {
    return res.status(403).send('Access denied');
  }

  res.render('participants/form', {
    title: 'Add New Participant',
    participant: {},
    action: '/participants',
    method: 'POST',
    isManager: true
  });
});

// ========================================================================
// POST /participants - Create new participant (Manager only)
// ========================================================================
router.post('/', async (req, res) => {
  if (req.session.user.role !== 'manager' && req.session.user.role !== 'admin') {
    return res.status(403).send('Access denied');
  }

  const {
    participant_email,
    first_name,
    last_name,
    date_of_birth,
    gender,
    race_ethnicity,
    high_school,
    intended_college,
    grade_level,
    address_street,
    address_city,
    address_state,
    address_zip,
    phone
  } = req.body;

  try {
    await db('participants').insert({
      participant_email,
      first_name,
      last_name,
      date_of_birth: date_of_birth || null,
      gender: gender || null,
      race_ethnicity: race_ethnicity || null,
      high_school: high_school || null,
      intended_college: intended_college || null,
      grade_level: grade_level || null,
      address_street: address_street || null,
      address_city: address_city || null,
      address_state: address_state || null,
      address_zip: address_zip || null,
      phone: phone || null
    });

    res.redirect('/participants?success=Participant added successfully');

  } catch (error) {
    console.error('Error creating participant:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to create participant',
      error
    });
  }
});

// ========================================================================
// GET /participants/:id - View participant details
// ========================================================================
router.get('/:id', async (req, res) => {
  try {
    const participant = await db('participants')
      .where({ participant_id: req.params.id })
      .first();

    if (!participant) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Participant not found',
        error: { status: 404 }
      });
    }

    // Get participant's milestones
    const milestones = await db('milestones')
      .join('milestone_types', 'milestones.milestone_type_id', 'milestone_types.milestone_type_id')
      .where({ 'milestones.participant_email': participant.participant_email })
      .select('milestones.*', 'milestone_types.milestone_name', 'milestone_types.category');

    // Get participant's events
    const events = await db('registrations')
      .join('event_occurrences', function() {
        this.on('registrations.event_name', 'event_occurrences.event_name')
          .andOn('registrations.event_datetime_start', 'event_occurrences.event_datetime_start');
      })
      .join('event_templates', 'event_occurrences.event_name', 'event_templates.event_name')
      .where({ 'registrations.participant_email': participant.participant_email })
      .select('event_templates.event_name', 'event_occurrences.event_datetime_start', 
              'event_templates.event_type', 'registrations.attendance_status');

    res.render('participants/detail', {
      title: `${participant.first_name} ${participant.last_name}`,
      participant,
      milestones,
      events,
      isManager: req.session.user.role === 'manager' || req.session.user.role === 'admin'
    });

  } catch (error) {
    console.error('Error fetching participant details:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load participant details',
      error
    });
  }
});

// ========================================================================
// GET /participants/:id/edit - Show edit form (Manager only)
// ========================================================================
router.get('/:id/edit', async (req, res) => {
  if (req.session.user.role !== 'manager' && req.session.user.role !== 'admin') {
    return res.status(403).send('Access denied');
  }

  try {
    const participant = await db('participants')
      .where({ participant_id: req.params.id })
      .first();

    if (!participant) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Participant not found',
        error: { status: 404 }
      });
    }

    res.render('participants/form', {
      title: 'Edit Participant',
      participant,
      action: `/participants/${req.params.id}`,
      method: 'POST',
      isManager: true
    });

  } catch (error) {
    console.error('Error fetching participant for edit:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load participant',
      error
    });
  }
});

// ========================================================================
// POST /participants/:id - Update participant (Manager only)
// ========================================================================
router.post('/:id', async (req, res) => {
  if (req.session.user.role !== 'manager' && req.session.user.role !== 'admin') {
    return res.status(403).send('Access denied');
  }

  const {
    first_name,
    last_name,
    date_of_birth,
    gender,
    race_ethnicity,
    high_school,
    intended_college,
    grade_level,
    address_street,
    address_city,
    address_state,
    address_zip,
    phone
  } = req.body;

  try {
    await db('participants')
      .where({ participant_id: req.params.id })
      .update({
        first_name,
        last_name,
        date_of_birth: date_of_birth || null,
        gender: gender || null,
        race_ethnicity: race_ethnicity || null,
        high_school: high_school || null,
        intended_college: intended_college || null,
        grade_level: grade_level || null,
        address_street: address_street || null,
        address_city: address_city || null,
        address_state: address_state || null,
        address_zip: address_zip || null,
        phone: phone || null
      });

    res.redirect(`/participants/${req.params.id}?success=Participant updated successfully`);

  } catch (error) {
    console.error('Error updating participant:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to update participant',
      error
    });
  }
});

// ========================================================================
// POST /participants/:id/delete - Delete participant (Manager only)
// ========================================================================
router.post('/:id/delete', async (req, res) => {
  if (req.session.user.role !== 'manager' && req.session.user.role !== 'admin') {
    return res.status(403).send('Access denied');
  }

  try {
    await db('participants')
      .where({ participant_id: req.params.id })
      .del();

    res.redirect('/participants?success=Participant deleted successfully');

  } catch (error) {
    console.error('Error deleting participant:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to delete participant. They may have related records.',
      error
    });
  }
});

module.exports = router;
