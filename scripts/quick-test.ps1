# Quick Test Script for MetaUniverse Agent
# 快速验证关键功能是否正常

Write-Host "=== MetaUniverse Agent Quick Test ===" -ForegroundColor Green

# 1. Check file structure
Write-Host "`n1. Checking file structure..." -ForegroundColor Yellow
$files = @(
    ".vitepress/agent/agent.config.js",
    ".vitepress/agent/core/EventBus.ts",
    ".vitepress/agent/core/AgentRuntime.ts",
    ".vitepress/agent/runtime/StructuredLogger.ts",
    ".vitepress/agent/runtime/StructuredLogger.server.ts",
    ".vitepress/agent/skills/ResearchWithFallbackSkill.ts",
    ".vitepress/theme/components/ToastContainer.vue",
    "agent-docs/config.example.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (MISSING)" -ForegroundColor Red
    }
}

# 2. Check key configurations
Write-Host "`n2. Checking agent.config.js..." -ForegroundColor Yellow
$configContent = Get-Content ".vitepress/agent/agent.config.js" -Raw
if ($configContent -match "arxivDigest" -and $configContent -match "rssAggregator") {
    Write-Host "  ✓ Task configurations found" -ForegroundColor Green
} else {
    Write-Host "  ✗ Task configurations missing" -ForegroundColor Red
}

# 3. Check EventBus implementation
Write-Host "`n3. Checking EventBus implementation..." -ForegroundColor Yellow
$eventBusContent = Get-Content ".vitepress/agent/core/EventBus.ts" -Raw
if ($eventBusContent -match "class SimpleEventBus" -and $eventBusContent -match "private listeners") {
    Write-Host "  ✓ EventBus uses Map implementation (memory-safe)" -ForegroundColor Green
} else {
    Write-Host "  ✗ EventBus implementation issue" -ForegroundColor Red
}

# 4. Check StructuredLogger separation
Write-Host "`n4. Checking StructuredLogger separation..." -ForegroundColor Yellow
$loggerContent = Get-Content ".vitepress/agent/runtime/StructuredLogger.ts" -Raw
$serverLoggerContent = Get-Content ".vitepress/agent/runtime/StructuredLogger.server.ts" -Raw
if ($loggerContent -match "isBrowser" -and $serverLoggerContent -match "WinstonLogger") {
    Write-Host "  ✓ Browser/Server separation implemented" -ForegroundColor Green
} else {
    Write-Host "  ✗ Separation not complete" -ForegroundColor Red
}

# 5. Check memory leak fixes
Write-Host "`n5. Checking memory leak fixes..." -ForegroundColor Yellow
$sidebarContent = Get-Content ".vitepress/theme/composables/useDynamicSidebar.ts" -Raw
if ($sidebarContent -match "return \(\) => {" -and $sidebarContent -match "clearInterval") {
    Write-Host "  ✓ useDynamicSidebar has cleanup function" -ForegroundColor Green
} else {
    Write-Host "  ✗ useDynamicSidebar cleanup missing" -ForegroundColor Red
}

$articleManagerContent = Get-Content ".vitepress/theme/components/agent/ArticleManager.vue" -Raw
if ($articleManagerContent -match "clearInterval\(placeholderTimer\)") {
    Write-Host "  ✓ ArticleManager timer cleanup fixed" -ForegroundColor Green
} else {
    Write-Host "  ✗ ArticleManager timer cleanup missing" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Green
Write-Host "Run 'npm run docs:dev' to start the development server." -ForegroundColor Cyan
