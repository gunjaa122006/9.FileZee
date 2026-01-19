# Quick Test Script for File Upload Service
# Run this after starting the server with: npm start

$baseUrl = "http://localhost:3000/api"
$testFile = "test-upload.txt"

Write-Host "`n" -NoNewline
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host "  File Upload Service - Quick Test" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan

# Create test file
Write-Host "`n[1/7] Creating test file..." -ForegroundColor Yellow
"Hello from File Upload Service! Timestamp: $(Get-Date)" | Out-File -FilePath $testFile -Encoding utf8
Write-Host "      Created: $testFile" -ForegroundColor Green

try {
    # Health Check
    Write-Host "`n[2/7] Checking service health..." -ForegroundColor Yellow
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -ErrorAction Stop
    Write-Host "      Status: $($health.status)" -ForegroundColor Green
    Write-Host "      Files: $($health.files.count)" -ForegroundColor Green
    Write-Host "      Storage: $($health.storage.used) / $($health.storage.max)" -ForegroundColor Green

    # Upload file
    Write-Host "`n[3/7] Uploading file..." -ForegroundColor Yellow
    $form = @{ file = Get-Item $testFile }
    $upload = Invoke-RestMethod -Uri "$baseUrl/upload" -Method Post -Form $form -ErrorAction Stop
    $fileId = $upload.data.fileId
    Write-Host "      Success! File ID: $fileId" -ForegroundColor Green
    Write-Host "      Original: $($upload.data.originalName)" -ForegroundColor Green
    Write-Host "      Size: $($upload.data.sizeFormatted)" -ForegroundColor Green
    Write-Host "      Expires: $($upload.data.expiresAt)" -ForegroundColor Green

    # List files
    Write-Host "`n[4/7] Listing all files..." -ForegroundColor Yellow
    $files = Invoke-RestMethod -Uri "$baseUrl/files" -ErrorAction Stop
    Write-Host "      Total files: $($files.data.summary.totalFiles)" -ForegroundColor Green
    Write-Host "      Total storage: $($files.data.summary.totalStorageFormatted)" -ForegroundColor Green

    # Get file metadata
    Write-Host "`n[5/7] Getting file metadata..." -ForegroundColor Yellow
    $metadata = Invoke-RestMethod -Uri "$baseUrl/files/$fileId" -ErrorAction Stop
    Write-Host "      File ID: $($metadata.data.fileId)" -ForegroundColor Green
    Write-Host "      MIME Type: $($metadata.data.mimeType)" -ForegroundColor Green
    Write-Host "      Uploaded: $($metadata.data.uploadedAt)" -ForegroundColor Green

    # Download file
    Write-Host "`n[6/7] Downloading file..." -ForegroundColor Yellow
    $downloadPath = "downloaded-$testFile"
    Invoke-RestMethod -Uri "$baseUrl/download/$fileId" -OutFile $downloadPath -ErrorAction Stop
    $downloadedContent = Get-Content $downloadPath -Raw
    Write-Host "      Downloaded to: $downloadPath" -ForegroundColor Green
    Write-Host "      Content verified: $($downloadedContent -like '*Hello from File Upload Service*')" -ForegroundColor Green

    # Delete file
    Write-Host "`n[7/7] Deleting file..." -ForegroundColor Yellow
    $delete = Invoke-RestMethod -Uri "$baseUrl/files/$fileId" -Method Delete -ErrorAction Stop
    Write-Host "      File deleted: $($delete.data.fileId)" -ForegroundColor Green

    # Final summary
    Write-Host "`n" -NoNewline
    Write-Host ("=" * 70) -ForegroundColor Green
    Write-Host "  ✓ ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host ("=" * 70) -ForegroundColor Green
    Write-Host "`n  The file upload service is working correctly!" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host "`n" -NoNewline
    Write-Host ("=" * 70) -ForegroundColor Red
    Write-Host "  ✗ TEST FAILED" -ForegroundColor Red
    Write-Host ("=" * 70) -ForegroundColor Red
    Write-Host "`n  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Message -like "*Unable to connect*") {
        Write-Host "  Make sure the server is running:" -ForegroundColor Yellow
        Write-Host "    npm start" -ForegroundColor Cyan
    }
    
    exit 1
} finally {
    # Cleanup
    Write-Host "Cleaning up test files..." -ForegroundColor Gray
    if (Test-Path $testFile) { Remove-Item $testFile -Force }
    if (Test-Path "downloaded-$testFile") { Remove-Item "downloaded-$testFile" -Force }
}

Write-Host ""
