<?php
/**
 * Example: Print a Receipt using PHP
 */

require_once 'ReceiptPrinter.php';

// Create a receipt
$receipt = new ReceiptBuilder();

$receipt
    ->init()
    ->addHeader(
        'My Awesome Store',
        '123 Main Street, City, State 12345',
        '(555) 123-4567',
        'TAX-123456789'
    )
    ->addReceiptInfo('R-2024-001', date('Y-m-d H:i:s'), 'John Doe')
    ->addItem('Coffee - Large', 2, 4.50)
    ->addItem('Croissant', 1, 3.25)
    ->addItem('Orange Juice', 1, 3.00)
    ->addTotals(15.25, 1.37, 16.62, 0)
    ->addPayment('Cash', 20.00, 3.38)
    ->addFooter(
        'Thank you for your purchase!\nPlease visit us again!',
        'R2024001' // Barcode data
    )
    ->cut();

// Get the receipt data
$receiptData = $receipt->build();

// Print to the POS-80 printer
$printer = new ReceiptPrinter('POS-80');

if ($printer->printDirect($receiptData)) {
    echo "Receipt printed successfully!\n";
} else {
    echo "Failed to print receipt.\n";
}

// Example: List available printers
echo "\nAvailable printers:\n";
$printers = ReceiptPrinter::getAvailablePrinters();
foreach ($printers as $p) {
    echo "  - {$p['name']} (Port: {$p['port']})\n";
}
