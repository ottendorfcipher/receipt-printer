# 80mm Thermal Receipt Printer System
## Opinionated Receipt Layout Presets

A comprehensive receipt printing solution for 80mm thermal printers (POS-80 series) with TypeScript and PHP implementations, including opinionated layout presets for consistent receipts.

## Features

- ✅ **ESC/POS Command Library** - Complete implementation of thermal printer commands
- ✅ **TypeScript & PHP Support** - Use in Node.js or PHP backends
- ✅ **Layout Presets** - Pre-configured layouts for common receipt types
- ✅ **Windows Printer Integration** - Direct printing to Windows-installed printers
- ✅ **Barcode Support** - CODE128, CODE39, UPC, EAN, and more
- ✅ **Flexible Formatting** - Text alignment, sizes, emphasis, underlines
- ✅ **Cash Drawer Control** - Open cash drawers via ESC/POS commands
- ✅ **Paper Cutting** - Automatic paper cutting after printing

## Project Structure

```
receipt-printer/
├── EscPosCommands.ts      # TypeScript ESC/POS command library
├── ReceiptBuilder.ts      # TypeScript receipt builder with layout presets
├── ReceiptPrinter.php     # PHP receipt printer backend
├── example.ts             # TypeScript usage examples
├── example.php            # PHP usage examples
└── README.md              # This file
```

## Installation

### Prerequisites

- Windows 10/11
- PowerShell 5.0+
- POS-80 thermal printer installed as "POS-80" in Windows
- Node.js 14+ (for TypeScript)
- PHP 7.4+ (for PHP)

### TypeScript/Node.js Setup

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run the example
npm run example
```

### Using as a Package

Import the compiled module in your TypeScript/JavaScript project:

```typescript
import { ESC, ReceiptBuilder, LayoutReceiptDesign } from 'receipt-printer';
```

### PHP Setup

No installation required - just include the PHP files:

```php
require_once 'ReceiptPrinter.php';
```

## Usage

### TypeScript Example

```typescript
import { LayoutReceiptDesign } from 'receipt-printer';

// Create a retail receipt using the predefined layout
const receipt = LayoutReceiptDesign.createRetailReceipt(
  {
    storeName: 'My Store',
    address: '123 Main St',
    phone: '555-1234'
  },
  [
    { name: 'Coffee', quantity: 2, price: 4.50 },
    { name: 'Croissant', quantity: 1, price: 3.25 }
  ],
  {
    subtotal: 12.25,
    tax: 1.10,
    total: 13.35
  },
  {
    method: 'Cash',
    amount: 15.00,
    change: 1.65
  },
  'R-2024-001'
);

// Get the raw data
const data = receipt.buildBuffer();
```

### PHP Example

```php
<?php
require_once 'ReceiptPrinter.php';

// Create receipt
$receipt = new ReceiptBuilder();
$receipt
    ->init()
    ->addHeader('My Store', '123 Main St', '555-1234')
    ->addReceiptInfo('R-2024-001')
    ->addItem('Coffee', 2, 4.50)
    ->addItem('Croissant', 1, 3.25)
    ->addTotals(12.25, 1.10, 13.35)
    ->addPayment('Cash', 15.00, 1.65)
    ->addFooter('Thank you!')
    ->cut();

// Print
$printer = new ReceiptPrinter('POS-80');
$printer->printDirect($receipt->build());
```

## Receipt Layout Structure

The receipt builder follows a structured layout for clear, readable receipts:

### Design Components

1. **Header Section** (Primary Branding)
   - Store name: Centered, double-size, emphasized
   - Contact information: Centered, normal size
   - Separator line

2. **Receipt Info** (Metadata)
   - Receipt number
   - Date/time
   - Cashier information

3. **Line Items** (Data Table)
   - Item name
   - Quantity × Price = Total
   - Consistent spacing and alignment

4. **Totals Section** (Summary Panel)
   - Subtotal
   - Discount (if applicable)
   - Tax
   - Total (emphasized, large)

5. **Payment Section**
   - Payment method
   - Amount paid
   - Change given

6. **Footer Section**
   - Thank you message
   - Barcode for tracking
   - Additional information

### Pre-configured Layouts

```typescript
// Retail Receipt
LayoutReceiptDesign.createRetailReceipt(header, items, totals, payment, receiptNo, options);

