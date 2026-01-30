# Receipt Printer Test Script
# Generates a test receipt and prints it to POS-80

# ESC/POS command bytes
$ESC = [char]0x1B
$GS = [char]0x1D
$LF = [char]0x0A

# Build receipt data
$receipt = ""

# Initialize printer
$receipt += "$ESC@"

# Header - Store Name (centered, double size, bold)
$receipt += "$ESC" + "a" + [char]1  # Center alignment
$receipt += "$GS!" + [char]0x11     # Double size (width=1, height=1)
$receipt += "$ESC" + "E" + [char]1  # Bold on
$receipt += "MY AWESOME STORE"
$receipt += $LF
$receipt += "$ESC" + "E" + [char]0  # Bold off
$receipt += "$GS!" + [char]0        # Normal size

# Address
$receipt += "123 Main Street, City, ST 12345"
$receipt += $LF
$receipt += "Tel: (555) 123-4567"
$receipt += $LF

# Separator
$receipt += "$ESC" + "a" + [char]0  # Left alignment
$receipt += ("-" * 48)
$receipt += $LF

# Receipt Info
$receipt += "Receipt No: R-2024-001"
$receipt += $LF
$receipt += "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$receipt += $LF
$receipt += "Cashier: John Doe"
$receipt += $LF
$receipt += ("-" * 48)
$receipt += $LF

# Items
$receipt += "Coffee - Large"
$receipt += $LF
$receipt += "  2 x `$4.50          `$9.00"
$receipt += $LF

$receipt += "Croissant"
$receipt += $LF
$receipt += "  1 x `$3.25          `$3.25"
$receipt += $LF

$receipt += "Orange Juice"
$receipt += $LF
$receipt += "  1 x `$3.00          `$3.00"
$receipt += $LF

# Totals
$receipt += ("-" * 48)
$receipt += $LF
$receipt += "$ESC" + "a" + [char]2  # Right alignment
$receipt += "Subtotal: `$15.25"
$receipt += $LF
$receipt += "Tax: `$1.37"
$receipt += $LF

# Total (bold, large)
$receipt += "$ESC" + "E" + [char]1  # Bold on
$receipt += "$GS!" + [char]0x11     # Double size
$receipt += "TOTAL: `$16.62"
$receipt += $LF
$receipt += "$GS!" + [char]0        # Normal size
$receipt += "$ESC" + "E" + [char]0  # Bold off

$receipt += ("-" * 48)
$receipt += $LF

# Payment
$receipt += "$ESC" + "a" + [char]0  # Left alignment
$receipt += "Payment Method: Cash"
$receipt += $LF
$receipt += "Amount Paid: `$20.00"
$receipt += $LF
$receipt += "Change: `$3.38"
$receipt += $LF
$receipt += ("-" * 48)
$receipt += $LF

# Footer
$receipt += "$ESC" + "a" + [char]1  # Center alignment
$receipt += $LF
$receipt += "Thank you for your purchase!"
$receipt += $LF
$receipt += "Please visit us again!"
$receipt += $LF
$receipt += $LF
$receipt += $LF
$receipt += $LF

# Feed and cut
$receipt += "$ESC" + "d" + [char]5  # Feed 5 lines for clean cut
$receipt += "$GS" + "V" + [char]66 + [char]50   # Cut paper with feed (GS V 66 n)
# Fallback: Also send standard partial cut
$receipt += "$GS" + "V" + [char]1   # Partial cut (GS V 1)

# Save to file
$tempFile = Join-Path $env:TEMP "receipt_$(Get-Date -Format 'yyyyMMddHHmmss').txt"
[System.IO.File]::WriteAllText($tempFile, $receipt, [System.Text.Encoding]::ASCII)

Write-Host "Receipt data generated: $tempFile" -ForegroundColor Green
Write-Host "Sending to printer POS-80..." -ForegroundColor Yellow

try {
    # Print to POS-80
    Get-Content $tempFile -Raw | Out-Printer -Name "POS-80"
    Write-Host "✓ Receipt printed successfully!" -ForegroundColor Green
} catch {
    Write-Host "✗ Print failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nAvailable printers:" -ForegroundColor Yellow
    Get-Printer | Select-Object Name, PortName | Format-Table -AutoSize
}

# Clean up
Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
