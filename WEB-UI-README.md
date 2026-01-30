# Receipt Printer Web UI

A modern, user-friendly web interface for configuring and printing thermal receipts.

## Features

### 🎨 Design Principles
- **Human Interface Guidelines (HIG)** - Clean, intuitive layout with proper spacing
- **Nielsen Norman Group (NN/G)** - Immediate feedback, error prevention, recognition over recall
- **UX Laws** - Fitts's Law (large touch targets), Miller's Law (chunked info), Jakob's Law
- **KLM-GOMS** - Optimized for efficient user interactions

### ✨ Key Features
- ✅ Real-time receipt preview
- ✅ Auto-calculate totals, tax, and change
- ✅ Dynamic item management
- ✅ Direct browser-to-printer connection via Web Serial API
- ✅ Printer connection status indicator
- ✅ Form validation with helpful error messages
- ✅ Auto-generated receipt numbers
- ✅ Sample data for quick start
- ✅ Responsive design (mobile, tablet, desktop)

## Requirements

### Browser
- **Google Chrome** 89+ or **Microsoft Edge** 89+
- Web Serial API support (required for direct printing)
- Other browsers (Firefox, Safari) are not currently supported for printing

### Printer
- USB thermal receipt printer (ESC/POS compatible)
- 80mm paper width
- Examples: Epson TM-T20, Star TSP100, POS-80 series

## Getting Started

### 1. Start the Server

```bash
npm start
```

The server will start at `http://localhost:3000`

### 2. Open in Browser

Open **Google Chrome** or **Microsoft Edge** and navigate to:
```
http://localhost:3000
```

### 3. Connect Your Printer

1. Connect your thermal printer via USB
2. Click the printer icon (🖨️) in the "Printer Status" section
3. Select your printer from the browser dialog
4. Status will show 🟢 "Printer connected"

### 4. Configure Your Receipt

The form comes pre-loaded with sample data. Modify as needed:

- **Store Information** - Name, address, phone, tax ID
- **Receipt Details** - Receipt number (auto-generate available), cashier name
- **Line Items** - Click "+ Add Item" to add products
- **Payment** - Tax, discount, payment method, amount paid
- **Footer** - Thank you message, barcode

### 5. Print

Click **"Print Receipt"** button. The browser will send commands directly to your printer.

## How Web Serial API Works

### First Time Setup
1. Click "Print Receipt" or the connection button
2. Browser shows a popup with available serial devices
3. Select your thermal printer
4. Grant permission
5. Connection established

### Subsequent Prints
- Printer connection is remembered during the session
- No need to reconnect unless:
  - You refresh the page
  - Printer is disconnected
  - Connection is lost

### Troubleshooting Connection

#### "Web Serial API not supported"
- ✅ Use Google Chrome or Microsoft Edge
- ❌ Firefox and Safari don't support Web Serial API yet

#### "No printer found in list"
- Check USB cable connection
- Verify printer is powered on
- Try a different USB port
- Check Windows Device Manager for COM port

#### "Connection failed"
- Ensure no other app is using the printer
- Try disconnecting and reconnecting USB
- Restart the printer
- Close other browser tabs using the printer

#### "Print failed"
- Check printer has paper
- Verify printer cover is closed
- Check for paper jams
- Ensure printer is in ready state (not offline)

## Keyboard Shortcuts

- `Tab` - Navigate between fields
- `Enter` - Submit focused buttons
- `Esc` - Close dialogs

## Security Note

Web Serial API requires:
- HTTPS connection (or localhost for development)
- User permission via browser prompt
- Cannot access serial devices without explicit user consent

## Browser Permissions

The app needs permission to access:
- Serial ports (for printer communication)

Permissions are requested when you:
- Click "Connect to printer"
- Click "Print Receipt" for the first time

## Tips

### Quick Receipt Generation
1. Use pre-filled sample data
2. Click "Print Receipt"
3. Modify for your needs

### Receipt Number
- Click the refresh icon (🔄) to auto-generate
- Format: `R-YYYYMMDD-HHMM`

### Calculations
- Subtotal: Auto-calculated from items
- Total: Auto-calculated (subtotal + tax - discount)
- Change: Auto-calculated (amount paid - total)

### Adding Items
1. Click "+ Add Item"
2. Enter name, quantity, price
3. Item total updates automatically
4. Click X to remove items

## Development

### File Structure
```
public/
├── index.html    # Main UI
├── styles.css    # Design system & styling
└── app.js        # Application logic & Web Serial API

server.js         # Express server (optional backup method)
```

### Customization

#### Change Default Port
```bash
PORT=8080 npm start
```

#### Modify Baud Rate
Edit `app.js` line ~200:
```javascript
await port.open({ baudRate: 9600 }); // Change here
```

Common rates: 9600, 19200, 38400, 115200

#### Customize ESC/POS Commands
Edit `generateESCPOSCommands()` method in `app.js`

## Support

### Printer Compatibility
Most ESC/POS compatible printers work:
- Epson TM series
- Star Micronics
- Bixolon
- Generic POS-80 series

### Browser Support
| Browser | Web Serial API | Status |
|---------|---------------|---------|
| Chrome 89+ | ✅ Yes | Supported |
| Edge 89+ | ✅ Yes | Supported |
| Firefox | ❌ No | Not supported |
| Safari | ❌ No | Not supported |

## Future Enhancements

- [ ] Save/load receipt templates
- [ ] Export receipt as PDF
- [ ] Multiple printer profiles
- [ ] Receipt history
- [ ] Barcode scanning
- [ ] Logo upload
- [ ] Custom fonts

## License

MIT
