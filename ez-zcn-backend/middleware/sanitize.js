// ============================================
// PennyWise — Input Sanitization Middleware
//
// SQL injection pattern stripper for all inputs.
// Works on req.body, req.query, and req.params.
//
// Note: This is a defense-in-depth layer on top
// of parameterized queries ($1, $2). It does NOT
// replace parameterized queries — it complements them.
// ============================================

// Dangerous patterns to strip from string values
const SQL_INJECTION_PATTERNS = [
  /(\b)(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE|UNION|TRUNCATE|GRANT|REVOKE)\b.*\b(FROM|INTO|TABLE|WHERE|SET|VALUES|DATABASE|SCHEMA)\b/gi,
  /(--)|(\/\*[\s\S]*?\*\/)/g,              // SQL comments
  /;\s*(DROP|DELETE|ALTER|TRUNCATE|EXEC)/gi, // chained destructive statements
  /(\b)(xp_|sp_|0x[0-9a-f]+)/gi,          // stored procedures and hex
  /'\s*(OR|AND)\s+'?\d/gi,                 // classic ' OR '1'='1
];

/**
 * Recursively sanitize all string values in an object
 */
function sanitizeValue(val) {
  if (typeof val === 'string') {
    let cleaned = val;
    for (const pattern of SQL_INJECTION_PATTERNS) {
      // Reset regex lastIndex (since we use /g flag)
      pattern.lastIndex = 0;
      cleaned = cleaned.replace(pattern, '');
    }
    return cleaned.trim();
  }

  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }

  if (val !== null && typeof val === 'object') {
    return sanitizeObject(val);
  }

  return val;
}

function sanitizeObject(obj) {
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    cleaned[key] = sanitizeValue(value);
  }
  return cleaned;
}

/**
 * Express middleware — sanitizes req.body, req.query, req.params
 */
function sanitizeInputs(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
}

module.exports = { sanitizeInputs };
