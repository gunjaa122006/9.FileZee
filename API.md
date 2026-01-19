# API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Currently no authentication required (designed for internal/controlled use).

For production deployments, implement authentication middleware before the routes.

---

## Endpoints

### 1. Upload File

Upload a single file to the service.

**Endpoint:** `POST /api/upload`

**Content-Type:** `multipart/form-data`

**Request:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/document.pdf"
```

**Form Field:**
- `file` (required): The file to upload

**Success Response (201):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "fileId": "document_1737281400000_abc123def456.pdf",
    "originalName": "document.pdf",
    "filename": "document_1737281400000_abc123def456.pdf",
    "size": 102400,
    "sizeFormatted": "100.00 KB",
    "mimeType": "application/pdf",
    "uploadedAt": "2026-01-19T10:30:00.000Z",
    "expiresAt": "2026-01-20T10:30:00.000Z"
  }
}
```

**Error Responses:**

400 - No file uploaded:
```json
{
  "success": false,
  "error": "No file uploaded",
  "details": "Use \"file\" as the field name in your multipart/form-data request"
}
```

400 - File type not allowed:
```json
{
  "success": false,
  "error": "MIME type application/x-msdownload is not allowed"
}
```

400 - MIME type mismatch:
```json
{
  "success": false,
  "error": "File MIME type mismatch detected. Possible file spoofing attempt.",
  "details": {
    "claimed": "image/jpeg",
    "actual": "application/x-executable"
  }
}
```

413 - File too large:
```json
{
  "success": false,
  "error": "File size exceeds the maximum allowed limit",
  "details": {
    "maxSize": "10 MB"
  }
}
```

507 - Storage limit exceeded:
```json
{
  "success": false,
  "error": "Storage limit exceeded",
  "details": {
    "currentUsage": "950.00 MB",
    "maxStorage": "1000 MB",
    "incomingSize": "100.00 MB"
  }
}
```

---

### 2. List All Files

Retrieve a list of all uploaded files with storage summary.

**Endpoint:** `GET /api/files`

**Request:**
```bash
curl http://localhost:3000/api/files
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "fileId": "report_1737281400000_abc123def456.pdf",
        "originalName": "report.pdf",
        "filename": "report_1737281400000_abc123def456.pdf",
        "size": 204800,
        "sizeFormatted": "200.00 KB",
        "mimeType": "application/pdf",
        "uploadedAt": "2026-01-19T10:30:00.000Z",
        "expiresAt": "2026-01-20T10:30:00.000Z"
      },
      {
        "fileId": "photo_1737281300000_def456abc789.jpg",
        "originalName": "photo.jpg",
        "filename": "photo_1737281300000_def456abc789.jpg",
        "size": 512000,
        "sizeFormatted": "500.00 KB",
        "mimeType": "image/jpeg",
        "uploadedAt": "2026-01-19T10:25:00.000Z",
        "expiresAt": "2026-01-20T10:25:00.000Z"
      }
    ],
    "summary": {
      "totalFiles": 2,
      "totalStorage": 716800,
      "totalStorageFormatted": "0.68 MB",
      "maxStorage": "1000 MB",
      "usagePercentage": "0.07%"
    }
  }
}
```

**Notes:**
- Files are sorted by upload date (newest first)
- Summary includes total storage usage and percentage

---

### 3. Get File Metadata

Retrieve metadata for a specific file.

**Endpoint:** `GET /api/files/:fileId`

**Parameters:**
- `fileId` (path): The unique file identifier

**Request:**
```bash
curl http://localhost:3000/api/files/report_1737281400000_abc123def456.pdf
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "fileId": "report_1737281400000_abc123def456.pdf",
    "originalName": "report.pdf",
    "filename": "report_1737281400000_abc123def456.pdf",
    "size": 204800,
    "sizeFormatted": "200.00 KB",
    "mimeType": "application/pdf",
    "uploadedAt": "2026-01-19T10:30:00.000Z",
    "expiresAt": "2026-01-20T10:30:00.000Z"
  }
}
```

**Error Responses:**

400 - Invalid file ID:
```json
{
  "success": false,
  "error": "Invalid file ID"
}
```

404 - File not found:
```json
{
  "success": false,
  "error": "File not found"
}
```

404 - File missing from disk:
```json
{
  "success": false,
  "error": "File not found on disk",
  "details": "Metadata has been cleaned up"
}
```

---

### 4. Download File

Download a file with proper content headers.

**Endpoint:** `GET /api/download/:fileId`

**Parameters:**
- `fileId` (path): The unique file identifier

**Request:**
```bash
curl http://localhost:3000/api/download/report_1737281400000_abc123def456.pdf \
  --output report.pdf
```

**Success Response (200):**
- Binary file content
- Headers:
  - `Content-Type`: File's MIME type
  - `Content-Disposition`: `attachment; filename="[originalName]"`
  - `Content-Length`: File size in bytes

