# Raw ESC/POS Receipt Print with Cutter

param(
    [string]$PrinterName = 'POS-80'
)

# C# helper to send RAW bytes directly to the printer spooler
$rawPrinterHelper = @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class RawPrinterHelper
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public class DOCINFOW
    {
        [MarshalAs(UnmanagedType.LPWStr)]
        public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)]
        public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)]
        public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool OpenPrinter(string src, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In] DOCINFOW di);

    [DllImport("winspool.Drv", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static bool SendBytesToPrinter(string printerName, byte[] bytes)
    {
        IntPtr hPrinter;
        DOCINFOW di = new DOCINFOW();
        di.pDocName = "RAW ESC/POS Receipt";
        di.pDataType = "RAW";

        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
        {
            return false;
        }

        try
        {
            if (!StartDocPrinter(hPrinter, 1, di)) return false;
            if (!StartPagePrinter(hPrinter)) return false;

            IntPtr unmanagedBytes = Marshal.AllocHGlobal(bytes.Length);
            Marshal.Copy(bytes, 0, unmanagedBytes, bytes.Length);

            int bytesWritten;
            bool success = WritePrinter(hPrinter, unmanagedBytes, bytes.Length, out bytesWritten);

            Marshal.FreeHGlobal(unmanagedBytes);
            EndPagePrinter(hPrinter);
            EndDocPrinter(hPrinter);

            return success && bytesWritten == bytes.Length;
        }
        finally
        {
            ClosePrinter(hPrinter);
        }
    }
}
"@

Add-Type -TypeDefinition $rawPrinterHelper -ErrorAction Stop | Out-Null

function Send-EscPosRaw {
    param(
        [string]$Printer,
        [byte[]]$Bytes
    )

    Write-Host "Sending" $Bytes.Length "bytes RAW to printer '$Printer'..." -ForegroundColor Yellow
    $ok = [RawPrinterHelper]::SendBytesToPrinter($Printer, $Bytes)
    if (-not $ok) {
        Write-Host "✗ Failed to send RAW data to printer." -ForegroundColor Red
    } else {
        Write-Host "✓ RAW receipt sent successfully." -ForegroundColor Green
    }
}

# Build receipt as ESC/POS bytes
$ESC = 0x1B
$GS  = 0x1D

# Helper to append ASCII text + LF
function Add-Text([System.Collections.Generic.List[byte]]$list, [string]$text) {
    $bytes = [System.Text.Encoding]::ASCII.GetBytes($text)
    $list.AddRange($bytes)
    $list.Add(0x0A) # LF
}

$bytesList = New-Object System.Collections.Generic.List[byte]

# Initialize printer (ESC @)
$bytesList.Add($ESC); $bytesList.Add(0x40)

# --- HEADER ---
# Center alignment: ESC a 1
$bytesList.Add($ESC); $bytesList.Add(0x61); $bytesList.Add(0x01)
# Double size: GS ! 0x11
$bytesList.Add($GS);  $bytesList.Add(0x21); $bytesList.Add(0x11)
# Bold on: ESC E 1
$bytesList.Add($ESC); $bytesList.Add(0x45); $bytesList.Add(0x01)

Add-Text $bytesList 'MY AWESOME STORE'

# Bold off, normal size
$bytesList.Add($ESC); $bytesList.Add(0x45); $bytesList.Add(0x00)
$bytesList.Add($GS);  $bytesList.Add(0x21); $bytesList.Add(0x00)

Add-Text $bytesList '123 Main Street, City, ST 12345'
Add-Text $bytesList 'Tel: (555) 123-4567'

# Left alignment for body
$bytesList.Add($ESC); $bytesList.Add(0x61); $bytesList.Add(0x00)

# Separator
Add-Text $bytesList ('-' * 48)

# --- RECEIPT INFO ---
$now = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
Add-Text $bytesList 'Receipt No: R-2024-001'
Add-Text $bytesList ("Date: $now")
Add-Text $bytesList 'Cashier: John Doe'
Add-Text $bytesList ('-' * 48)

# --- ITEMS ---
Add-Text $bytesList 'Coffee - Large'
$line1 = '  2 x $4.50          $9.00'
Add-Text $bytesList $line1

Add-Text $bytesList 'Croissant'
$line2 = '  1 x $3.25          $3.25'
Add-Text $bytesList $line2

Add-Text $bytesList 'Orange Juice'
$line3 = '  1 x $3.00          $3.00'
Add-Text $bytesList $line3

# --- TOTALS ---
Add-Text $bytesList ('-' * 48)

# Right alignment
$bytesList.Add($ESC); $bytesList.Add(0x61); $bytesList.Add(0x02)
Add-Text $bytesList 'Subtotal: $15.25'
Add-Text $bytesList 'Tax: $1.37'

# Total in bold, double size
$bytesList.Add($ESC); $bytesList.Add(0x45); $bytesList.Add(0x01)
$bytesList.Add($GS);  $bytesList.Add(0x21); $bytesList.Add(0x11)
Add-Text $bytesList 'TOTAL: $16.62'
$bytesList.Add($GS);  $bytesList.Add(0x21); $bytesList.Add(0x00)
$bytesList.Add($ESC); $bytesList.Add(0x45); $bytesList.Add(0x00)

Add-Text $bytesList ('-' * 48)

# --- PAYMENT ---
$bytesList.Add($ESC); $bytesList.Add(0x61); $bytesList.Add(0x00) # left
Add-Text $bytesList 'Payment Method: Cash'
Add-Text $bytesList 'Amount Paid: $20.00'
Add-Text $bytesList 'Change: $3.38'
Add-Text $bytesList ('-' * 48)

# --- FOOTER ---
$bytesList.Add($ESC); $bytesList.Add(0x61); $bytesList.Add(0x01) # center
Add-Text $bytesList 'Thank you for your purchase!'
Add-Text $bytesList 'Please visit us again!'
Add-Text $bytesList ''
Add-Text $bytesList ''

# Extra feed before cut: ESC d 5
$bytesList.Add($ESC); $bytesList.Add(0x64); $bytesList.Add(0x05)

# --- CUT ---
# Partial cut: GS V 0
$bytesList.Add($GS); $bytesList.Add(0x56); $bytesList.Add(0x00)
# Also send GS V 66 30 (cut with feed) as backup
$bytesList.Add($GS); $bytesList.Add(0x56); $bytesList.Add(0x42); $bytesList.Add(0x1E)

# Convert to array and send
$bytes = $bytesList.ToArray()

Write-Host "Using printer: $PrinterName" -ForegroundColor Cyan
Send-EscPosRaw -Printer $PrinterName -Bytes $bytes
