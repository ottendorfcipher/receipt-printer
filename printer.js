const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';

// Optional environment overrides for printer classification.
// RECEIPT_PRINTER_HINTS: comma-separated substrings that indicate a receipt printer.
// PDF_PRINTER_HINTS: comma-separated substrings that indicate a PDF/virtual printer.
const RECEIPT_HINTS = (process.env.RECEIPT_PRINTER_HINTS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

const PDF_HINTS = (process.env.PDF_PRINTER_HINTS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

function mapWindowsStatus(printerInfo) {
    const workOffline = Boolean(printerInfo.WorkOffline);
    const codeRaw = printerInfo.PrinterStatus;
    const code = typeof codeRaw === 'number' ? codeRaw : parseInt(codeRaw, 10);

    if (workOffline) {
        return { status: 'Offline (Work Offline)', isReady: false };
    }

    switch (code) {
        case 2: // Idle
            return { status: 'Idle', isReady: true };
        case 3: // Printing
            return { status: 'Printing', isReady: true };
        case 4: // WarmingUp
            return { status: 'Warming up', isReady: false };
        case 5: // StoppedPrinting
            return { status: 'Stopped printing', isReady: false };
        case 6: // Offline
            return { status: 'Offline', isReady: false };
        default:
            return { status: 'Unknown', isReady: false };
    }
}

function isPdfPrinterName(name) {
    if (!name) return false;
    const n = String(name).toLowerCase();

    if (n.includes('pdf')) return true;
    if (PDF_HINTS.length) {
        if (PDF_HINTS.some(h => n.includes(h))) return true;
    }

    return false;
}

function isReceiptPrinterName(name) {
    if (!name) return false;
    const n = String(name).toLowerCase();
    // Heuristics for common receipt printer names.
    if (
        n.includes('pos') ||
        n.includes('receipt') ||
        n.includes('80mm') ||
        n.includes('80 mm') ||
        n.includes('tm-') ||
        n.includes('epson') ||
        n.includes('star')
    ) {
        return true;
    }

    if (RECEIPT_HINTS.length) {
        if (RECEIPT_HINTS.some(h => n.includes(h))) return true;
    }

    return false;
}

function createPrinter(execFn = (cmd) => execPromise(cmd)) {
    async function sendToPrinter(receiptBuffer, printerNameFromRequest) {
        const printerName = printerNameFromRequest || process.env.PRINTER_NAME || 'POS-80';
        const tempFile = path.join(__dirname, `temp_receipt_${Date.now()}.bin`);

        fs.writeFileSync(tempFile, receiptBuffer);

        try {
            console.log('Printing to:', printerName);
            console.log('Temp file created:', tempFile);
            console.log('File size:', fs.statSync(tempFile).size, 'bytes');

            if (isWindows) {
                const scriptPath = path.join(__dirname, 'print-receipt.ps1');
                const cmd = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -Path "${tempFile}" -Printer "${printerName}"`;
                console.log('Executing:', cmd);
                const { stdout, stderr } = await execFn(cmd);
                if (stdout) console.log('[PowerShell stdout]', stdout);
                if (stderr) console.error('[PowerShell stderr]', stderr);
            } else if (isMac) {
                const cmd = printerName
                    ? `lp -d "${printerName}" "${tempFile}"`
                    : `lp "${tempFile}"`;
                console.log('Executing:', cmd);
                const { stdout, stderr } = await execFn(cmd);
                if (stdout) console.log('[lp stdout]', stdout);
                if (stderr) console.error('[lp stderr]', stderr);
            } else {
                throw new Error(`Printing is only implemented for Windows and macOS (current platform: ${process.platform})`);
            }
        } finally {
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
        }
    }

    async function listPrinters() {
        if (isWindows) {
            const command = 'powershell -Command "Get-Printer | Select-Object Name, PrinterStatus, WorkOffline | ConvertTo-Json"';
            const { stdout } = await execFn(command);

            let printers = JSON.parse(stdout);
            if (!Array.isArray(printers)) {
                printers = [printers];
            }

            return printers
                .map((p) => {
                    const mapped = mapWindowsStatus(p);
                    const name = p.Name;
                    const isPdf = isPdfPrinterName(name);
                    const isReceipt = isReceiptPrinterName(name);
                    return {
                        name,
                        status: mapped.status,
                        isReady: mapped.isReady,
                        isPdf,
                        isReceipt
                    };
                })
                .filter((p) => p.isPdf || p.isReceipt);
        }

        if (isMac) {
            const command = 'lpstat -p';
            const { stdout } = await execFn(command);

            return stdout
                .split('\n')
                .filter((line) => line.trim().startsWith('printer '))
                .map((line) => {
                    const parts = line.split(/\s+/);
                    const name = parts[1];
                    const status = parts.includes('idle') ? 'Idle' : 'Unknown';
                    const isPdf = isPdfPrinterName(name);
                    const isReceipt = isReceiptPrinterName(name);
                    return {
                        name,
                        status,
                        isReady: status === 'Idle',
                        isPdf,
                        isReceipt
                    };
                })
                .filter((p) => p.isPdf || p.isReceipt);
        }

        throw new Error('Listing printers is only implemented for Windows and macOS.');
    }

    async function getPrinterStatus(printerNameFromRequest) {
        const printerName = printerNameFromRequest || process.env.PRINTER_NAME || 'POS-80';

        if (isWindows) {
            const command = `powershell -Command "Get-Printer -Name '${printerName}' | Select-Object Name, PrinterStatus, WorkOffline, JobCount, Shared | ConvertTo-Json"`;
            const { stdout } = await execFn(command);
            const printerInfo = JSON.parse(stdout);
            const mapped = mapWindowsStatus(printerInfo);

            return {
                name: printerInfo.Name,
                status: mapped.status,
                isReady: mapped.isReady,
                jobCount: printerInfo.JobCount,
                shared: printerInfo.Shared
            };
        }

        if (isMac) {
            const command = `lpstat -p "${printerName}"`;
            const { stdout } = await execFn(command);

            if (!stdout) {
                throw new Error('Printer not found');
            }

            const firstLine = stdout.split('\n').find((line) => line.trim().startsWith('printer '));
            if (!firstLine) {
                throw new Error('Printer not found');
            }

            const parts = firstLine.split(/\s+/);
            const name = parts[1];
            const status = parts.includes('idle') ? 'Idle' : 'Unknown';

            return {
                name,
                status,
                isReady: status === 'Idle',
                isPdf: isPdfPrinterName(name),
                isReceipt: isReceiptPrinterName(name),
                jobCount: undefined,
                shared: undefined
            };
        }

        throw new Error('Printer status is only implemented for Windows and macOS.');
    }

    return {
        sendToPrinter,
        listPrinters,
        getPrinterStatus
    };
}

// Default instance used by the app
const defaultPrinter = createPrinter();

module.exports = {
    isWindows,
    isMac,
    createPrinter,
    sendToPrinter: defaultPrinter.sendToPrinter,
    listPrinters: defaultPrinter.listPrinters,
    getPrinterStatus: defaultPrinter.getPrinterStatus
};
