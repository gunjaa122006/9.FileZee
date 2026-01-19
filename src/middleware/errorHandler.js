/**
 * Centralized error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('[Error]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Multer-specific errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File size exceeds the maximum allowed limit',
      details: {
        maxSize: `${process.env.MAX_FILE_SIZE_MB || 10} MB`
      }
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      error: 'Too many files uploaded at once',
      details: 'Only one file per upload is allowed'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected field name in upload',
      details: 'Use "file" as the field name for uploads'
    });
  }

  // Handle Multer errors from fileFilter
  if (err.message && err.message.includes('not allowed')) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  // File system errors
  if (err.code === 'ENOENT') {
    return res.status(404).json({
      success: false,
      error: 'File not found'
    });
  }

  if (err.code === 'EACCES' || err.code === 'EPERM') {
    return res.status(500).json({
      success: false,
      error: 'Permission denied accessing file'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.url
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
