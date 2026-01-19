# Production Deployment Guide

Complete guide for deploying the File Upload Service to production.

## Pre-Deployment Checklist

### Security
- [ ] Authentication implemented
- [ ] HTTPS/TLS configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers added (Helmet)
- [ ] File size limits appropriate
- [ ] Storage quotas set correctly
- [ ] Allowed file types reviewed
- [ ] Blocked extensions verified
- [ ] Virus scanning integrated (if needed)

### Configuration
- [ ] Environment variables configured
- [ ] File retention period set appropriately
- [ ] Cleanup interval configured
- [ ] Upload directory permissions verified
- [ ] Logging configured
- [ ] Monitoring setup

### Infrastructure
- [ ] Reverse proxy configured (nginx/Apache)
- [ ] Process manager setup (PM2/systemd)
- [ ] Firewall rules configured
- [ ] Backup strategy implemented
- [ ] Log rotation configured
- [ ] Disk space monitoring enabled

---

## Deployment Methods

## Method 1: PM2 (Recommended for Node.js)

### Install PM2

```bash
npm install -g pm2
```

### Create PM2 Ecosystem File

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'file-upload-service',
    script: './src/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
};
```

### Start with PM2

```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# Monitor
pm2 monit

# View logs
pm2 logs file-upload-service

# Restart
pm2 restart file-upload-service

# Stop
pm2 stop file-upload-service
```

---

## Method 2: Systemd (Linux)

### Create Service File

Create `/etc/systemd/system/file-upload.service`:

```ini
[Unit]
Description=File Upload Service
Documentation=https://github.com/yourorg/file-upload-service
After=network.target

[Service]
Type=simple
User=nodejs
Group=nodejs
WorkingDirectory=/opt/file-upload-service
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/node /opt/file-upload-service/src/server.js
Restart=on-failure
RestartSec=10
StandardOutput=append:/var/log/file-upload/output.log
StandardError=append:/var/log/file-upload/error.log

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/file-upload-service/uploads /opt/file-upload-service/metadata

[Install]
WantedBy=multi-user.target
```

### Setup and Start

```bash
# Create user for the service
sudo useradd -r -s /bin/false nodejs

# Create log directory
sudo mkdir -p /var/log/file-upload
sudo chown nodejs:nodejs /var/log/file-upload

# Set permissions
sudo chown -R nodejs:nodejs /opt/file-upload-service

# Reload systemd
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable file-upload
sudo systemctl start file-upload

# Check status
sudo systemctl status file-upload

# View logs
sudo journalctl -u file-upload -f
```

---

## Method 3: Docker

### Create Dockerfile

```dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Create upload and metadata directories
RUN mkdir -p uploads metadata

# Set permissions
RUN chown -R node:node /usr/src/app

# Use non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/server.js"]
```

### Create docker-compose.yml

```yaml
version: '3.8'

services:
  file-upload:
    build: .
    container_name: file-upload-service
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - MAX_FILE_SIZE_MB=10
      - MAX_STORAGE_MB=1000
      - FILE_RETENTION_HOURS=24
      - CLEANUP_INTERVAL_HOURS=1
    volumes:
      - ./uploads:/usr/src/app/uploads
      - ./metadata:/usr/src/app/metadata
      - ./logs:/usr/src/app/logs
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3

networks:
  app-network:
    driver: bridge
```

### Deploy with Docker

```bash
# Build image
docker build -t file-upload-service .

