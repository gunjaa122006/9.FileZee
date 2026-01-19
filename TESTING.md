# Example Test Script

This script demonstrates how to test the file upload service programmatically.

## Using Node.js

Create a file `test.js`:

```javascript
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

// Upload file
async function uploadFile(filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: form
  });

  const result = await response.json();
  console.log('Upload Result:', JSON.stringify(result, null, 2));
  return result.data.fileId;
}

// List files
async function listFiles() {
  const response = await fetch(`${API_BASE}/files`);
  const result = await response.json();
  console.log('Files List:', JSON.stringify(result, null, 2));
  return result;
}

// Get file metadata
async function getFileMetadata(fileId) {
  const response = await fetch(`${API_BASE}/files/${fileId}`);
  const result = await response.json();
  console.log('File Metadata:', JSON.stringify(result, null, 2));
  return result;
}

// Download file
async function downloadFile(fileId, savePath) {
  const response = await fetch(`${API_BASE}/download/${fileId}`);
  const buffer = await response.buffer();
  fs.writeFileSync(savePath, buffer);
  console.log(`File downloaded to: ${savePath}`);
}

// Delete file
async function deleteFile(fileId) {
  const response = await fetch(`${API_BASE}/files/${fileId}`, {
    method: 'DELETE'
  });
  const result = await response.json();
  console.log('Delete Result:', JSON.stringify(result, null, 2));
  return result;
}

// Health check
async function healthCheck() {
  const response = await fetch(`${API_BASE}/health`);
  const result = await response.json();
  console.log('Health Check:', JSON.stringify(result, null, 2));
  return result;
}

// Run tests
async function runTests() {
  try {
    console.log('='.repeat(60));
    console.log('File Upload Service - Test Script');
    console.log('='.repeat(60));

    // Health check
    console.log('\n1. Health Check...');
    await healthCheck();

    // Upload file (create a test file first)
    const testFile = 'test.txt';
    fs.writeFileSync(testFile, 'This is a test file for upload service.');
    
    console.log('\n2. Uploading file...');
    const fileId = await uploadFile(testFile);

    // List files
    console.log('\n3. Listing all files...');
    await listFiles();

    // Get metadata
    console.log('\n4. Getting file metadata...');
    await getFileMetadata(fileId);

    // Download file
    console.log('\n5. Downloading file...');
    await downloadFile(fileId, 'downloaded-test.txt');

    // Delete file
    console.log('\n6. Deleting file...');
    await deleteFile(fileId);

    // Verify deletion
    console.log('\n7. Listing files after deletion...');
    await listFiles();

    console.log('\n' + '='.repeat(60));
    console.log('All tests completed successfully!');
    console.log('='.repeat(60));

    // Cleanup
    fs.unlinkSync(testFile);
    fs.unlinkSync('downloaded-test.txt');

  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
```

## Using PowerShell

Create a file `test.ps1`:

```powershell
# File Upload Service Test Script
$baseUrl = "http://localhost:3000/api"

Write-Host "=" * 60
Write-Host "File Upload Service - Test Script"
Write-Host "=" * 60

# Create test file
$testFile = "test.txt"
"This is a test file for upload service." | Out-File -FilePath $testFile -Encoding utf8

try {
    # 1. Health Check
    Write-Host "`n1. Health Check..."
    $health = Invoke-RestMethod -Uri "$baseUrl/health"
    $health | ConvertTo-Json -Depth 10

    # 2. Upload file
    Write-Host "`n2. Uploading file..."
    $uploadUri = "$baseUrl/upload"
    $form = @{
        file = Get-Item $testFile
    }
    $uploadResult = Invoke-RestMethod -Uri $uploadUri -Method Post -Form $form
    $fileId = $uploadResult.data.fileId
    $uploadResult | ConvertTo-Json -Depth 10

    # 3. List files
    Write-Host "`n3. Listing all files..."
    $files = Invoke-RestMethod -Uri "$baseUrl/files"
    $files | ConvertTo-Json -Depth 10

    # 4. Get metadata
    Write-Host "`n4. Getting file metadata..."
    $metadata = Invoke-RestMethod -Uri "$baseUrl/files/$fileId"
    $metadata | ConvertTo-Json -Depth 10

    # 5. Download file
    Write-Host "`n5. Downloading file..."
    $downloadUri = "$baseUrl/download/$fileId"
    Invoke-RestMethod -Uri $downloadUri -OutFile "downloaded-test.txt"
    Write-Host "File downloaded to: downloaded-test.txt"

    # 6. Delete file
    Write-Host "`n6. Deleting file..."
    $deleteResult = Invoke-RestMethod -Uri "$baseUrl/files/$fileId" -Method Delete
    $deleteResult | ConvertTo-Json -Depth 10

    # 7. Verify deletion
    Write-Host "`n7. Listing files after deletion..."
    $filesAfter = Invoke-RestMethod -Uri "$baseUrl/files"
    $filesAfter | ConvertTo-Json -Depth 10

    Write-Host "`n$("=" * 60)"
    Write-Host "All tests completed successfully!"
    Write-Host "=" * 60

} catch {
    Write-Host "Test failed: $_" -ForegroundColor Red
    exit 1
} finally {
    # Cleanup
    if (Test-Path $testFile) {
        Remove-Item $testFile
    }
    if (Test-Path "downloaded-test.txt") {
        Remove-Item "downloaded-test.txt"
    }
}
```

## Using Bash

Create a file `test.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api"
TEST_FILE="test.txt"

