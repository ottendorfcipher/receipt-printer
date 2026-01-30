# Receipt Printer - Printing Guide

## ✅ New Simplified Printing Method

The app now uses **server-side printing** through Windows printer drivers - much more reliable than Web Serial API!

## 🚀 Quick Start

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Open browser:** `http://localhost:3000`

3. **Select your printer** from the dropdown (auto-refreshes on load)

4. **Click "Print Receipt"** - Done!

## 🔧 How It Works

### Server-Side Printing (Current Method)
- Server sends print data directly to Windows printer
- Uses Windows printer spooler
- Works with USB, Network, or Serial printers
- No browser permissions needed

### Components:
1. **Browser UI** → Sends receipt data as JSON
2. **Node Server** → Generates ESC/POS commands
3. **Windows** → Routes to printer via driver

## 🖨️ Printer Setup

### Check Your Printer

1. **Windows Settings** → Devices → Printers & Scanners
2. Verify printer shows as "Ready"
3. Note the exact printer name

### Common Printer Names:
- `POS-80`
- `POS-80 Series`
- `Generic / Text Only`
- Your brand name (Epson TM-T20, Star TSP100, etc.)

### Test Printer in Windows

```powershell
# List all printers
Get-Printer | Select-Object Name, PrinterStatus

# Test print
echo "Test" | Out-Printer -Name "POS-80"
```

## 🐛 Troubleshooting

### Printer Not in Dropdown

**Cause:** Server can't find printer  
**Fix:**
1. Check printer is powered on
2. Verify printer in Windows Settings
3. Click "Refresh Printer List"
4. Restart server if needed

### "Print Failed" Error

**Check these in order:**

1. **Printer Status**
   - Windows Settings → Printers
   - Status should be "Ready" not "Offline" or "Error"

2. **Printer Name**
   - Verify exact name in dropdown matches Windows
   - Names are case-sensitive

3. **Print Queue**
   - Check if there are stuck print jobs
   - Clear queue if needed

4. **Printer Connection**
   - USB: Try different USB port
   - Network: Verify IP is reachable
   - Restart printer

5. **Server Console**
   - Check terminal running `npm start`
   - Look for error messages
   - Note any PowerShell errors

### Nothing Prints (No Error)

**Possible causes:**

1. **Wrong Printer Selected**
   - Try selecting different printer from dropdown
   - Look for "Generic / Text Only" option

2. **Printer Paused**
   - Windows Settings → Printers → Right-click → "Resume"

3. **Paper Issue**
   - Check paper loaded correctly
   - Verify printer cover is closed
   - Ensure paper isn't jammed

4. **Driver Issue**
   - Try printing test page from Windows
   - Reinstall printer driver if needed

### Server Won't Start

```bash
# Kill any running node processes
taskkill /F /IM node.exe

# Restart
npm start
```

### Port Already in Use

```bash
# Use different port
PORT=8080 npm start
```

Then open: `http://localhost:8080`

## 🔍 Debug Mode

### Enable Detailed Logging

Edit `server.js` and look for console.log statements - they'll show:
- Printer name being used
- Print command being executed
- Any PowerShell errors

### Browser Console

Press F12 and check for:
- Network errors (failed API calls)
- JavaScript errors
- Response data from server

## 💡 Advanced Fixes

### Try Different Print Command

Edit `server.js` line ~117:

```javascript
// Current method
const printCommand = `Copy-Item -Path "${tempFile}" -Destination "\\\\localhost\\${printerName}"`;

// Alternative: Use printer share
const printCommand = `type "${tempFile}" > "\\\\${process.env.COMPUTERNAME}\\${printerName}"`;
```

### Share Your Printer

1. Windows Settings → Printers
2. Right-click printer → "Printer properties"
3. Sharing tab → Share this printer
4. Use share name in dropdown

### Use Generic Text Printer

If ESC/POS doesn't work:
1. Add "Generic / Text Only" printer in Windows
2. Select it in dropdown
3. Print (formatting will be basic but should work)

## 🎯 Best Practices

### For Production Use:

1. **Set Default Printer**
   ```bash
   # Set environment variable
   PRINTER_NAME=YourPrinterName npm start
   ```

2. **Static Printer**
   Edit `server.js` line ~114:
   ```javascript
   const printerName = 'Your-Printer-Name'; // Hardcode it
   ```

3. **Error Handling**
   - Monitor server logs
   - Set up automatic restart
   - Add retry logic

## 📞 Still Not Working?

### Information to Gather:

1. **Printer Details:**
   - Brand and model
   - Connection type (USB/Network)
   - Windows name (exact)

2. **Error Messages:**
   - Server console output
   - Browser console (F12)
   - Windows Event Viewer

3. **Test Results:**
   ```powershell
   # Run this and share output
   Get-Printer | Format-List *
   ```

### Common Working Configurations:

| Printer | Connection | Driver | Works |
|---------|------------|--------|-------|
| POS-80 | USB | Generic | ✅ |
| Epson TM-T20 | USB | Epson | ✅ |
| Star TSP100 | Ethernet | Star | ✅ |
| Generic Text | Any | Generic | ✅ |

## 🔄 Reset Everything

If all else fails:

```bash
# 1. Stop server
Ctrl+C

# 2. Clean install
rm -rf node_modules
npm install

# 3. Restart
npm start

# 4. Hard refresh browser
Ctrl+Shift+R
```

## 📚 Additional Resources

- [ESC/POS Command Reference](https://reference.epson-biz.com/modules/ref_escpos/index.php)
- [Windows Print Spooler](https://docs.microsoft.com/en-us/windows/win32/printdocs/printer-spooler)
- Server code: `server.js`
- Client code: `public/app.js`
