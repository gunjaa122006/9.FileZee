const path = require('path');
const FileType = require('file-type');
const fs = require('fs').promises;
const config = require('../config/config');

/**
 * Validates file MIME type by checking actual file content
 * This prevents MIME type spoofing attacks
 */
const validateFileMimeType = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    // Read file buffer to detect actual MIME type
    const fileBuffer = await fs.readFile(req.file.path);
    const detectedType = await FileType.fromBuffer(fileBuffer);

    // If file type is detected and doesn't match claimed MIME type
    if (detectedType) {
      if (detectedType.mime !== req.file.mimetype) {
        // Delete the uploaded file
        await fs.unlink(req.file.path);
        
        return res.status(400).json({
          success: false,
          error: 'File MIME type mismatch detected. Possible file spoofing attempt.',
          details: {
            claimed: req.file.mimetype,
            actual: detectedType.mime
          }
        });
      }

      // Verify detected MIME type is in allowed list
      if (!config.allowedMimeTypes.includes(detectedType.mime)) {
        await fs.unlink(req.file.path);
        
        return res.status(400).json({
          success: false,
          error: `Actual file type ${detectedType.mime} is not allowed`
        });
      }
    }

    next();
  } catch (error) {
    // If validation fails, clean up the file
    try {
      await fs.unlink(req.file.path);
    } catch {}

    return res.status(500).json({
      success: false,
      error: 'Failed to validate file type',
      details: error.message
    });
  }
};

/**
 * Validates filename to prevent directory traversal attacks
 */
const sanitizeFilename = (filename) => {
  // Remove any path separators and parent directory references
  const sanitized = path.basename(filename)
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '');

  if (!sanitized || sanitized.length === 0) {
    throw new Error('Invalid filename');
  }

  return sanitized;
};

/**
 * Checks if storage limit would be exceeded
 */
const checkStorageLimit = (metadataStore) => {
  return async (req, res, next) => {
    try {
      const currentUsage = await metadataStore.getTotalStorageUsed();
      const incomingSize = req.file ? req.file.size : 0;

      if (currentUsage + incomingSize > config.maxStorageBytes) {
        // Delete the uploaded file
        if (req.file) {
          await fs.unlink(req.file.path);
        }

        return res.status(507).json({
          success: false,
          error: 'Storage limit exceeded',
          details: {
            currentUsage: `${(currentUsage / 1024 / 1024).toFixed(2)} MB`,
            maxStorage: `${config.maxStorageMB} MB`,
            incomingSize: `${(incomingSize / 1024 / 1024).toFixed(2)} MB`
          }
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to check storage limit',
        details: error.message
      });
    }
  };
};

/**
 * Validates file ID parameter to prevent path traversal
 */
const validateFileId = (req, res, next) => {
  const { fileId } = req.params;

  if (!fileId || typeof fileId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid file ID'
    });
  }

  try {
    // Sanitize the file ID
    req.params.fileId = sanitizeFilename(fileId);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file ID format',
      details: error.message
    });
  }
};

module.exports = {
  validateFileMimeType,
  sanitizeFilename,
  checkStorageLimit,
  validateFileId
};
