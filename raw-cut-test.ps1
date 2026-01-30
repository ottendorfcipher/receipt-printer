# Raw ESC/POS Cut Test using Win32 RawPrinterHelper

param(
    [string]$PrinterName = 'POS-80'
)

# Add C# helper to send RAW bytes directly to printer (bypasses text drivers)
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
        di.pDocName = "RAW ESC/POS Test";
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
        Write-Host "✓ RAW data sent successfully." -ForegroundColor Green
    }
}

# Build a simple ESC/POS sequence: init, text, feed, cut
$ESC = 0x1B
$GS  = 0x1D

# Helper to append ASCII text and LF
function Add-Text([System.Collections.Generic.List[byte]]$list, [string]$text) {
    $bytes = [System.Text.Encoding]::ASCII.GetBytes($text)
    $list.AddRange($bytes)
    $list.Add(0x0A) # LF
}

$bytesList = New-Object System.Collections.Generic.List[byte]

# ESC @ initialize
$bytesList.Add($ESC)
$bytesList.Add(0x40)

Add-Text $bytesList "RAW CUT TEST"
Add-Text $bytesList "If you see this, raw ESC/POS is working."

# Feed a few lines
$bytesList.Add($ESC); $bytesList.Add(0x64); $bytesList.Add(0x03)  # ESC d 3

# Try the main cut command from manual: GS V 0  (partial cut)
$bytesList.Add($GS); $bytesList.Add(0x56); $bytesList.Add(0x00)

# Also try GS V 66 30 (cut with feed) immediately after
$bytesList.Add($GS); $bytesList.Add(0x56); $bytesList.Add(0x42); $bytesList.Add(0x1E)

# Convert list to array
$bytes = $bytesList.ToArray()

Write-Host "Using printer: $PrinterName" -ForegroundColor Cyan
Send-EscPosRaw -Printer $PrinterName -Bytes $bytes

Write-Host "If the cutter still does not move, the issue is likely printer settings (DIP/firmware) or hardware, not commands." -ForegroundColor Cyan
