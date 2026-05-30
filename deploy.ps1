# Set console encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   GitHub Pages Zero-Install One-Click Deployer" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "ℹ This script does NOT require Git to be installed on your computer." -ForegroundColor Gray
Write-Host "ℹ It uses GitHub REST APIs to upload files and configure GitHub Pages." -ForegroundColor Gray
Write-Host ""

# 1. Ask for Token
$token = Read-Host "👉 Please paste your GitHub Personal Access Token (PAT)"
if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "[ERROR] Token cannot be empty!" -ForegroundColor Red
    Start-Sleep -Seconds 3
    Exit
}

# Clean token string
$token = $token.Trim()

$headers = @{
    "Authorization" = "Bearer $token"
    "Accept"        = "application/vnd.github+json"
    "User-Agent"    = "PowerShell-Deployer"
}

# 2. Get GitHub Username
Write-Host "Connecting to GitHub..." -ForegroundColor Yellow
try {
    $userResponse = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers -Method Get
    $username = $userResponse.login
    Write-Host "✔ Successfully authenticated as: $username" -ForegroundColor Green
} catch {
    Write-Host "❌ Authentication failed! Please check your Token." -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errBody = $reader.ReadToEnd()
        Write-Host "GitHub Error: $errBody" -ForegroundColor Red
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host "Press any key to exit..." -ForegroundColor White
    $null = [Console]::ReadKey()
    Exit
}

# 3. Create Repository (linear-algebra-geometry)
$repoName = "linear-algebra-geometry"
Write-Host "Creating repository '$repoName' on GitHub..." -ForegroundColor Yellow
$repoBody = @{
    name = $repoName
    description = "考研线性代数几何图像化学习系统"
    private = $false
    has_issues = $false
    has_projects = $false
    has_wiki = $false
} | ConvertTo-Json

$repoCreated = $false
try {
    $createResponse = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Headers $headers -Method Post -Body $repoBody -ContentType "application/json"
    Write-Host "✔ Repository '$repoName' created successfully!" -ForegroundColor Green
    $repoCreated = $true
} catch {
    # Check if repository already exists (StatusCode 422)
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode -eq [System.Net.HttpStatusCode]::UnprocessableEntity) {
        Write-Host "ℹ Repository '$repoName' already exists. Preparing to update files..." -ForegroundColor Cyan
    } else {
        Write-Host "❌ Failed to create repository: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Press any key to exit..." -ForegroundColor White
        $null = [Console]::ReadKey()
        Exit
    }
}

# 4. Find and Upload local files in D:\linear
Write-Host "Scanning local files in D:\linear..." -ForegroundColor Yellow
$rootPath = "D:\linear"
$files = Get-ChildItem -Path $rootPath -Recurse -File

# Files to exclude from upload
$excludeList = @(".git", "deploy.bat", "deploy.ps1")

foreach ($file in $files) {
    # Calculate relative path
    $relativePath = $file.FullName.Substring($rootPath.Length + 1).Replace("\", "/")
    
    # Check exclusions
    $exclude = $false
    foreach ($ex in $excludeList) {
        if ($relativePath.StartsWith($ex) -or $relativePath -eq $ex) {
            $exclude = $true
            break
        }
    }
    if ($exclude) { continue }
    
    Write-Host "Uploading: $relativePath..." -ForegroundColor Yellow
    
    # Read file content and encode to Base64
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $base64Content = [Convert]::ToBase64String($bytes)
    
    # Check if file exists on GitHub to get its SHA (needed for updates)
    $sha = $null
    try {
        $fileResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/$username/$repoName/contents/$relativePath" -Headers $headers -Method Get
        $sha = $fileResponse.sha
    } catch {
        # 404 is expected if file doesn't exist, ignore and create new
    }
    
    # Prepare payload
    $bodyHash = @{
        message = "Upload $relativePath via Zero-Install Deployer"
        content = $base64Content
    }
    if ($sha) {
        $bodyHash.sha = $sha
    }
    # Ensure JSON doesn't get messed up by large strings
    $body = $bodyHash | ConvertTo-Json -Depth 10 -Compress
    
    # UTF8 encode body bytes to prevent Invoke-RestMethod encoding problems on non-English files
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    
    # Upload file
    try {
        $uploadResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/$username/$repoName/contents/$relativePath" -Headers $headers -Method Put -Body $bodyBytes -ContentType "application/json; charset=utf-8"
        Write-Host "✔ Uploaded successfully!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to upload $relativePath: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 5. Enable GitHub Pages
Write-Host "Waiting 6 seconds for GitHub to sync branch..." -ForegroundColor Yellow
Start-Sleep -Seconds 6

Write-Host "Enabling GitHub Pages..." -ForegroundColor Yellow
$pagesBody = @{
    source = @{
        branch = "main"
        path = "/"
    }
} | ConvertTo-Json

try {
    $pagesResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/$username/$repoName/pages" -Headers $headers -Method Post -Body $pagesBody -ContentType "application/json"
    Write-Host "✔ GitHub Pages enabled successfully!" -ForegroundColor Green
} catch {
    # If Pages is already enabled (conflict), ignore.
    Write-Host "ℹ GitHub Pages setup completed!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "🎉 SUCCESS! Your app is successfully hosted on GitHub!" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Your Live Website URL: https://$username.github.io/$repoName/" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor White
$null = [Console]::ReadKey()
