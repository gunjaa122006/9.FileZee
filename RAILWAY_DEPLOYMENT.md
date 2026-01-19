# 🚂 Railway Deployment Guide

Complete guide for deploying the File Upload Service to Railway.app

---

## ✅ Prerequisites

- GitHub account
- Railway account (sign up at https://railway.app)
- Project pushed to GitHub

---

## 📤 Step 1: Push to GitHub

Your repository: https://github.com/gunjaa122006/9.FileZee

```powershell
# Navigate to project directory
cd d:\9.Filezee

# Initialize git repository
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - File Upload Service ready for Railway deployment"

# Add your GitHub repository as remote
git remote add origin https://github.com/gunjaa122006/9.FileZee.git

# Push to GitHub (main branch)
git branch -M main
git push -u origin main
```

If you get authentication errors:
```powershell
# Use GitHub CLI (recommended)
gh auth login

# Or use personal access token
# GitHub Settings → Developer Settings → Personal Access Tokens → Generate new token
```

---

## 🚂 Step 2: Deploy to Railway

### Option A: Deploy via Railway Dashboard (Easiest)

1. **Visit Railway**
   - Go to https://railway.app
   - Click "Login" and sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `gunjaa122006/9.FileZee`
   - Click "Deploy Now"

3. **Railway automatically:**
   - ✅ Detects Node.js project
   - ✅ Installs dependencies (`npm install`)
   - ✅ Runs start command (`npm start`)
   - ✅ Assigns a public URL
   - ✅ Sets PORT environment variable

### Option B: Deploy via Railway CLI

```powershell
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize Railway project
railway init

# Link to GitHub repo
railway link

# Deploy
railway up

# Open in browser
railway open
```

---

## ⚙️ Step 3: Configure Environment Variables

In Railway Dashboard:

1. Click your project → **Variables** tab
2. Add these variables:

```env
NODE_ENV=production
MAX_FILE_SIZE_MB=50
MAX_STORAGE_MB=10000
FILE_RETENTION_HOURS=24
CLEANUP_INTERVAL_HOURS=1
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
BLOCKED_EXTENSIONS=.exe,.bat,.cmd,.sh,.ps1,.msi,.dll,.scr,.jar,.vbs,.js,.app
```

**Note:** Railway automatically sets `PORT` - don't override it!

---

## 💾 Step 4: Add Persistent Storage (Critical!)

⚠️ **Important:** Railway uses ephemeral filesystems. Without a volume, files disappear on restart!

### Add Volume:

1. In Railway Dashboard → Your service → **Settings** tab
2. Scroll to **Volumes** section
3. Click **"+ New Volume"**
4. Configure:
   - **Mount Path:** `/app/uploads`
   - **Size:** 1 GB (free tier) or more
5. Click **"Add"**
6. Service will redeploy automatically

### Verify Volume:

```powershell
# Using Railway CLI
railway logs

# Look for: "Initializing upload directory..."
# Should show successful initialization
```

---

## 🌐 Step 5: Get Your Public URL

1. In Railway Dashboard → Your service
2. Click **Settings** → **Generate Domain**
3. Railway creates: `https://your-app-name.up.railway.app`

Or use custom domain:
- Settings → Domains → Add Custom Domain
- Add CNAME record in your DNS

---

## 🧪 Step 6: Test Your Deployment

```powershell
# Set your Railway URL
$baseUrl = "https://your-app-name.up.railway.app"

# Health check
Invoke-RestMethod -Uri "$baseUrl/api/health"

# Upload test file
$testFile = "test.txt"
"Hello Railway!" | Out-File $testFile
$form = @{ file = Get-Item $testFile }
Invoke-RestMethod -Uri "$baseUrl/api/upload" -Method Post -Form $form

# List files
Invoke-RestMethod -Uri "$baseUrl/api/files"

# Cleanup
Remove-Item $testFile
```

---

## 📊 Railway Dashboard Overview

### Deployments Tab
- View deployment history
- See build logs
- Rollback if needed

### Metrics Tab
- CPU usage
- Memory usage
- Network traffic
- Request count

### Logs Tab
- Real-time application logs
- Filter by level (info, error, etc.)
- Search functionality

### Settings Tab
- Environment variables
- Volumes (persistent storage)
- Domains (custom URLs)
- Service settings

---

## 🔧 Advanced Configuration

### Custom Start Command (Optional)

If needed, override start command:
1. Settings → **Start Command**
2. Enter: `node src/server.js`
3. Save

### Build Command (Optional)

1. Settings → **Build Command**
2. Enter: `npm install --production`
3. Save

### Railway.toml (Optional)

Create `railway.toml` for advanced config:

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

---

## 🔐 Security for Production

### Add Authentication

Update environment variables:
```env
API_KEY=your-super-secret-api-key-change-this
```

Add to `src/server.js`:
```javascript
// Before routes
app.use('/api', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

### Enable HTTPS (Automatic)

Railway automatically provides HTTPS for all deployments. No configuration needed!

---

## 📈 Monitoring & Maintenance

### View Logs
```powershell
# Real-time logs
railway logs

# Follow logs
railway logs --follow
```

### Restart Service
```powershell
railway restart
```

### Check Status
```powershell
railway status
```

### Scale (Paid Plans)
- Settings → Replicas
- Increase for high traffic

---

## 💰 Railway Pricing

### Free Tier (Hobby Plan)
- $5 of usage/month free
- Includes:
  - 500 hours of runtime
  - 1GB outbound bandwidth
  - Persistent volumes

### Pro Plan ($20/month)
- $20 credit/month
- Priority builds
- More resources
- Team features

**Estimate:** Free tier supports ~100-500 uploads/day depending on file sizes

---

## 🔄 Update Your Deployment

### Update via Git Push

```powershell
# Make changes to code
git add .
git commit -m "Update: description of changes"
git push

# Railway automatically:
# 1. Detects push
# 2. Builds new version
# 3. Deploys with zero downtime
```

### Rollback to Previous Version

1. Railway Dashboard → **Deployments**
2. Find previous successful deployment
3. Click three dots → **Rollback**

---

## 🐛 Troubleshooting

### Service Won't Start

Check logs:
```powershell
railway logs
```

Common issues:
- Missing environment variables
- Port conflict (Railway sets PORT automatically)
- Missing dependencies

### Files Disappearing

**Cause:** No persistent volume configured

**Solution:**
1. Add volume at `/app/uploads` (Step 4 above)
2. Redeploy

### Out of Memory

**Cause:** Large files or many concurrent uploads

**Solution:**
1. Increase `MAX_FILE_SIZE_MB`
2. Decrease `FILE_RETENTION_HOURS`
3. Run manual cleanup more often
4. Upgrade Railway plan

### Storage Full

Check usage:
```powershell
# View health endpoint
curl https://your-app.up.railway.app/api/health
```

Solution:
- Increase volume size in Railway dashboard
- Decrease retention period
- Run manual cleanup

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Railway project created
- [ ] Environment variables configured
- [ ] **Persistent volume added** (critical!)
- [ ] Public URL generated
- [ ] Health check passes
- [ ] Test upload works
- [ ] Test download works
- [ ] Test automatic cleanup (wait 1 hour)
- [ ] Logs are clean (no errors)
- [ ] Consider adding authentication

---

## 🎯 Quick Reference

```powershell
# Push updates
git push

# View logs
railway logs

# Restart
railway restart

# Open dashboard
railway open

# Check status
railway status
```

---

## 📞 Support

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Project Issues:** https://github.com/gunjaa122006/9.FileZee/issues

---

## 🎉 Success!

Your file upload service is now:
- ✅ Deployed to Railway
- ✅ Publicly accessible
- ✅ Automatically scaling
- ✅ Monitored and logged
- ✅ Auto-deploying on git push

**Your API is live at:** `https://your-app-name.up.railway.app/api`

Test it:
```bash
curl https://your-app-name.up.railway.app/api/health
```

---

**Happy Deploying! 🚂🚀**
