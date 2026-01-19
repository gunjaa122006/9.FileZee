# Security Documentation

This document details the security measures implemented in the File Upload Service and provides guidance for hardening the system for production deployment.

## 🛡️ Implemented Security Features

### 1. File Validation

#### MIME Type Verification
**Purpose:** Prevent MIME type spoofing attacks

**Implementation:**
- Uses `file-type` library to read magic bytes from file content
- Compares actual file type with claimed MIME type
- Rejects files with mismatched types
- Validates against whitelist of allowed MIME types

**Attack Scenario Prevented:**
An attacker renames `malware.exe` to `document.pdf` and uploads it. Without magic byte validation, the server would accept it based on the extension. Our implementation reads the file's binary signature and detects it's actually an executable, rejecting the upload.

**Code Reference:** [src/middleware/security.js](src/middleware/security.js) - `validateFileMimeType`

#### Extension Blocking
**Purpose:** Defense-in-depth against dangerous file types

**Blocked Extensions:**
```
.exe, .bat, .cmd, .sh, .ps1, .msi, .dll, .scr, .jar, .vbs, .js, .app
```

**Implementation:**
- Checked at Multer configuration level (first line of defense)
- Configurable via environment variables
- Extension check is case-insensitive

**Attack Scenario Prevented:**
Even if MIME type validation is bypassed, executable file extensions are blocked at the initial upload stage, preventing dangerous files from ever reaching the filesystem.

**Code Reference:** [src/config/multer.js](src/config/multer.js) - `fileFilter`

#### Allowed MIME Types Whitelist
**Purpose:** Only accept explicitly permitted file types

**Default Allowed Types:**
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Documents: `application/pdf`, `.docx`, `.xlsx`
- Text: `text/plain`, `text/csv`

**Implementation:**
- Whitelist approach (deny by default)
- Configurable via environment variables
- Validated at both upload and content verification stages

**Code Reference:** [src/config/config.js](src/config/config.js)

---

### 2. Path Traversal Prevention

#### Filename Sanitization
**Purpose:** Prevent directory traversal attacks

**Implementation:**
```javascript
const sanitizeFilename = (filename) => {
  return path.basename(filename)
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '');
};
```

**Attack Scenarios Prevented:**
- `../../etc/passwd` → rejected
- `../../../windows/system32/config.sys` → rejected
- `file.txt/../../../secret.db` → sanitized to `file.txt`

**Additional Protection:**
- Uses `path.basename()` to extract only filename
- Removes all path separators
- Validates file ID on all operations

**Code References:**
- [src/middleware/security.js](src/middleware/security.js) - `sanitizeFilename`, `validateFileId`
- [src/config/multer.js](src/config/multer.js) - `generateUniqueFilename`

#### No Internal Path Exposure
**Purpose:** Prevent information disclosure

**Implementation:**
- API responses never include filesystem paths
- Only return file IDs (unique filenames)
- Internal paths are resolved server-side only

**Example Response (secure):**
```json
{
  "fileId": "document_1234567890_abc123.pdf",
  "originalName": "document.pdf"
}
```

**What We DON'T Expose:**
```json
{
  "path": "/var/www/uploads/document_1234567890_abc123.pdf"  // ❌ Never exposed
}
```

---

### 3. Storage Quotas

#### File Size Limits
**Purpose:** Prevent DoS through large file uploads

**Implementation:**
- Configured via `MAX_FILE_SIZE_MB` environment variable
- Enforced at Multer level (rejects before writing to disk)
- Default: 10 MB

**Configuration:**
```env
MAX_FILE_SIZE_MB=10
```

**Code Reference:** [src/config/multer.js](src/config/multer.js)

#### Total Storage Limits
**Purpose:** Prevent storage exhaustion

**Implementation:**
- Tracks total storage usage via metadata
- Checks available space before accepting uploads
- Configurable maximum storage limit

