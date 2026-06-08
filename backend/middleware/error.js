export function notFound(req, res) {
  res.status(404).json({ error: 'Not found', path: req.path })
}

export function errorHandler(err, _req, res, _next) {
  const raw = err.status
  const status =
    typeof raw === 'number' && Number.isInteger(raw) && raw >= 400 && raw < 600 ? raw : 500
  const isProd = process.env.NODE_ENV === 'production'
  const clientSafe = status < 500 || err.expose === true
  const message = clientSafe
    ? err.message || 'Request failed'
    : isProd
      ? 'Something went wrong'
      : err.message || 'Server error'

  // LOW-01: Structured log — suppress stack trace in production to avoid
  // leaking internal file paths and module names to log aggregators.
  if (isProd) {
    console.error(JSON.stringify({
      level: 'error',
      status,
      message: err.message || 'Unknown error',
      code: err.code || undefined,
    }))
  } else {
    console.error(err)
  }

  res.status(status).json({ error: message })
}
