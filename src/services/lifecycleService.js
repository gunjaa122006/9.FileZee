const fs = require('fs').promises;
const metadataStore = require('../models/FileMetadata');
const config = require('../config/config');

class FileLifecycleService {
  constructor() {
    this.cleanupTimer = null;
    this.isRunning = false;
  }

  /**
   * Start the automatic cleanup service
   */
  start() {
    if (this.isRunning) {
      console.log('[Lifecycle] Cleanup service is already running');
      return;
    }

    console.log('[Lifecycle] Starting automatic cleanup service');
    console.log(`[Lifecycle] Cleanup interval: ${config.cleanupIntervalHours} hours`);
    console.log(`[Lifecycle] File retention: ${config.fileRetentionHours} hours`);

    // Run cleanup immediately on start
    this.runCleanup();

    // Schedule periodic cleanup
    this.cleanupTimer = setInterval(
      () => this.runCleanup(),
      config.cleanupIntervalMs
    );

    this.isRunning = true;
  }

  /**
   * Stop the automatic cleanup service
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('[Lifecycle] Stopping automatic cleanup service');
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.isRunning = false;
  }

  /**
   * Run cleanup process
   */
  async runCleanup() {
    console.log(`[Lifecycle] Running cleanup at ${new Date().toISOString()}`);

    try {
      // Initialize metadata store if not already done
      await metadataStore.initialize();

      // Clean up expired files
      const expiredCount = await this.cleanupExpiredFiles();

      // Clean up orphaned metadata
      const orphanedCount = await this.cleanupOrphanedMetadata();

      // Clean up orphaned files (files without metadata)
      const orphanedFilesCount = await this.cleanupOrphanedFiles();

      console.log('[Lifecycle] Cleanup completed:', {
        expiredFiles: expiredCount,
        orphanedMetadata: orphanedCount,
        orphanedFiles: orphanedFilesCount,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        expiredFiles: expiredCount,
        orphanedMetadata: orphanedCount,
        orphanedFiles: orphanedFilesCount
      };
    } catch (error) {
      console.error('[Lifecycle] Cleanup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete expired files and their metadata
   */
  async cleanupExpiredFiles() {
    const expiredFiles = await metadataStore.getExpiredFiles();
    let deletedCount = 0;

    for (const file of expiredFiles) {
      try {
        // Delete physical file
        try {
          await fs.unlink(file.path);
          console.log(`[Lifecycle] Deleted expired file: ${file.filename}`);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.error(`[Lifecycle] Failed to delete file ${file.filename}:`, error.message);
          }
        }

        // Delete metadata
        await metadataStore.deleteFile(file.id);
        deletedCount++;
      } catch (error) {
        console.error(`[Lifecycle] Error cleaning up file ${file.filename}:`, error.message);
      }
    }

    return deletedCount;
  }

  /**
   * Clean up metadata for files that no longer exist
   */
  async cleanupOrphanedMetadata() {
    return await metadataStore.cleanOrphanedMetadata();
  }

  /**
   * Clean up files that exist on disk but have no metadata
   */
  async cleanupOrphanedFiles() {
    try {
      // Get all files in upload directory
      const files = await fs.readdir(config.uploadDir);
      
      // Get all file IDs from metadata
      const allMetadata = await metadataStore.getAllFiles();
      const knownFileIds = new Set(allMetadata.map(m => m.filename));

      let deletedCount = 0;

      for (const filename of files) {
        // Skip .gitkeep and hidden files
        if (filename === '.gitkeep' || filename.startsWith('.')) {
          continue;
        }

        // If file has no metadata, delete it
        if (!knownFileIds.has(filename)) {
          try {
            const filePath = require('path').join(config.uploadDir, filename);
            await fs.unlink(filePath);
            console.log(`[Lifecycle] Deleted orphaned file: ${filename}`);
            deletedCount++;
          } catch (error) {
            console.error(`[Lifecycle] Failed to delete orphaned file ${filename}:`, error.message);
          }
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('[Lifecycle] Error cleaning orphaned files:', error.message);
      return 0;
    }
  }

  /**
   * Get cleanup service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      cleanupInterval: `${config.cleanupIntervalHours} hours`,
      fileRetention: `${config.fileRetentionHours} hours`
    };
  }
}

// Singleton instance
const lifecycleService = new FileLifecycleService();

module.exports = lifecycleService;
