# Login and get token
$loginBody = @{
    email = "ali@test.com"
    password = "Test1234!"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://127.0.0.1:4000/api/auth/login" `
    -Method POST `
    -Body $loginBody `
    -ContentType "application/json"

$token = $response.accessToken
Write-Host "Token OK: $($token.Substring(0, 30))..."

# Get bots list
$headers = @{ Authorization = "Bearer $token" }
$bots = Invoke-RestMethod -Uri "http://127.0.0.1:4000/api/bots" -Method GET -Headers $headers

$firstBot = $bots.items[0]
Write-Host "First bot: $($firstBot.name) (ID: $($firstBot.id))"

# Test AI
$chatBody = @{
    botId = $firstBot.id
    sessionId = "test-session-$(Get-Random)"
    message = "Hello, introduce yourself in one sentence"
} | ConvertTo-Json

Write-Host ""
Write-Host "Sending message to AI..."

try {
    $aiResponse = Invoke-RestMethod -Uri "http://127.0.0.1:4000/api/ai/chat" `
        -Method POST `
        -Headers $headers `
        -Body $chatBody `
        -ContentType "application/json"

    Write-Host ""
    Write-Host "AI Response:"
    Write-Host $aiResponse.message
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  Tokens In: $($aiResponse.usage.tokensIn)"
    Write-Host "  Tokens Out: $($aiResponse.usage.tokensOut)"
    Write-Host "  Cost USD: $($aiResponse.usage.costUsd)"
} catch {
    Write-Host ""
    Write-Host "AI Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}