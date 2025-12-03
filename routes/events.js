// ========================================================================
// Event Routes
// Manages event templates and occurrences with full CRUD operations
// Common users: view only | Managers: full access
// ========================================================================

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ========================================================================
// GET /events - List all event templates
// ========================================================================
router.get('/', async (req, res) => {
  const { search, type, dateSort = 'desc', page = 1 } = req.query;
  const limit = 15;
  const offset = (page - 1) * limit;

  try {
    let query = db('events').select('*');

    // Search functionality
    if (search) {
      query = query.where('event_name', 'ilike', `%${search}%`);
    }

    // Filter by type
    if (type) {
      query = query.where('event_type', type);
    }

    // Get total count for pagination
    const [{ count }] = await db('events')
      .count('* as count')
      .where(builder => {
        if (search) {
          builder.where('event_name', 'ilike', `%${search}%`);
        }
        if (type) {
          builder.where('event_type', type);
        }
      });
    const totalPages = Math.ceil(count / limit);

    // Sort by event name (date column may not exist)
    const sortDirection = dateSort === 'asc' ? 'asc' : 'desc';
    const events = await query
      .orderBy('event_name', 'asc')
      .limit(limit)
      .offset(offset);

    // Add created_at field as null if it doesn't exist in database
    events.forEach(e => {
      if (!e.hasOwnProperty('created_at')) {
        e.created_at = null;
      }
    });

    // Get distinct event types for filter
    const eventTypes = await db('events')
      .distinct('event_type')
      .whereNotNull('event_type')
      .orderBy('event_type');

    res.render('events/index', {
      title: 'Events',
      events,
      eventTypes: eventTypes.map(t => t.event_type),
      search: search || '',
      selectedType: type || '',
      dateSort: sortDirection,
      currentPage: parseInt(page),
      totalPages,
      isManager: req.session.user && (req.session.user.role === 'manager' || req.session.user.role === 'admin')
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load events',
      error
    });
  }
});

// ========================================================================
// GET /events/new - Show create event form (Manager only)
// ========================================================================
router.get('/new', async (req, res) => {
  if (req.session.user.role !== 'manager' && req.session.user.role !== 'admin') {
    return res.status(403).send('Access denied');
  }

  res.render('events/form', {
    title: 'Add New Event',
    event: {},
    action: '/events',
    method: 'POST',
    isManager: true
  });
});

// ========================================================================
// POST /events - Create new event template (Manager only)
// ========================================================================
router.post('/', async (req, res) => {
  if (req.session.user.role !== 'manager' && req.session.user.role !== 'admin') {
    return res.status(403).send('Access denied');
  }

  const {
    event_name,
    event_type,
    event_description,
    event_recurrence_pattern,
    event_default_capacity
  } = req.body;

  try {
    await db('events').insert({
      event_name,
      event_type,
      event_description: event_description || null,
      event_recurrence_pattern: event_recurrence_pattern || null,
      event_default_capacity: event_default_capacity ? parseInt(event_default_capacity) : null
    });

    res.redirect('/events?success=Event created successfully');

  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to create event',
      error
    });
  }
});

// ========================================================================
// GET /events/:id - View event details and occurrences
// ========================================================================
router.get('/:id', async (req, res) => {
  try {
    const event = await db('events')
      .where({ event_template_id: req.params.id })
      .first();

    if (!event) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Event not found',
        error: { status: 404 }
      });
    }

    // Get all occurrences for this event
    const occurrences = await db('eventoccurrences')
      .where({ event_template_id: event.event_template_id })
      .orderBy('event_datetime_start', 'desc');

    // Get registration count for each occurrence
    for (let occurrence of occurrences) {
      const [{ count }] = await db('registrations')
        .where({
          event_occurrence_id: occurrence.event_occurrence_id
        })
        .count('* as count');
      occurrence.registration_count = count;
    }

    res.render('events/detail', {
      title: event.event_name,
      event,
      occurrences,
      isManager: req.session.user && (req.session.user.role === 'manager' || req.session.user.role === 'admin')
    });

  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load event details',
      error
    });
  }
});