echo "============================================================"
echo "File Upload Service - Test Script"
echo "============================================================"

# Create test file
echo "This is a test file for upload service." > $TEST_FILE

# 1. Health Check
echo -e "\n1. Health Check..."
curl -s $BASE_URL/health | jq '.'

# 2. Upload file
echo -e "\n2. Uploading file..."
UPLOAD_RESPONSE=$(curl -s -X POST $BASE_URL/upload -F "file=@$TEST_FILE")
echo $UPLOAD_RESPONSE | jq '.'
FILE_ID=$(echo $UPLOAD_RESPONSE | jq -r '.data.fileId')

# 3. List files
echo -e "\n3. Listing all files..."
curl -s $BASE_URL/files | jq '.'

# 4. Get metadata
echo -e "\n4. Getting file metadata..."
curl -s $BASE_URL/files/$FILE_ID | jq '.'

# 5. Download file
echo -e "\n5. Downloading file..."
curl -s $BASE_URL/download/$FILE_ID --output downloaded-test.txt
echo "File downloaded to: downloaded-test.txt"

# 6. Delete file
echo -e "\n6. Deleting file..."
curl -s -X DELETE $BASE_URL/files/$FILE_ID | jq '.'

# 7. Verify deletion
echo -e "\n7. Listing files after deletion..."
curl -s $BASE_URL/files | jq '.'

echo -e "\n============================================================"
echo "All tests completed successfully!"
echo "============================================================"

# Cleanup
rm -f $TEST_FILE downloaded-test.txt
```

Make it executable:
```bash
chmod +x test.sh
```

## Simple curl Tests

```bash
# Create a test file
echo "Test content" > test.txt

# Upload
curl -X POST http://localhost:3000/api/upload -F "file=@test.txt"

# Copy the fileId from the response, then:

# List
curl http://localhost:3000/api/files

# Download (replace YOUR_FILE_ID)
curl http://localhost:3000/api/download/YOUR_FILE_ID --output downloaded.txt

# Delete (replace YOUR_FILE_ID)
curl -X DELETE http://localhost:3000/api/files/YOUR_FILE_ID

# Cleanup
rm test.txt downloaded.txt
```

## Expected Output

### Successful Upload
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "fileId": "test_1737281400000_abc123def456.txt",
    "originalName": "test.txt",
    "filename": "test_1737281400000_abc123def456.txt",
    "size": 40,
    "sizeFormatted": "0.04 KB",
    "mimeType": "text/plain",
    "uploadedAt": "2026-01-19T10:30:00.000Z",
    "expiresAt": "2026-01-20T10:30:00.000Z"
  }
}
```

### File List
```json
{
  "success": true,
  "data": {
    "files": [...],
    "summary": {
      "totalFiles": 1,
      "totalStorage": 40,
      "totalStorageFormatted": "0.00 MB",
      "maxStorage": "1000 MB",
      "usagePercentage": "0.00%"
    }
  }
}
```

## Testing Error Scenarios

### Upload Invalid File Type
```bash
# Create an executable
echo "#!/bin/bash" > malicious.sh

# Try to upload (should be rejected)
curl -X POST http://localhost:3000/api/upload -F "file=@malicious.sh"

# Expected: Error about blocked extension
```

### Upload Oversized File
```bash
# Create large file (if MAX_FILE_SIZE_MB=10)
dd if=/dev/zero of=large.bin bs=1M count=20

# Try to upload (should be rejected)
curl -X POST http://localhost:3000/api/upload -F "file=@large.bin"

# Expected: Error about file size limit
```

### Invalid File ID
```bash
# Try path traversal
curl http://localhost:3000/api/files/../../../etc/passwd

# Expected: Error about invalid file ID
```

---

**Choose your preferred testing method and start testing!**