**Flow:**
1. Calculate current storage usage
2. Add incoming file size
3. Compare against limit
4. Reject if exceeds, accept if within limit
5. Clean up file if rejected

**Configuration:**
```env
MAX_STORAGE_MB=1000
```

**Code Reference:** [src/middleware/security.js](src/middleware/security.js) - `checkStorageLimit`

---

### 4. Input Validation

#### File ID Validation
**Purpose:** Ensure only valid file identifiers are processed

**Validation Rules:**
- Must be a string
- Cannot be empty
- Must pass sanitization
- Cannot contain path separators
- Cannot contain parent directory references

**Code Reference:** [src/middleware/security.js](src/middleware/security.js) - `validateFileId`

#### Request Validation
**Purpose:** Prevent malformed or malicious requests

**Validations:**
- File field name must be "file"
- Only one file per upload
- Proper Content-Type header required
- File must be present in request

**Code Reference:** [src/routes/fileRoutes.js](src/routes/fileRoutes.js)

---

### 5. Error Handling Security

#### No Information Disclosure
**Purpose:** Prevent leaking sensitive information in errors

**Implementation:**
- Generic error messages in production
- Detailed errors only in development mode
- No stack traces in production
- No internal paths in error responses

**Development Error:**
```json
{
  "success": false,
  "error": "Internal server error",
  "stack": "Error: detailed stack trace..."  // Only in development
}
```

**Production Error:**
```json
{
  "success": false,
  "error": "Internal server error"
}
```

**Code Reference:** [src/middleware/errorHandler.js](src/middleware/errorHandler.js)

---

## 🔒 Additional Security Recommendations

### For Production Deployment

#### 1. Authentication & Authorization

**Current State:** No authentication (designed for internal use)

**Recommended Implementation:**

```javascript
// JWT Authentication Middleware
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Apply to routes
app.use('/api', authenticateToken);
```

**Alternatives:**
- API Keys
- OAuth 2.0
- Basic Auth (with HTTPS only)

#### 2. Rate Limiting

**Purpose:** Prevent abuse and DoS attacks

**Recommended Implementation:**

```javascript
const rateLimit = require('express-rate-limit');

// Upload rate limit
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 uploads per 15 minutes
  message: 'Too many uploads, please try again later'
});

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/upload', uploadLimiter);
app.use('/api', apiLimiter);
```

#### 3. HTTPS/TLS

**Purpose:** Encrypt data in transit

**Implementation:**

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
};

https.createServer(options, app).listen(443);
```

**Better Approach:** Use a reverse proxy (nginx, Apache) with TLS termination

#### 4. CORS Configuration

**Purpose:** Control which domains can access the API

**Implementation:**

```javascript
const cors = require('cors');

app.use(cors({
  origin: ['https://trusted-domain.com'],
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

#### 5. Security Headers

**Purpose:** Protect against common web vulnerabilities

**Implementation:**

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

#### 6. Virus Scanning

**Purpose:** Detect malware in uploaded files

**Recommended Implementation:**

```javascript
const NodeClam = require('clamscan');

const clamscan = new NodeClam().init({
  clamdscan: {
    host: 'localhost',
    port: 3310
  }
});

const scanFile = async (req, res, next) => {
  if (!req.file) return next();
  
  const { isInfected, viruses } = await clamscan.isInfected(req.file.path);
  
  if (isInfected) {
    await fs.unlink(req.file.path);
    return res.status(400).json({
      error: 'File contains malware',
      viruses
    });
  }
  
  next();
};
```

#### 7. Request Logging & Monitoring

**Purpose:** Audit trail and anomaly detection

**Implementation:**

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: 'logs/uploads.log' })
  ]
});

app.use((req, res, next) => {
  logger.info({
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});
```

#### 8. Input Sanitization

**Purpose:** Prevent injection attacks

**Implementation:**

```javascript
const validator = require('validator');

const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = validator.escape(req.body[key]);
      }
    });
  }
  next();
};

