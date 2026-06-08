import { getActiveEvent } from '../services/eventsService.js'

/**
 * Attaches the active event to req.eventId and req.event for all authenticated routes.
 * LOW-03: Removed @deprecated notice — this middleware is the active production code path.
 * getActiveEvent() is cached (HIGH-03) so this adds negligible overhead per request.
 */
export async function attachEventContext(req, _res, next) {
  try {
    const event = await getActiveEvent()
    req.eventId = event?.id || null
    req.event = event
    next()
  } catch (e) {
    next(e)
  }
}
