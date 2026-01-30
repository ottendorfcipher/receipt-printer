/**
 * Example: Print a Receipt using TypeScript
 */

import { LayoutReceiptDesign, ReceiptBuilder } from './ReceiptBuilder';
import * as fs from 'fs';
import * as childProcess from 'child_process';

// Example 1: Standard retail receipt using the predefined layout
const retailReceipt = LayoutReceiptDesign.createRetailReceipt(
  {
    storeName: 'My Awesome Store',
    address: '123 Main Street, City, State 12345',
    phone: '(555) 123-4567',
    taxId: 'TAX-123456789'
  },
  [
    { name: 'Coffee - Large', quantity: 2, price: 4.50 },
    { name: 'Croissant', quantity: 1, price: 3.25 },
    { name: 'Orange Juice', quantity: 1, price: 3.00 }
  ],
  {
    subtotal: 15.25,
    tax: 1.37,
    total: 16.62
  },
  {
    method: 'Cash',
    amount: 20.00,
    change: 3.38
  },
  'R-2024-001',
  {
    cashier: 'John Doe',
    footer: {
      message: 'Thank you for your purchase!\nPlease visit us again!',
      barcode: 'R2024001'
    }
  }
);

// Example 2: Kitchen receipt using the predefined layout
const kitchenReceipt = LayoutReceiptDesign.createKitchenReceipt(
  'K-2024-042',
  [
    { name: 'Burger with Cheese', quantity: 2, price: 12.99 },
    { name: 'French Fries', quantity: 2, price: 4.50 },
    { name: 'Coke', quantity: 2, price: 2.50 }
  ],
  'No onions on one burger'
);

// Example 3: Custom receipt with custom layout styling
const customReceipt = new ReceiptBuilder('80mm')
  .init()
  .addText('SPECIAL PROMOTION', { 
    alignment: 'center', 
    size: { width: 2, height: 2 },
    emphasized: true 
  })
  .addSeparator()
  .addText('Buy 2 Get 1 Free!', { alignment: 'center', size: { width: 1, height: 1 } })
  .addText('Valid until Dec 31, 2024', { alignment: 'center' })
  .addLineFeed(2)
  .addText('Terms and conditions apply.', { alignment: 'center' })
  .addLineFeed(2)
  .cut();

// Function to print to Windows printer
function printToWindowsPrinter(receiptData: Buffer, printerName: string = 'POS-80'): Promise<void> {
  return new Promise((resolve, reject) => {
    // Save to temp file
    const tempFile = `temp_receipt_${Date.now()}.bin`;
    fs.writeFileSync(tempFile, receiptData);

    // Use PowerShell to print
    const command = `Out-Printer -Name "${printerName}" -InputObject (Get-Content -Path "${tempFile}" -Raw)`;
    
    childProcess.exec(`powershell -Command "${command}"`, (error, stdout, stderr) => {
      // Clean up temp file
      fs.unlinkSync(tempFile);

      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// Print the retail receipt
async function main() {
  try {
    console.log('Printing retail receipt...');
    await printToWindowsPrinter(retailReceipt.buildBuffer(), 'POS-80');
    console.log('✓ Retail receipt printed successfully!');

    // Uncomment to print kitchen receipt
    // console.log('Printing kitchen receipt...');
    // await printToWindowsPrinter(kitchenReceipt.buildBuffer(), 'POS-80');
    // console.log('✓ Kitchen receipt printed successfully!');

  } catch (error) {
    console.error('✗ Print failed:', error);
  }
}

// Run the example
main();

// Export for use in other modules
export { retailReceipt, kitchenReceipt, customReceipt, printToWindowsPrinter };
