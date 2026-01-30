# Test Different Cut Commands
# Tests various ESC/POS cut commands to find which works

$ESC = [char]0x1B
$GS = [char]0x1D
$LF = [char]0x0A

Write-Host "Testing cut commands for POS-80 printer..." -ForegroundColor Cyan
Write-Host ""

# Test 1: GS V 0 (Standard partial cut)
Write-Host "Test 1: GS V 0 (Partial cut - most common)" -ForegroundColor Yellow
$receipt1 = ""
$receipt1 += "$ESC@"
$receipt1 += "TEST CUT #1"
$receipt1 += $LF
$receipt1 += "GS V 0"
$receipt1 += $LF
$receipt1 += $LF
$receipt1 += $LF
$receipt1 += "$GS" + "V" + [char]0

$tempFile = Join-Path $env:TEMP "cut_test1.txt"
[System.IO.File]::WriteAllText($tempFile, $receipt1, [System.Text.Encoding]::ASCII)
Get-Content $tempFile -Raw | Out-Printer -Name "POS-80"
Remove-Item $tempFile -Force
Start-Sleep -Seconds 2

# Test 2: GS V 1 (Full cut)
Write-Host "Test 2: GS V 1 (Full cut)" -ForegroundColor Yellow
$receipt2 = ""
$receipt2 += "$ESC@"
$receipt2 += "TEST CUT #2"
$receipt2 += $LF
$receipt2 += "GS V 1"
$receipt2 += $LF
$receipt2 += $LF
$receipt2 += $LF
$receipt2 += "$GS" + "V" + [char]1

$tempFile = Join-Path $env:TEMP "cut_test2.txt"
[System.IO.File]::WriteAllText($tempFile, $receipt2, [System.Text.Encoding]::ASCII)
Get-Content $tempFile -Raw | Out-Printer -Name "POS-80"
Remove-Item $tempFile -Force
Start-Sleep -Seconds 2

# Test 3: GS V 48 (Partial cut with ASCII value)
Write-Host "Test 3: GS V 48 (Partial cut ASCII)" -ForegroundColor Yellow
$receipt3 = ""
$receipt3 += "$ESC@"
$receipt3 += "TEST CUT #3"
$receipt3 += $LF
$receipt3 += "GS V 48"
$receipt3 += $LF
$receipt3 += $LF
$receipt3 += $LF
$receipt3 += "$GS" + "V" + [char]48

$tempFile = Join-Path $env:TEMP "cut_test3.txt"
[System.IO.File]::WriteAllText($tempFile, $receipt3, [System.Text.Encoding]::ASCII)
Get-Content $tempFile -Raw | Out-Printer -Name "POS-80"
Remove-Item $tempFile -Force
Start-Sleep -Seconds 2

# Test 4: GS V 49 (Full cut with ASCII value)
Write-Host "Test 4: GS V 49 (Full cut ASCII)" -ForegroundColor Yellow
$receipt4 = ""
$receipt4 += "$ESC@"
$receipt4 += "TEST CUT #4"
$receipt4 += $LF
$receipt4 += "GS V 49"
$receipt4 += $LF
$receipt4 += $LF
$receipt4 += $LF
$receipt4 += "$GS" + "V" + [char]49

$tempFile = Join-Path $env:TEMP "cut_test4.txt"
[System.IO.File]::WriteAllText($tempFile, $receipt4, [System.Text.Encoding]::ASCII)
Get-Content $tempFile -Raw | Out-Printer -Name "POS-80"
Remove-Item $tempFile -Force
Start-Sleep -Seconds 2

# Test 5: GS V m n (Cut with feed)
Write-Host "Test 5: GS V 66 30 (Cut with feed)" -ForegroundColor Yellow
$receipt5 = ""
$receipt5 += "$ESC@"
$receipt5 += "TEST CUT #5"
$receipt5 += $LF
$receipt5 += "GS V 66 30"
$receipt5 += $LF
$receipt5 += $LF
$receipt5 += $LF
$receipt5 += "$GS" + "V" + [char]66 + [char]30

$tempFile = Join-Path $env:TEMP "cut_test5.txt"
[System.IO.File]::WriteAllText($tempFile, $receipt5, [System.Text.Encoding]::ASCII)
Get-Content $tempFile -Raw | Out-Printer -Name "POS-80"
Remove-Item $tempFile -Force

Write-Host ""
Write-Host "All test cuts sent!" -ForegroundColor Green
Write-Host "Check your printer - which test number cut the paper?" -ForegroundColor Cyan