# Run container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Restart
docker-compose restart
```

---

## Nginx Reverse Proxy Configuration

### Basic Configuration

Create `/etc/nginx/sites-available/file-upload`:

```nginx
upstream file_upload {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Max upload size (must match your app config)
    client_max_body_size 10M;

    # Timeouts
    client_body_timeout 60s;
    client_header_timeout 60s;

    # Logging
    access_log /var/log/nginx/file-upload-access.log;
    error_log /var/log/nginx/file-upload-error.log;

    # Proxy configuration
    location / {
        proxy_pass http://file_upload;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Rate limiting for upload endpoint
    location /api/upload {
        limit_req zone=upload_limit burst=5 nodelay;
        proxy_pass http://file_upload;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=10r/m;
```

### Enable and Restart Nginx

```bash
# Test configuration
sudo nginx -t

# Enable site
sudo ln -s /etc/nginx/sites-available/file-upload /etc/nginx/sites-enabled/

# Restart Nginx
sudo systemctl restart nginx
```

---

## Environment Variables for Production

Create `.env.production`:

```env
# Server
NODE_ENV=production
PORT=3000

# File Upload (adjust as needed)
MAX_FILE_SIZE_MB=10
UPLOAD_DIR=/var/www/file-upload/uploads
MAX_STORAGE_MB=5000

# File Lifecycle
FILE_RETENTION_HOURS=24
CLEANUP_INTERVAL_HOURS=1

# Security - customize for your use case
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
BLOCKED_EXTENSIONS=.exe,.bat,.cmd,.sh,.ps1,.msi,.dll,.scr,.jar,.vbs,.js,.app

# If you add authentication
# JWT_SECRET=your-super-secret-jwt-key-change-this
```

---

## Monitoring Setup

### Healthcheck Script

Create `scripts/healthcheck.sh`:

```bash
#!/bin/bash

HEALTH_URL="http://localhost:3000/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "Service is healthy"
    exit 0
else
    echo "Service is unhealthy (HTTP $RESPONSE)"
    exit 1
fi
```

### Add to Cron

```bash
# Check every 5 minutes
*/5 * * * * /opt/file-upload-service/scripts/healthcheck.sh >> /var/log/file-upload/healthcheck.log 2>&1
```

### Integration with Monitoring Tools

#### Prometheus (Node Exporter)

Install `prom-client`:
```bash
npm install prom-client
```

Add to `src/server.js`:
```javascript
const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const uploadCounter = new promClient.Counter({
  name: 'uploads_total',
  help: 'Total number of file uploads',
  registers: [register]
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## Log Management

### Log Rotation with logrotate

Create `/etc/logrotate.d/file-upload`:

```
/var/log/file-upload/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 nodejs nodejs
    sharedscripts
    postrotate
        systemctl reload file-upload > /dev/null 2>&1 || true
    endscript
}
```

---

## Backup Strategy

### Automated Backup Script

Create `scripts/backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/backups/file-upload"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
APP_DIR="/opt/file-upload-service"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$TIMESTAMP.tar.gz $APP_DIR/uploads/

# Backup metadata
cp $APP_DIR/metadata/files.json $BACKUP_DIR/metadata_$TIMESTAMP.json

# Keep only last 7 days
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "metadata_*.json" -mtime +7 -delete

echo "Backup completed: $TIMESTAMP"
```

### Schedule Backups

```bash
# Daily backup at 2 AM
0 2 * * * /opt/file-upload-service/scripts/backup.sh >> /var/log/file-upload/backup.log 2>&1
```

---

## Performance Optimization

### Node.js Tuning

```bash
# Increase file descriptor limit
ulimit -n 65536

# In your systemd service file:
LimitNOFILE=65536
```

### Enable Cluster Mode

Modify `src/server.js` to use cluster:

```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Your existing server code
  startServer();
}
```

---

## Security Hardening

### Firewall Configuration (UFW)

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny direct access to Node.js port
sudo ufw deny 3000/tcp

# Enable firewall
sudo ufw enable
```

### Fail2ban Configuration

Create `/etc/fail2ban/filter.d/file-upload.conf`:

```ini
[Definition]
failregex = .*"error".*"ip":"<HOST>".*
ignoreregex =
```

Create `/etc/fail2ban/jail.d/file-upload.conf`:

```ini
[file-upload]
enabled = true
port = http,https
filter = file-upload
logpath = /var/log/file-upload/*.log
maxretry = 5
bantime = 3600
```

---

## Troubleshooting Production Issues

### Service Won't Start

```bash
# Check logs
journalctl -u file-upload -n 50

# Check port availability
sudo netstat -tlnp | grep 3000

# Check permissions
ls -la /opt/file-upload-service/uploads
ls -la /opt/file-upload-service/metadata
```

### High Memory Usage

```bash
# Monitor memory
pm2 monit

# Check for memory leaks
node --inspect src/server.js

# Restart service
pm2 restart file-upload-service
```

### Storage Issues

```bash
# Check disk space
df -h

# Run manual cleanup
npm run cleanup

# Check orphaned files
find ./uploads -type f -mtime +2 -ls
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Dependencies updated
- [ ] Security audit completed
- [ ] Environment variables configured
- [ ] Backup strategy tested

### Deployment
- [ ] Deploy to staging first
- [ ] Run smoke tests
- [ ] Monitor logs during deployment
- [ ] Verify health checks
- [ ] Test critical paths

### Post-Deployment
- [ ] Monitor error rates
- [ ] Check resource usage
- [ ] Verify cleanup jobs running
- [ ] Test backups
- [ ] Document deployment

---

## Rollback Procedure

### Quick Rollback

```bash
# With PM2
pm2 stop file-upload-service
cd /opt/file-upload-service
git checkout <previous-version>
npm install
pm2 restart file-upload-service

# With Docker
docker-compose down
docker-compose pull <previous-image>
docker-compose up -d

# Verify
curl http://localhost:3000/api/health
```

---

## Support & Maintenance

### Regular Maintenance Tasks

**Daily:**
- Monitor logs for errors
- Check disk space
- Verify backups completed

**Weekly:**
- Review security logs
- Check for orphaned files
- Review performance metrics

**Monthly:**
- Update dependencies
- Security audit
- Capacity planning review

**Quarterly:**
- Disaster recovery test
- Security penetration testing
- Performance optimization review

---

**Your File Upload Service is now production-ready! 🚀**
