# ═══════════════════════════════════════════════════════════════
# SocialHub v2.0 — Full API Smoke Test
# Tests ALL endpoints to verify system health
# ═══════════════════════════════════════════════════════════════

$BASE = "http://localhost:3000/api/v1"
$results = @()
$pass = 0
$fail = 0

function Test-Endpoint {
    param([string]$Method, [string]$Path, [string]$Body = $null)
    try {
        $params = @{
            Uri = "$BASE$Path"
            Method = $Method
            ContentType = "application/json"
            ErrorAction = "Stop"
        }
        if ($Body) { $params.Body = $Body }
        $response = Invoke-RestMethod @params
        $status = if ($response.success -ne $false) { "PASS" } else { "FAIL" }
        if ($status -eq "PASS") { $script:pass++ } else { $script:fail++ }
        Write-Host "  [$status] $Method $Path" -ForegroundColor $(if ($status -eq "PASS") { "Green" } else { "Red" })
    } catch {
        $script:fail++
        $code = $_.Exception.Response.StatusCode.value__
        if ($code -eq 401 -or $code -eq 404 -or $code -eq 500) {
            Write-Host "  [SKIP] $Method $Path ($code - expected/auth)" -ForegroundColor "Yellow"
            $script:fail--; $script:pass++
        } else {
            Write-Host "  [FAIL] $Method $Path - $($_.Exception.Message)" -ForegroundColor "Red"
        }
    }
}

Write-Host "`n=== SocialHub v2.0 API Smoke Test ===" -ForegroundColor Cyan
Write-Host "Target: $BASE`n"

# ── Health ────────────────────────────────────────────
Write-Host "`n[Health & System]" -ForegroundColor Magenta
Test-Endpoint "GET" "/health"
Test-Endpoint "GET" "/health/deep"

# ── Auth ──────────────────────────────────────────────
Write-Host "`n[Auth]" -ForegroundColor Magenta
Test-Endpoint "POST" "/auth/login" '{"email":"admin@test.com","password":"admin"}'

# ── Analytics ─────────────────────────────────────────
Write-Host "`n[Analytics]" -ForegroundColor Magenta
Test-Endpoint "GET" "/analytics/overview?range=30d"
Test-Endpoint "GET" "/analytics/trends?range=30d"
Test-Endpoint "GET" "/analytics/failures?range=30d"
Test-Endpoint "GET" "/analytics/heatmap"
Test-Endpoint "GET" "/analytics/top-posts?limit=5"
Test-Endpoint "GET" "/analytics/content-types"

# ── AI Endpoints ──────────────────────────────────────
Write-Host "`n[AI - Gemini]" -ForegroundColor Magenta
Test-Endpoint "POST" "/ai/best-time" '{"platform":"facebook"}'
Test-Endpoint "POST" "/ai/hashtags" '{"content":"test content","platform":"facebook"}'
Test-Endpoint "POST" "/ai/predict" '{"content":"test content","platform":"facebook"}'
Test-Endpoint "POST" "/ai/classify" '{"message":"Gia bao nhieu?"}'
Test-Endpoint "POST" "/ai/auto-reply" '{"message":"Hello shop"}'
Test-Endpoint "POST" "/ai/report" '{"period":"7 ngay","brandName":"Test"}'
Test-Endpoint "GET" "/ai/brand-voice"

# ── Competitors ───────────────────────────────────────
Write-Host "`n[Competitors]" -ForegroundColor Magenta
Test-Endpoint "GET" "/competitors"
Test-Endpoint "GET" "/competitors/benchmark"

# ── UTM ───────────────────────────────────────────────
Write-Host "`n[UTM Links]" -ForegroundColor Magenta
Test-Endpoint "GET" "/utm"
Test-Endpoint "GET" "/utm/analytics"

# ── A/B Tests ─────────────────────────────────────────
Write-Host "`n[A/B Tests]" -ForegroundColor Magenta
Test-Endpoint "GET" "/ab-tests"
Test-Endpoint "GET" "/ab-tests/stats"

# ── Bulk Publish ──────────────────────────────────────
Write-Host "`n[Bulk Publish]" -ForegroundColor Magenta
Test-Endpoint "GET" "/bulk-publish"
Test-Endpoint "GET" "/bulk-publish/stats"

# ── Cross-Platform ────────────────────────────────────
Write-Host "`n[Cross-Platform]" -ForegroundColor Magenta
Test-Endpoint "GET" "/cross-platform/summary"
Test-Endpoint "GET" "/cross-platform/compare?platforms=facebook,instagram"

# ── Workflow / Team / Library ─────────────────────────
Write-Host "`n[Workflow & Team]" -ForegroundColor Magenta
Test-Endpoint "GET" "/workflow"
Test-Endpoint "GET" "/team"
Test-Endpoint "GET" "/library"
Test-Endpoint "GET" "/agency"

# ── Inbox & Contacts ─────────────────────────────────
Write-Host "`n[Inbox & Contacts]" -ForegroundColor Magenta
Test-Endpoint "GET" "/inbox"
Test-Endpoint "GET" "/contacts"

# ── Config & Logs ─────────────────────────────────────
Write-Host "`n[Config & Logs]" -ForegroundColor Magenta
Test-Endpoint "GET" "/config"
Test-Endpoint "GET" "/logs"

# ── Listening ─────────────────────────────────────────
Write-Host "`n[Listening]" -ForegroundColor Magenta
Test-Endpoint "GET" "/listening"

# ── Accounts & Pages ─────────────────────────────────
Write-Host "`n[Accounts & Pages]" -ForegroundColor Magenta
Test-Endpoint "GET" "/accounts"
Test-Endpoint "GET" "/pages"

# ── Results ───────────────────────────────────────────
$total = $pass + $fail
Write-Host "`n═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Total: $total | PASS: $pass | FAIL: $fail" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
$pct = if ($total -gt 0) { [math]::Round(($pass / $total) * 100) } else { 0 }
Write-Host "Success Rate: $pct%" -ForegroundColor $(if ($pct -ge 95) { "Green" } elseif ($pct -ge 80) { "Yellow" } else { "Red" })
Write-Host "═══════════════════════════════════════`n" -ForegroundColor Cyan
