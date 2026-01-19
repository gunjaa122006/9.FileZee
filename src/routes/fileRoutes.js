const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { upload } = require('../config/multer');
const metadataStore = require('../models/FileMetadata');
const {
  validateFileMimeType,
  checkStorageLimit,
  validateFileId
} = require('../middleware/security');
const config = require('../config/config');

/**
 * @route   POST /api/upload
 * @desc    Upload a file
 * @access  Public (assumed internal use)
 */
router.post('/upload',
  upload.single('file'),
  checkStorageLimit(metadataStore),
  validateFileMimeType,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
          details: 'Use "file" as the field name in your multipart/form-data request'
        });
      }

      // Store metadata
      const metadata = await metadataStore.addFile(req.file);

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          fileId: metadata.id,
          originalName: metadata.originalName,
          filename: metadata.filename,
          size: metadata.size,
          sizeFormatted: `${(metadata.size / 1024).toFixed(2)} KB`,
          mimeType: metadata.mimeType,
          uploadedAt: metadata.uploadedAt,
          expiresAt: metadata.expiresAt
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/files
 * @desc    List all uploaded files
 * @access  Public (assumed internal use)
 */
router.get('/files', async (req, res, next) => {
  try {
    const files = await metadataStore.getAllFiles();
    const totalStorage = await metadataStore.getTotalStorageUsed();

    // Sort by upload date (newest first)
    files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({
      success: true,
      data: {
        files: files.map(file => ({
          fileId: file.id,
          originalName: file.originalName,
          filename: file.filename,
          size: file.size,
          sizeFormatted: `${(file.size / 1024).toFixed(2)} KB`,
          mimeType: file.mimeType,
          uploadedAt: file.uploadedAt,
          expiresAt: file.expiresAt
        })),
        summary: {
          totalFiles: files.length,
          totalStorage: totalStorage,
          totalStorageFormatted: `${(totalStorage / 1024 / 1024).toFixed(2)} MB`,
          maxStorage: `${config.maxStorageMB} MB`,
          usagePercentage: `${((totalStorage / config.maxStorageBytes) * 100).toFixed(2)}%`
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/files/:fileId
 * @desc    Get file metadata
 * @access  Public (assumed internal use)
 */
router.get('/files/:fileId', validateFileId, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const file = await metadataStore.getFile(fileId);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Check if file still exists on disk
    try {
      await fs.access(file.path);
    } catch {
      // File exists in metadata but not on disk - clean up metadata
      await metadataStore.deleteFile(fileId);
      
      return res.status(404).json({
        success: false,
        error: 'File not found on disk',
        details: 'Metadata has been cleaned up'
      });
    }

    res.json({
      success: true,
      data: {
        fileId: file.id,
        originalName: file.originalName,
        filename: file.filename,
        size: file.size,
        sizeFormatted: `${(file.size / 1024).toFixed(2)} KB`,
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
        expiresAt: file.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/download/:fileId
 * @desc    Download a file
 * @access  Public (assumed internal use)
 */
router.get('/download/:fileId', validateFileId, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const file = await metadataStore.getFile(fileId);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Verify file exists on disk
    try {
      await fs.access(file.path);
    } catch {
      // Clean up orphaned metadata
      await metadataStore.deleteFile(fileId);
      
      return res.status(404).json({
        success: false,
        error: 'File not found on disk'
      });
    }

    // Set appropriate headers for download
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Length', file.size);

    // Stream the file
    const fileStream = require('fs').createReadStream(file.path);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      next(error);
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/files/:fileId
 * @desc    Delete a file
 * @access  Public (assumed internal use)
 */
router.delete('/files/:fileId', validateFileId, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const file = await metadataStore.getFile(fileId);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Delete physical file
    try {
      await fs.unlink(file.path);
    } catch (error) {
      // File doesn't exist on disk - continue to delete metadata
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Delete metadata
    await metadataStore.deleteFile(fileId);

    res.json({
      success: true,
      message: 'File deleted successfully',
      data: {
        fileId: file.id,
        originalName: file.originalName
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    const totalStorage = await metadataStore.getTotalStorageUsed();
    const files = await metadataStore.getAllFiles();

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      storage: {
        used: `${(totalStorage / 1024 / 1024).toFixed(2)} MB`,
        max: `${config.maxStorageMB} MB`,
        usagePercentage: `${((totalStorage / config.maxStorageBytes) * 100).toFixed(2)}%`
      },
      files: {
        count: files.length
      },
      config: {
        maxFileSize: `${config.maxFileSizeMB} MB`,
        fileRetention: `${config.fileRetentionHours} hours`,
        allowedTypes: config.allowedMimeTypes.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router;