// ========================================================================
// GET /events/:id/edit - Show edit form (Manager only)
// ========================================================================
router.get('/:id/edit', async (req, res) => {
  if (req.session.user.role !== 'manager' && req.session.user.role !== 'admin') {
    return res.status(403).send('Access denied');
  }

  try {
    const event = await db('events')
      .where({ event_template_id: req.params.id })
      .first();

    if (!event) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Event not found',
        error: { status: 404 }
      });
    }

    res.render('events/form', {
      title: 'Edit Event',
      event,
      action: `/events/${req.params.id}`,
      method: 'POST',
      isManager: true
    });

  } catch (error) {
    console.error('Error fetching event for edit:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load event',
      error
    });
  }
});

// ========================================================================
// POST /events/:id - Update event template (Manager only)
// ========================================================================
router.post('/:id', async (req, res) => {
  if (req.session.user.role !== 'manager' && req.session.user.role !== 'admin') {
    return res.status(403).send('Access denied');
  }

  const {
    event_type,
    event_description,
    event_recurrence_pattern,
    event_default_capacity
  } = req.body;

  try {
    await db('events')
      .where({ event_template_id: req.params.id })
      .update({
        event_type,
        event_description: event_description || null,
        event_recurrence_pattern: event_recurrence_pattern || null,
        event_default_capacity: event_default_capacity ? parseInt(event_default_capacity) : null
      });

    res.redirect(`/events/${req.params.id}?success=Event updated successfully`);

  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to update event',
      error
    });
  }
});

// ========================================================================
// POST /events/:id/delete - Delete event template (Manager only)
// ========================================================================
router.post('/:id/delete', async (req, res) => {
  if (req.session.user.role !== 'manager' && req.session.user.role !== 'admin') {
    return res.status(403).send('Access denied');
  }

  try {
    await db('events')
      .where({ event_template_id: req.params.id })
      .del();

    res.redirect('/events?success=Event deleted successfully');

  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to delete event. It may have related records.',
      error
    });
  }
});

// ========================================================================
// GET /events/:id/occurrences/new - Create new occurrence (Manager only)
// ========================================================================
router.get('/:id/occurrences/new', async (req, res) => {
  if (req.session.user.role !== 'manager' && req.session.user.role !== 'admin') {
    return res.status(403).send('Access denied');
  }

  try {
    const event = await db('events')
      .where({ event_template_id: req.params.id })
      .first();

    if (!event) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Event not found',
        error: { status: 404 }
      });
    }

    res.render('events/occurrence-form', {
      title: `Add Occurrence - ${event.event_name}`,
      event,
      occurrence: {},
      action: `/events/${req.params.id}/occurrences`,
      method: 'POST',
      isManager: true
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load form',
      error
    });
  }
});

// ========================================================================
// POST /events/:id/occurrences - Create event occurrence (Manager only)
// ========================================================================
router.post('/:id/occurrences', async (req, res) => {
  if (req.session.user.role !== 'manager' && req.session.user.role !== 'admin') {
    return res.status(403).send('Access denied');
  }

  const {
    event_datetime_start,
    event_datetime_end,
    event_location,
    event_capacity,
    event_registration_deadline
  } = req.body;

  try {
    await db('eventoccurrences').insert({
      event_template_id: req.params.id,
      event_datetime_start,
      event_datetime_end: event_datetime_end || null,
      event_location: event_location || null,
      event_capacity: event_capacity ? parseInt(event_capacity) : null,
      event_registration_deadline: event_registration_deadline || null
    });

    res.redirect(`/events/${req.params.id}?success=Event occurrence added successfully`);

  } catch (error) {
    console.error('Error creating occurrence:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to create event occurrence',
      error
    });
  }
});

module.exports = router;
