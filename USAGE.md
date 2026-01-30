# Quick Start Guide

## Building the Package

```bash
# Install dependencies
npm install

# Build the package
npm run build
```

## Using in Your Project

### Import the library

```typescript
import { ESC, ReceiptBuilder, LayoutReceiptDesign } from 'receipt-printer';
```

### Quick Example: Simple Receipt

```typescript
import { LayoutReceiptDesign } from 'receipt-printer';

// Create a receipt
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

// Get binary data for printing
const data = receipt.buildBuffer();
```

### Custom Receipt

```typescript
import { ReceiptBuilder } from 'receipt-printer';

const receipt = new ReceiptBuilder('80mm')
  .init()
  .addText('SALE', { 
    alignment: 'center', 
    size: { width: 2, height: 2 },
    emphasized: true 
  })
  .addSeparator()
  .addText('Thank you!', { alignment: 'center' })
  .cut();

const data = receipt.buildBuffer();
```

## Available Commands

### Package Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run clean` - Remove build artifacts
- `npm run rebuild` - Clean and rebuild
- `npm run watch` - Watch for changes and rebuild
- `npm run example` - Run the example script

## File Structure

```
receipt-printer/
├── dist/                  # Compiled JavaScript (generated)
│   ├── index.js
│   ├── index.d.ts
│   ├── EscPosCommands.js
│   ├── EscPosCommands.d.ts
│   ├── ReceiptBuilder.js
│   └── ReceiptBuilder.d.ts
├── EscPosCommands.ts     # ESC/POS command library
├── ReceiptBuilder.ts     # Receipt builder with layout presets
├── index.ts              # Main entry point
├── example.ts            # Usage examples
├── package.json          # NPM package configuration
└── tsconfig.json         # TypeScript configuration
```

## Next Steps

1. Check `example.ts` for complete working examples
2. Read `README.md` for detailed documentation
3. See the ESC/POS command reference for low-level control