**Error Responses:**

400 - Invalid file ID:
```json
{
  "success": false,
  "error": "Invalid file ID"
}
```

404 - File not found:
```json
{
  "success": false,
  "error": "File not found"
}
```

404 - File missing from disk:
```json
{
  "success": false,
  "error": "File not found on disk"
}
```

---

### 5. Delete File

Delete a file and its metadata.

**Endpoint:** `DELETE /api/files/:fileId`

**Parameters:**
- `fileId` (path): The unique file identifier

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/files/report_1737281400000_abc123def456.pdf
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "File deleted successfully",
  "data": {
    "fileId": "report_1737281400000_abc123def456.pdf",
    "originalName": "report.pdf"
  }
}
```

**Error Responses:**

400 - Invalid file ID:
```json
{
  "success": false,
  "error": "Invalid file ID"
}
```

404 - File not found:
```json
{
  "success": false,
  "error": "File not found"
}
```

---

### 6. Health Check

Check service health and get configuration information.

**Endpoint:** `GET /api/health`

**Request:**
```bash
curl http://localhost:3000/api/health
```

**Success Response (200):**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-01-19T10:30:00.000Z",
  "storage": {
    "used": "0.68 MB",
    "max": "1000 MB",
    "usagePercentage": "0.07%"
  },
  "files": {
    "count": 2
  },
  "config": {
    "maxFileSize": "10 MB",
    "fileRetention": "24 hours",
    "allowedTypes": 9
  }
}
```

**Error Response (500):**
```json
{
  "success": false,
  "status": "unhealthy",
  "error": "Service initialization failed"
}
```

---

## Allowed File Types

The service accepts the following MIME types by default:

- `image/jpeg` - JPEG images
- `image/png` - PNG images
- `image/gif` - GIF images
- `image/webp` - WebP images
- `application/pdf` - PDF documents
- `text/plain` - Plain text files
- `text/csv` - CSV files
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` - DOCX
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` - XLSX

Configure additional types in `.env` using `ALLOWED_MIME_TYPES`.

---

## Blocked File Extensions

The following extensions are blocked for security:

`.exe`, `.bat`, `.cmd`, `.sh`, `.ps1`, `.msi`, `.dll`, `.scr`, `.jar`, `.vbs`, `.js`, `.app`

Configure in `.env` using `BLOCKED_EXTENSIONS`.

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

In development mode, stack traces may be included.

---

## Rate Limiting

Currently no rate limiting implemented.

For production, consider adding rate limiting middleware:

```javascript
const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/upload', uploadLimiter);
```

---

## CORS

Currently no CORS configuration.

For cross-origin requests, add CORS middleware:

```javascript
const cors = require('cors');

app.use(cors({
  origin: 'https://your-frontend-domain.com',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
```

---

## Testing with Postman

### Upload File
1. Create new POST request to `http://localhost:3000/api/upload`
2. Go to Body tab
3. Select "form-data"
4. Add key "file" with type "File"
5. Choose file to upload
6. Send request

### List Files
1. Create new GET request to `http://localhost:3000/api/files`
2. Send request

### Download File
1. Create new GET request to `http://localhost:3000/api/download/[fileId]`
2. Replace `[fileId]` with actual file ID from upload response
3. Send request
4. Use "Send and Download" to save file

### Delete File
1. Create new DELETE request to `http://localhost:3000/api/files/[fileId]`
2. Replace `[fileId]` with actual file ID
3. Send request

---

## JavaScript/Fetch Example

```javascript
// Upload file
const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:3000/api/upload', {
    method: 'POST',
    body: formData
  });

  return await response.json();
};

// List files
const listFiles = async () => {
  const response = await fetch('http://localhost:3000/api/files');
  return await response.json();
};

// Download file
const downloadFile = async (fileId) => {
  const response = await fetch(`http://localhost:3000/api/download/${fileId}`);
  const blob = await response.blob();
  
  // Create download link
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileId;
  a.click();
};

// Delete file
const deleteFile = async (fileId) => {
  const response = await fetch(`http://localhost:3000/api/files/${fileId}`, {
    method: 'DELETE'
  });
  
  return await response.json();
};
```

---

## Python Example

```python
import requests

# Upload file
def upload_file(file_path):
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post('http://localhost:3000/api/upload', files=files)
        return response.json()

# List files
def list_files():
    response = requests.get('http://localhost:3000/api/files')
    return response.json()

# Download file
def download_file(file_id, save_path):
    response = requests.get(f'http://localhost:3000/api/download/{file_id}')
    with open(save_path, 'wb') as f:
        f.write(response.content)

# Delete file
def delete_file(file_id):
    response = requests.delete(f'http://localhost:3000/api/files/{file_id}')
    return response.json()
```
