const express = require('express');
const config = require('./config/config');
const fileRoutes = require('./routes/fileRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const metadataStore = require('./models/FileMetadata');
const lifecycleService = require('./services/lifecycleService');
const { ensureUploadDir } = require('./config/multer');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api', fileRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'File Upload Service',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      upload: 'POST /api/upload',
      listFiles: 'GET /api/files',
      getFile: 'GET /api/files/:fileId',
      downloadFile: 'GET /api/download/:fileId',
      deleteFile: 'DELETE /api/files/:fileId',
      health: 'GET /api/health'
    },
    documentation: 'See README.md for detailed API documentation'
  });
});

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize and start server
const startServer = async () => {
  try {
    console.log('='.repeat(60));
    console.log('File Upload Service');
    console.log('='.repeat(60));

    // Ensure upload directory exists
    console.log('Initializing upload directory...');
    await ensureUploadDir();

    // Initialize metadata store
    console.log('Initializing metadata store...');
    await metadataStore.initialize();

    // Start lifecycle service
    console.log('Starting file lifecycle service...');
    lifecycleService.start();

    // Start Express server
    app.listen(config.port, () => {
      console.log('='.repeat(60));
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`Max file size: ${config.maxFileSizeMB} MB`);
      console.log(`Max storage: ${config.maxStorageMB} MB`);
      console.log(`File retention: ${config.fileRetentionHours} hours`);
      console.log(`Cleanup interval: ${config.cleanupIntervalHours} hours`);
      console.log('='.repeat(60));
      console.log(`API available at: http://localhost:${config.port}/api`);
      console.log(`Health check: http://localhost:${config.port}/api/health`);
      console.log('='.repeat(60));
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down gracefully...');
  
  // Stop lifecycle service
  lifecycleService.stop();
  
  console.log('Server stopped');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
startServer();

module.exports = app;