// Kitchen Order
LayoutReceiptDesign.createKitchenReceipt(orderNumber, items, notes);
```

## ESC/POS Commands Reference

### Text Formatting

| Command | Description |
|---------|-------------|
| `initialize()` | Reset printer to default state |
| `setAlignment('left'|'center'|'right')` | Set text alignment |
| `setEmphasized(true|false)` | Bold text |
| `setUnderline(0|1|2)` | Underline (0=off, 1=thin, 2=thick) |
| `setCharacterSize(width, height)` | Set character size (1-8x) |
| `selectFont(false|true)` | Select Font A or B |

### Paper Control

| Command | Description |
|---------|-------------|
| `lineFeed()` | Print and feed one line |
| `feedLines(n)` | Feed n lines |
| `cutPaper(fullCut)` | Cut paper (partial or full) |
| `setLineSpacing(units)` | Set line spacing |

### Barcode & Graphics

| Command | Description |
|---------|-------------|
| `printBarcode(type, data)` | Print barcode |
| `setBarcodeHeight(dots)` | Set barcode height |
| `setBarcodeWidth(2-6)` | Set barcode width |
| `setBarcodeHRIPosition(0-3)` | Position of human-readable text |
| `printRasterImage(w, h, data, mode)` | Print raster image |

### Hardware Control

| Command | Description |
|---------|-------------|
| `openCashDrawer(pin, onTime, offTime)` | Open cash drawer |
| `beep(times, duration)` | Sound beeper |

## Barcode Types

Supported barcode formats:

- **UPC-A** (m=65): 11-12 digits
- **UPC-E** (m=66): 11-12 digits
- **EAN13** (m=67): 12-13 digits
- **EAN8** (m=68): 7-8 digits
- **CODE39** (m=69): Alphanumeric
- **ITF** (m=70): Even number of digits
- **CODABAR** (m=71): Numeric + special chars
- **CODE93** (m=72): Alphanumeric
- **CODE128** (m=73): Full ASCII

## Technical Specifications

Based on the 80mm Thermal Printer Programming Manual:

- **Paper Width**: 80mm (576 dots at 200 DPI)
- **Printing Method**: Direct thermal
- **Print Speed**: Up to 260mm/s
- **Resolution**: 203 DPI
- **Character Fonts**: Font A (12×24), Font B (9×17)
- **Barcode Height**: 1-255 dots (default: 162)
- **Interfaces**: USB, Ethernet (model dependent)
- **Auto-cutter**: 1.5 million cuts

## Troubleshooting

### Printer not found

```powershell
# List available printers
Get-Printer | Select-Object Name
```

### Test printer connection

```php
$printer = new ReceiptPrinter('POS-80');
if ($printer->testConnection()) {
    echo "Printer OK!";
}
```

### Paper not cutting

Ensure your printer has auto-cutter support. Use:
```typescript
receipt.cut(3); // Feed 3 lines before cutting
```

### Characters not printing correctly

Set the correct character code table:
```typescript
ESC.selectCharacterCodeTable(0); // PC437 (default)
```

## Advanced Features

### Custom Text Formatting

```typescript
builder.addText('SALE', {
  alignment: 'center',
  size: { width: 3, height: 3 },
  emphasized: true,
  underline: true
});
```

### Tab Positions

```typescript
ESC.setTabPositions([8, 16, 24, 32]);
// Now HT will jump to these positions
```

### Page Mode (Advanced)

For complex layouts, use page mode to position elements precisely (see manual page 14-17).

## License

This project is based on the public ESC/POS standard and the 80mm Thermal Printer Programming Manual.

## Support

For issues related to:
- **Printer hardware**: Contact Volcora support at volcora.com/support
- **This code**: Check the examples and manual reference

## References

- 80mm Thermal Printer Programming Manual (included)
- ESC/POS Command Reference
- Receipt layout guidelines
- Volcora V-WLRP5-A1B Documentation

---

**Created for use with 80mm thermal receipt printers**
