# File Upload Service

A production-ready file upload service built with Node.js, Express, and Multer. Designed for secure, controlled, and temporary file storage with automatic lifecycle management.

## 🔒 Security Features

### File Validation
- **MIME Type Verification**: Validates actual file content using magic bytes, not just the claimed MIME type
- **Extension Blocking**: Blocks dangerous executable file types (.exe, .bat, .sh, .ps1, etc.)
- **Allowed Types Whitelist**: Only accepts explicitly allowed file types
- **Filename Sanitization**: Prevents directory traversal attacks through filename manipulation
- **Size Limits**: Enforces strict file size limits (configurable, default 10MB)

### Storage Protection
- **Storage Quotas**: Prevents storage abuse with configurable maximum storage limits
- **Path Traversal Prevention**: Validates all file IDs to prevent directory traversal
- **No Internal Path Exposure**: Never exposes internal file paths in API responses

## 🔄 File Lifecycle Management

### Automatic Cleanup
- **Time-Based Expiration**: Files automatically expire after configured retention period (default: 24 hours)
- **Scheduled Cleanup Jobs**: Runs periodic cleanup to remove expired files (default: every 1 hour)
- **Orphaned File Detection**: Automatically removes files without metadata and vice versa
- **Manual Cleanup**: Supports on-demand cleanup via dedicated script

### Metadata Management
- Persistent metadata storage in JSON format
- Tracks: original filename, size, MIME type, upload time, expiration time
- Automatic orphaned metadata cleanup
- Synchronization between filesystem and metadata

## 📡 API Endpoints

### Upload File
```http
POST /api/upload
Content-Type: multipart/form-data

Field name: file
```

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "fileId": "document_1234567890_abc123def456.pdf",
    "originalName": "document.pdf",
    "filename": "document_1234567890_abc123def456.pdf",
    "size": 102400,
    "sizeFormatted": "100.00 KB",
    "mimeType": "application/pdf",
    "uploadedAt": "2026-01-19T10:30:00.000Z",
    "expiresAt": "2026-01-20T10:30:00.000Z"
  }
}
```

### List All Files
```http
GET /api/files
```

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "fileId": "document_1234567890_abc123def456.pdf",
        "originalName": "document.pdf",
        "filename": "document_1234567890_abc123def456.pdf",
        "size": 102400,
        "sizeFormatted": "100.00 KB",
        "mimeType": "application/pdf",
        "uploadedAt": "2026-01-19T10:30:00.000Z",
        "expiresAt": "2026-01-20T10:30:00.000Z"
      }
    ],
    "summary": {
      "totalFiles": 1,
      "totalStorage": 102400,
      "totalStorageFormatted": "0.10 MB",
      "maxStorage": "1000 MB",
      "usagePercentage": "0.01%"
    }
  }
}
```

### Get File Metadata
```http
GET /api/files/:fileId
```

### Download File
```http
GET /api/download/:fileId
```

Returns the file with appropriate Content-Type and Content-Disposition headers.

### Delete File
```http
DELETE /api/files/:fileId
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully",
  "data": {
    "fileId": "document_1234567890_abc123def456.pdf",
    "originalName": "document.pdf"
  }
}
```

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-01-19T10:30:00.000Z",
  "storage": {
    "used": "0.10 MB",
    "max": "1000 MB",
    "usagePercentage": "0.01%"
  },
  "files": {
    "count": 1
  },
  "config": {
    "maxFileSize": "10 MB",
    "fileRetention": "24 hours",
    "allowedTypes": 9
  }
}
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn

### Installation Steps

1. **Clone or download the project**

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Copy `.env.example` to `.env` and adjust settings:
```bash
cp .env.example .env
```

**Configuration Options:**
```env
# Server
PORT=3000
NODE_ENV=production

# File Upload
MAX_FILE_SIZE_MB=10           # Maximum file size in MB
UPLOAD_DIR=./uploads          # Upload directory path
MAX_STORAGE_MB=1000           # Maximum total storage in MB

# Lifecycle
FILE_RETENTION_HOURS=24       # How long files are kept
CLEANUP_INTERVAL_HOURS=1      # How often cleanup runs

# Security
ALLOWED_MIME_TYPES=image/jpeg,image/png,application/pdf
BLOCKED_EXTENSIONS=.exe,.bat,.cmd,.sh
```

4. **Start the server**

Production mode:
```bash
npm start
```

Development mode (with auto-reload):
```bash
npm run dev
```

5. **Verify the service is running**
```bash
curl http://localhost:3000/api/health
```

## 🔧 Manual Cleanup

Run the cleanup job manually:
```bash
npm run cleanup
```

This will:
- Delete expired files
- Remove orphaned metadata
- Clean up files without metadata

## 📁 Project Structure

```
file-upload-service/
├── src/
│   ├── config/
│   │   ├── config.js          # Environment configuration
│   │   └── multer.js          # Multer setup and file handling
│   ├── middleware/
│   │   ├── errorHandler.js    # Centralized error handling
│   │   └── security.js        # Security validation middleware
│   ├── models/
│   │   └── FileMetadata.js    # Metadata storage and management
│   ├── routes/
│   │   └── fileRoutes.js      # API route definitions
│   ├── services/
│   │   └── lifecycleService.js # File lifecycle management
│   ├── jobs/
│   │   └── cleanupJob.js      # Manual cleanup script
│   └── server.js              # Main server entry point
├── uploads/                   # File storage directory (created automatically)
├── metadata/                  # Metadata storage (created automatically)
├── .env                       # Environment configuration
├── .env.example              # Example environment configuration
├── .gitignore
├── package.json
└── README.md
```

