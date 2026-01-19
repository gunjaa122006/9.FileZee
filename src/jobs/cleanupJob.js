#!/usr/bin/env node

/**
 * Manual cleanup job
 * Run this script to manually trigger file cleanup
 * Usage: node src/jobs/cleanupJob.js
 */

const lifecycleService = require('../services/lifecycleService');

console.log('='.repeat(60));
console.log('File Upload Service - Manual Cleanup Job');
console.log('='.repeat(60));
console.log(`Started at: ${new Date().toISOString()}\n`);

lifecycleService.runCleanup()
  .then((result) => {
    console.log('\n' + '='.repeat(60));
    console.log('Cleanup Results:');
    console.log('='.repeat(60));
    
    if (result.success) {
      console.log(`✓ Expired files deleted: ${result.expiredFiles}`);
      console.log(`✓ Orphaned metadata cleaned: ${result.orphanedMetadata}`);
      console.log(`✓ Orphaned files removed: ${result.orphanedFiles}`);
      console.log('\nCleanup completed successfully!');
      process.exit(0);
    } else {
      console.error(`✗ Cleanup failed: ${result.error}`);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n' + '='.repeat(60));
    console.error('Fatal Error:');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  });