app.use(sanitizeInput);
```

---

## 🔍 Security Testing

### Recommended Tests

#### 1. File Upload Tests

```bash
# Test MIME type spoofing
mv malicious.exe malicious.pdf
curl -X POST http://localhost:3000/api/upload -F "file=@malicious.pdf"
# Should be rejected: MIME type mismatch

# Test blocked extensions
curl -X POST http://localhost:3000/api/upload -F "file=@script.exe"
# Should be rejected: Extension not allowed

# Test file size limit
dd if=/dev/zero of=large.bin bs=1M count=100  # 100MB file
curl -X POST http://localhost:3000/api/upload -F "file=@large.bin"
# Should be rejected: File too large
```

#### 2. Path Traversal Tests

```bash
# Test directory traversal in file ID
curl http://localhost:3000/api/files/../../../etc/passwd
# Should return: Invalid file ID

# Test path traversal in download
curl http://localhost:3000/api/download/..%2F..%2Fetc%2Fpasswd
# Should return: Invalid file ID
```

#### 3. Storage Limit Tests

```bash
# Upload multiple files to exceed storage limit
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/upload -F "file=@large-file.bin"
done
# Should eventually return: Storage limit exceeded
```

#### 4. Concurrent Upload Tests

```bash
# Test race conditions
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/upload -F "file=@test.pdf" &
done
wait
# All uploads should succeed with unique filenames
```

---

## 📋 Security Checklist

### Pre-Production Checklist

- [ ] All environment variables configured securely
- [ ] No secrets in code or version control
- [ ] Authentication implemented
- [ ] HTTPS/TLS configured
- [ ] Rate limiting enabled
- [ ] Security headers configured (Helmet)
- [ ] CORS properly restricted
- [ ] Virus scanning integrated
- [ ] Logging and monitoring configured
- [ ] Storage quotas appropriate for use case
- [ ] File retention periods set correctly
- [ ] Backup and recovery tested
- [ ] Firewall rules configured
- [ ] Reverse proxy configured
- [ ] Security headers tested
- [ ] Penetration testing completed
- [ ] Incident response plan documented

### Regular Security Maintenance

- [ ] Review logs for suspicious activity (weekly)
- [ ] Update dependencies (monthly)
- [ ] Review and update allowed file types (quarterly)
- [ ] Test backup and recovery (quarterly)
- [ ] Security audit (annually)
- [ ] Review access controls (quarterly)
- [ ] Monitor storage usage (daily)
- [ ] Check for orphaned files (weekly)

---

## 🚨 Known Limitations

### 1. No Authentication
**Risk Level:** HIGH for internet-facing deployments

**Mitigation:** Implement authentication before production deployment

### 2. JSON-based Metadata Storage
**Risk Level:** MEDIUM

**Limitations:**
- Not suitable for high-concurrency scenarios
- No transactional integrity
- Limited query capabilities

**Mitigation:** Migrate to database (PostgreSQL, MongoDB) for production

### 3. Local Filesystem Storage
**Risk Level:** LOW to MEDIUM

**Limitations:**
- Single point of failure
- Not horizontally scalable
- Limited to server disk space

**Mitigation:** Migrate to object storage (S3, Azure Blob) for production scale

### 4. No Virus Scanning
**Risk Level:** MEDIUM to HIGH depending on use case

**Mitigation:** Integrate ClamAV or similar before accepting untrusted uploads

### 5. No Rate Limiting
**Risk Level:** HIGH for public-facing deployments

**Mitigation:** Implement rate limiting before production deployment

---

## 📞 Security Incident Response

If you discover a security vulnerability:

1. **Do not** open a public issue
2. Document the vulnerability with:
   - Description of the issue
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)
3. Contact the security team immediately
4. Preserve evidence (logs, requests)

---

## 📚 Additional Resources

- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Remember: Security is a process, not a product. Regular reviews and updates are essential.**
