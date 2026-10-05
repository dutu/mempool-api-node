export const requireOptions = function requireOptions(options) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('Options must be an object')
  }

  return options
}

export const requireString = function requireString(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string`)
  }

  return value
}

export const encodeSegment = function encodeSegment(value, name) {
  requireString(value, name)

  if (value === '.' || value === '..') {
    throw new TypeError(`${name} cannot be a URL dot segment`)
  }

  try {
    return encodeURIComponent(value)
  } catch (cause) {
    throw new TypeError(`${name} must contain valid Unicode`, { cause })
  }
}

export const requireInteger = function requireInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative safe integer`)
  }

  return value
}

export const createBaseUrl = function createBaseUrl(value) {
  requireString(value, 'url')
  const url = new URL(value)

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new TypeError('url must use HTTP or HTTPS')
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new TypeError('url cannot contain credentials, a query or a fragment')
  }

  url.pathname = `${url.pathname.replace(/\/+$/u, '')}/`
  return url.href
}

export const createHeaders = function createHeaders(values = {}) {
  requireOptions(values)
  if (![Object.prototype, null].includes(Object.getPrototypeOf(values))) {
    throw new TypeError('headers must be an object containing header names and string values')
  }
  const headers = new Headers()

  for (const [name, value] of Object.entries(values)) {
    if (typeof value !== 'string') {
      throw new TypeError(`Header ${name} must be a string`)
    }

    headers.set(name, value)
  }

  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  return headers
}

export const optionalStringSegment = function optionalStringSegment(value, name) {
  return value === undefined ? '' : `/${encodeSegment(value, name)}`
}

export const optionalIntegerSegment = function optionalIntegerSegment(value, name) {
  return value === undefined ? '' : `/${requireInteger(value, name)}`
}

export const requireStringArray = function requireStringArray(value, name) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty array of non-empty strings`)
  }
  for (const item of value) requireString(item, name)
  return value
}