## 🧪 Testing the API

### Upload a File
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/path/to/your/file.pdf"
```

### List Files
```bash
curl http://localhost:3000/api/files
```

### Download File
```bash
curl http://localhost:3000/api/download/[fileId] \
  --output downloaded-file.pdf
```

### Delete File
```bash
curl -X DELETE http://localhost:3000/api/files/[fileId]
```

## 🛡️ Security Decisions

### Why These Security Measures?

1. **Magic Byte Validation**: Prevents MIME type spoofing where attackers rename malicious executables with safe extensions

2. **Extension Blocking**: Defense-in-depth approach; blocks known dangerous file types even if MIME validation is bypassed

3. **No Authentication**: Designed for internal/controlled use. For production internet-facing deployments, add authentication middleware

4. **Filename Sanitization**: Prevents directory traversal attacks like `../../etc/passwd`

5. **Storage Limits**: Prevents DoS attacks through storage exhaustion

6. **Path Validation**: Ensures file IDs cannot be manipulated to access arbitrary files

### Additional Security Recommendations for Production

1. **Add Authentication**: Implement JWT, API keys, or OAuth
2. **Rate Limiting**: Prevent abuse through excessive requests
3. **HTTPS Only**: Use TLS/SSL for encrypted transport
4. **Input Sanitization**: Additional validation on metadata fields
5. **Logging & Monitoring**: Track uploads, downloads, and suspicious activity
6. **Firewall Rules**: Restrict access to known IP ranges
7. **Virus Scanning**: Integrate ClamAV or similar for malware detection

## ⚠️ Edge Cases Handled

### Upload Interruptions
- Failed uploads are cleaned up automatically
- Partial files are removed if validation fails

### Duplicate Filenames
- Generates unique filenames using timestamp + random hash
- No filename collisions possible

### Unsupported File Types
- Rejected at multer level (fast fail)
- Double-validated by magic byte detection
- File cleaned up if validation fails

### Concurrent Uploads
- Each upload gets unique filename
- Metadata persistence is sequential to prevent race conditions

### Missing Files
- API checks file existence before serving
- Orphaned metadata is automatically cleaned
- Clear error messages for missing files

## 🔄 File Lifecycle Rules

### Automatic Expiration
- Files expire after `FILE_RETENTION_HOURS` (default: 24 hours)
- Expiration time is set at upload
- Expired files are deleted during cleanup cycles

### Cleanup Process
1. Runs every `CLEANUP_INTERVAL_HOURS` (default: 1 hour)
2. Deletes files past expiration time
3. Removes metadata for deleted files
4. Cleans orphaned files without metadata
5. Cleans metadata without corresponding files

### Manual Deletion
- Users can delete files before expiration via DELETE endpoint
- Both file and metadata are removed immediately

## 📊 Monitoring & Maintenance

### Health Checks
- Use `/api/health` endpoint for monitoring
- Returns storage usage, file count, and service configuration
- Integrate with monitoring tools (Prometheus, Datadog, etc.)

### Logs
- All requests are logged with timestamp
- Errors include stack traces in development mode
- Cleanup operations are logged with results

### Backup Recommendations
- Metadata is in `metadata/files.json` - backup regularly if needed
- For critical deployments, consider database instead of JSON file
- Uploaded files in `uploads/` directory - backup based on retention needs

## 🚢 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure appropriate file size and storage limits
- [ ] Set reasonable retention periods
- [ ] Ensure upload directory has proper permissions
- [ ] Set up process manager (PM2, systemd)
- [ ] Configure reverse proxy (nginx, Apache)
- [ ] Enable HTTPS
- [ ] Add authentication if internet-facing
- [ ] Set up monitoring and alerting
- [ ] Configure log rotation
- [ ] Test backup and recovery procedures

### Using PM2
```bash
npm install -g pm2
pm2 start src/server.js --name file-upload-service
pm2 startup
pm2 save
```

### Using systemd
Create `/etc/systemd/system/file-upload.service`:
```ini
[Unit]
Description=File Upload Service
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/path/to/file-upload-service
ExecStart=/usr/bin/node src/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable file-upload
sudo systemctl start file-upload
```

### Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 10M;
    }
}
```

## 🐛 Troubleshooting

### "Storage limit exceeded"
- Check current usage via `/api/health`
- Run manual cleanup: `npm run cleanup`
- Adjust `MAX_STORAGE_MB` in `.env`

### "File type not allowed"
- Verify file MIME type matches allowed list
- Check `ALLOWED_MIME_TYPES` in `.env`
- Ensure file extension isn't in blocked list

### Files not being cleaned up
- Check if lifecycle service is running (logs on startup)
- Verify `FILE_RETENTION_HOURS` is set correctly
- Run manual cleanup to test: `npm run cleanup`

### "EACCES: permission denied"
- Ensure upload directory has write permissions
- Check Node.js process user has appropriate rights

## 📝 License

MIT

## 🤝 Contributing

This is a production-ready template. Customize based on your specific requirements:
- Add authentication layer
- Integrate with cloud storage (S3, Azure Blob)
- Add virus scanning
- Implement database for metadata
- Add rate limiting
- Enhance logging and monitoring

---

**Built for production use. Deploy with confidence.**
