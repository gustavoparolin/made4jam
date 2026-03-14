$ErrorActionPreference = "Stop"

# Set paths
$rootDir = $PSScriptRoot
$frontendDir = Join-Path $rootDir "frontend"
$apiDir = Join-Path $rootDir "api"
$deployDir = Join-Path $rootDir "deploy_package"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🚀 Preparing Made4Jam Deployment Package" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Build the frontend
Write-Host "`n📦 Building React Frontend..." -ForegroundColor Yellow
Set-Location $frontendDir
npm run build
Set-Location $rootDir

# 2. Prepare deployment folder
Write-Host "`n🧹 Cleaning up old deployment package..." -ForegroundColor Yellow
if (Test-Path $deployDir) {
    Remove-Item -Path $deployDir -Recurse -Force
}
New-Item -ItemType Directory -Path $deployDir | Out-Null

# 3. Copy frontend dist files into the root of the deploy folder
Write-Host "📂 Copying Frontend files..." -ForegroundColor Yellow
Copy-Item -Path "$frontendDir\dist\*" -Destination $deployDir -Recurse

# 4. Copy API files into an api subfolder
Write-Host "⚙️  Copying API files..." -ForegroundColor Yellow
$apiDeployDir = Join-Path $deployDir "api"
New-Item -ItemType Directory -Path $apiDeployDir | Out-Null

# We exclude .env so you don't accidentally overwrite your production production database credentials!
Copy-Item -Path "$apiDir\*" -Destination $apiDeployDir -Recurse -Exclude ".env"

Write-Host "`n✅ Deployment Package Ready!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "The folder '$deployDir' now exactly matches your server structure:"
Write-Host "  /deploy_package/"
Write-Host "  ├── api/              <-- (Backend files, minus your local .env)"
Write-Host "  ├── assets/           <-- (Compiled JS/CSS)"
Write-Host "  ├── index.html        <-- (React entry)"
Write-Host "  └── .htaccess         <-- (React routing)"
Write-Host ""
Write-Host "👉 INSTRUCTIONS:" -ForegroundColor Magenta
Write-Host "Just drag and drop the CONTENTS of the '$deployDir' folder directly into"
Write-Host "your /www/made4jam/ folder on your FTP client/cPanel."
Write-Host "=========================================" -ForegroundColor Cyan
