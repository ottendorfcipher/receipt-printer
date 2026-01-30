param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$Printer
)

Write-Host "[print-receipt.ps1] Starting print job" -ForegroundColor Cyan
Write-Host "  Path   : $Path" -ForegroundColor Cyan
Write-Host "  Printer: $Printer" -ForegroundColor Cyan

if (-not (Test-Path -LiteralPath $Path)) {
    Write-Error "File not found: $Path"
    exit 1
}

# C# helper to send RAW bytes directly to the printer spooler
$rawPrinterHelper = @"
using System;
using System.Runtime.InteropServices;

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

# Only add the type once per PowerShell session
if (-not ('RawPrinterHelper' -as [type])) {
    Add-Type -TypeDefinition $rawPrinterHelper -ErrorAction Stop | Out-Null
}

try {
    # Read raw ESC/POS bytes
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    Write-Host "[print-receipt.ps1] Read" $bytes.Length "bytes" -ForegroundColor Cyan

    # Send RAW bytes directly to printer
    $ok = [RawPrinterHelper]::SendBytesToPrinter($Printer, $bytes)

    if (-not $ok) {
        Write-Error "[print-receipt.ps1] Failed to send RAW data to printer $Printer"
        exit 1
    }

    Write-Host "[print-receipt.ps1] Print job sent successfully" -ForegroundColor Green
} catch {
    Write-Error "[print-receipt.ps1] Print failed: $($_.Exception.Message)"
    exit 1
}
