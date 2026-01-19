const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');

const METADATA_DIR = path.join(__dirname, '../../metadata');
const METADATA_FILE = path.join(METADATA_DIR, 'files.json');

class FileMetadataStore {
  constructor() {
    this.metadata = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Ensure metadata directory exists
      await fs.mkdir(METADATA_DIR, { recursive: true });

      // Load existing metadata
      try {
        const data = await fs.readFile(METADATA_FILE, 'utf8');
        const records = JSON.parse(data);
        
        // Convert array to Map
        records.forEach(record => {
          this.metadata.set(record.id, record);
        });
      } catch (error) {
        // File doesn't exist yet - start with empty metadata
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize metadata store: ${error.message}`);
    }
  }

  async persist() {
    try {
      const records = Array.from(this.metadata.values());
      await fs.writeFile(
        METADATA_FILE,
        JSON.stringify(records, null, 2),
        'utf8'
      );
    } catch (error) {
      throw new Error(`Failed to persist metadata: ${error.message}`);
    }
  }

  async addFile(fileData) {
    if (!this.initialized) {
      await this.initialize();
    }

    const record = {
      id: fileData.filename, // Use unique filename as ID
      originalName: fileData.originalname,
      filename: fileData.filename,
      mimeType: fileData.mimetype,
      size: fileData.size,
      path: fileData.path,
      uploadedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + config.fileRetentionMs).toISOString()
    };

    this.metadata.set(record.id, record);
    await this.persist();

    return record;
  }

  async getFile(fileId) {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.metadata.get(fileId);
  }

  async getAllFiles() {
    if (!this.initialized) {
      await this.initialize();
    }

    return Array.from(this.metadata.values());
  }

  async deleteFile(fileId) {
    if (!this.initialized) {
      await this.initialize();
    }

    const record = this.metadata.get(fileId);
    if (!record) {
      return null;
    }

    this.metadata.delete(fileId);
    await this.persist();

    return record;
  }

  async getExpiredFiles() {
    if (!this.initialized) {
      await this.initialize();
    }

    const now = new Date();
    const expired = [];

    for (const record of this.metadata.values()) {
      const expirationDate = new Date(record.expiresAt);
      if (expirationDate <= now) {
        expired.push(record);
      }
    }

    return expired;
  }

  async getTotalStorageUsed() {
    if (!this.initialized) {
      await this.initialize();
    }

    let total = 0;
    for (const record of this.metadata.values()) {
      total += record.size;
    }

    return total;
  }

  async cleanOrphanedMetadata() {
    if (!this.initialized) {
      await this.initialize();
    }

    const orphaned = [];

    for (const record of this.metadata.values()) {
      try {
        await fs.access(record.path);
      } catch {
        // File doesn't exist - metadata is orphaned
        orphaned.push(record.id);
      }
    }

    // Remove orphaned metadata
    for (const id of orphaned) {
      this.metadata.delete(id);
    }

    if (orphaned.length > 0) {
      await this.persist();
    }

    return orphaned.length;
  }
}

// Singleton instance
const metadataStore = new FileMetadataStore();

module.exports = metadataStore;
