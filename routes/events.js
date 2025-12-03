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
    // Trim search query to handle leading/trailing spaces
    const trimmedSearch = search ? search.trim() : '';

    let query = db('events').select('*');

    // Search functionality
    if (trimmedSearch) {
      query = query.where('event_name', 'ilike', `%${trimmedSearch}%`);
    }

    // Filter by type
    if (type) {
      query = query.where('event_type', type);
    }

    // Get total count for pagination
    const [{ count }] = await db('events')
      .count('* as count')
      .where(builder => {
        if (trimmedSearch) {
          builder.where('event_name', 'ilike', `%${trimmedSearch}%`);
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
      search: trimmedSearch || '',
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
// GET /events/:id - Redirect to events list (detail page removed)
// ========================================================================
router.get('/:id', async (req, res) => {
  // Redirect to events list - detail/occurrences page removed
  // This prevents any access to event detail/occurrence pages
  return res.redirect('/events');
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
    const updated = await db('events')
      .where({ event_template_id: req.params.id })
      .update({
        event_type,
        event_description: event_description || null,
        event_recurrence_pattern: event_recurrence_pattern || null,
        event_default_capacity: event_default_capacity ? parseInt(event_default_capacity) : null
      });

    if (updated === 0) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Event not found',
        error: { status: 404 }
      });
    }

    // Always redirect to events list page
    return res.redirect('/events?success=Event updated successfully');

  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to update event. Please try again.',
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
// Event occurrence creation routes removed - users return to events list
// ========================================================================

module.exports = router;
