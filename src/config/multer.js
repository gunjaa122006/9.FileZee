const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const config = require('../config/config');

// Ensure upload directory exists
const ensureUploadDir = async () => {
  try {
    await fs.access(config.uploadDir);
  } catch {
    await fs.mkdir(config.uploadDir, { recursive: true });
  }
};

// Generate unique filename
const generateUniqueFilename = (originalname) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalname);
  const basename = path.basename(originalname, ext);
  
  // Sanitize basename - remove dangerous characters
  const sanitizedBasename = basename
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50);
  
  return `${sanitizedBasename}_${timestamp}_${randomString}${ext}`;
};

// Configure Multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureUploadDir();
      cb(null, config.uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      const uniqueFilename = generateUniqueFilename(file.originalname);
      cb(null, uniqueFilename);
    } catch (error) {
      cb(error);
    }
  }
});

// File filter for basic validation
const fileFilter = (req, file, cb) => {
  // Check file extension against blocked list
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (config.blockedExtensions.includes(ext)) {
    return cb(
      new Error(`File type ${ext} is not allowed for security reasons`),
      false
    );
  }
  
  // Check MIME type against allowed list
  if (!config.allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new Error(`MIME type ${file.mimetype} is not allowed`),
      false
    );
  }
  
  cb(null, true);
};

// Configure Multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.maxFileSizeBytes,
    files: 1 // Only allow one file per upload
  },
  fileFilter: fileFilter
});

module.exports = {
  upload,
  generateUniqueFilename,
  ensureUploadDir
};
