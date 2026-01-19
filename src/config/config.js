require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // File upload settings
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
  maxFileSizeBytes: (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024,
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxStorageMB: parseInt(process.env.MAX_STORAGE_MB, 10) || 1000,
  maxStorageBytes: (parseInt(process.env.MAX_STORAGE_MB, 10) || 1000) * 1024 * 1024,
  
  // File lifecycle settings
  fileRetentionHours: parseInt(process.env.FILE_RETENTION_HOURS, 10) || 24,
  fileRetentionMs: (parseInt(process.env.FILE_RETENTION_HOURS, 10) || 24) * 60 * 60 * 1000,
  cleanupIntervalHours: parseInt(process.env.CLEANUP_INTERVAL_HOURS, 10) || 1,
  cleanupIntervalMs: (parseInt(process.env.CLEANUP_INTERVAL_HOURS, 10) || 1) * 60 * 60 * 1000,
  
  // Security settings
  allowedMimeTypes: process.env.ALLOWED_MIME_TYPES
    ? process.env.ALLOWED_MIME_TYPES.split(',').map(type => type.trim())
    : [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ],
  
  blockedExtensions: process.env.BLOCKED_EXTENSIONS
    ? process.env.BLOCKED_EXTENSIONS.split(',').map(ext => ext.trim().toLowerCase())
    : ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.dll', '.scr', '.jar', '.vbs', '.js', '.app']
};

// Validation
if (config.maxFileSizeMB <= 0 || config.maxFileSizeMB > 5000) {
  throw new Error('MAX_FILE_SIZE_MB must be between 1 and 5000');
}

if (config.fileRetentionHours <= 0) {
  throw new Error('FILE_RETENTION_HOURS must be greater than 0');
}

module.exports = config;
