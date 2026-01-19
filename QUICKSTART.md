# Quick Start Guide

Get the File Upload Service running in 5 minutes.

## Prerequisites

- Node.js >= 18.0.0
- npm (comes with Node.js)

## Installation

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `express` - Web framework
- `multer` - File upload handling
- `file-type` - MIME type detection
- `dotenv` - Environment variable management

### 2. Configure Environment

The `.env` file is already created with sensible defaults. Review and adjust if needed:

```env
PORT=3000
MAX_FILE_SIZE_MB=10
MAX_STORAGE_MB=1000
FILE_RETENTION_HOURS=24
CLEANUP_INTERVAL_HOURS=1
```

### 3. Start the Server

```bash
npm start
```

You should see:

```
============================================================
File Upload Service
============================================================
Initializing upload directory...
Initializing metadata store...
Starting file lifecycle service...
============================================================
Server running on port 3000
Environment: development
Max file size: 10 MB
Max storage: 1000 MB
File retention: 24 hours
Cleanup interval: 1 hours
============================================================
API available at: http://localhost:3000/api
Health check: http://localhost:3000/api/health
============================================================
```

### 4. Test the Service

#### Check Health
```bash
curl http://localhost:3000/api/health
```

#### Upload a File
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/path/to/your/file.pdf"
```

#### List Files
```bash
curl http://localhost:3000/api/files
```

## What's Next?

- **Read the full [README.md](README.md)** for detailed documentation
- **Check [API.md](API.md)** for complete API documentation
- **Review [SECURITY.md](SECURITY.md)** for security considerations
- **Configure for production** - see deployment section in README

## Common Issues

### Port Already in Use

If port 3000 is already in use, change it in `.env`:

```env
PORT=3001
```

### Permission Errors

Ensure the application has write permissions for:
- `uploads/` directory
- `metadata/` directory

```bash
# On Linux/Mac
chmod -R 755 uploads metadata

# On Windows (PowerShell as Administrator)
icacls uploads /grant Users:F /T
icacls metadata /grant Users:F /T
```

### Dependencies Not Installing

Try clearing npm cache and reinstalling:

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## Development Mode

Run with auto-reload on file changes:

```bash
npm run dev
```

## Manual Cleanup

Run file cleanup manually:

```bash
npm run cleanup
```

## Testing the API

### Using curl

```bash
# Upload
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test.pdf"

# List
curl http://localhost:3000/api/files

# Download (replace FILE_ID)
curl http://localhost:3000/api/download/FILE_ID \
  --output downloaded.pdf

# Delete (replace FILE_ID)
curl -X DELETE http://localhost:3000/api/files/FILE_ID
```

### Using PowerShell

```powershell
# Upload
$file = Get-Item "test.pdf"
$uri = "http://localhost:3000/api/upload"
$form = @{
    file = $file
}
Invoke-RestMethod -Uri $uri -Method Post -Form $form

# List
Invoke-RestMethod -Uri "http://localhost:3000/api/files"

# Download
Invoke-RestMethod -Uri "http://localhost:3000/api/download/FILE_ID" -OutFile "downloaded.pdf"

# Delete
Invoke-RestMethod -Uri "http://localhost:3000/api/files/FILE_ID" -Method Delete
```

## Project Structure

```
file-upload-service/
├── src/
│   ├── config/           # Configuration files
│   ├── middleware/       # Express middleware
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── jobs/            # Background jobs
│   └── server.js        # Entry point
├── uploads/             # File storage (auto-created)
├── metadata/            # Metadata storage (auto-created)
├── .env                 # Configuration
├── package.json
└── README.md
```

## Features Included

✅ Secure file upload with validation  
✅ MIME type verification (magic bytes)  
✅ File size limits  
✅ Storage quotas  
✅ Automatic file expiration  
✅ Scheduled cleanup  
✅ REST API  
✅ Error handling  
✅ Path traversal prevention  
✅ Comprehensive logging  

## Need Help?

- Check the [README.md](README.md) for detailed documentation
- Review [API.md](API.md) for API reference
- Read [SECURITY.md](SECURITY.md) for security guidelines
- Look at example requests in this guide

---

**You're ready to go! Start uploading files securely. 🚀**
