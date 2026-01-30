const express = require('express');
const path = require('path');
const { LayoutReceiptDesign } = require('./dist/ReceiptBuilder');
const { sendToPrinter, listPrinters, getPrinterStatus } = require('./printer');

const app = express();
const PORT = process.env.PORT || 3000;

// Small helpers keep the handlers readable without over-engineering.
function toNumber(value, fallback = 0) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
}

function validatePrintRequest(data) {
    if (!data || typeof data !== 'object') {
        return 'Request body is required';
    }

    if (!data.storeName) {
        return 'Store name is required';
    }

    if (!data.receiptNo) {
        return 'Receipt number is required';
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
        return 'At least one item is required';
    }

    return null;
}

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Serve the main UI
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to print receipt
app.post('/api/print', async (req, res) => {
    try {
        const data = req.body;

        const validationError = validatePrintRequest(data);
        if (validationError) {
            return res.status(400).json({
                success: false,
                error: validationError
            });
        }

        // Build receipt header
        const header = {
            storeName: data.storeName,
            address: data.address || undefined,
            phone: data.phone || undefined,
            taxId: data.taxId || undefined
        };

        // Build receipt items
        const items = data.items.map(item => ({
            name: item.name,
            quantity: toNumber(item.quantity, 1),
            price: toNumber(item.price, 0)
        }));

        // Build totals
        const subtotal = toNumber(data.subtotal, 0);
        const tax = toNumber(data.tax, 0);
        const discount = toNumber(data.discount, 0);
        const total = toNumber(data.total, 0);

        const totals = {
            subtotal,
            tax,
            total,
            discount: discount > 0 ? discount : undefined
        };

        // Build payment info
        const amountPaid = toNumber(data.amountPaid, 0);
        const change = toNumber(data.change, 0);

        const payment = {
            method: data.paymentMethod || 'Cash',
            amount: amountPaid,
            change: change > 0 ? change : undefined
        };

        // Build options
        const options = {
            cashier: data.cashier || undefined,
            footer: {
                message: data.footerMessage || undefined,
                barcode: data.barcode || undefined
            }
        };

        // Create receipt using predefined layout helper
        const receipt = LayoutReceiptDesign.createRetailReceipt(
            header,
            items,
            totals,
            payment,
            data.receiptNo,
            options
        );

        // Get the binary data
        const receiptData = receipt.buildBuffer();

        try {
            await sendToPrinter(receiptData, data.printerName);

            res.json({ 
                success: true, 
                message: 'Receipt sent to printer' 
            });

        } catch (printError) {
            console.error('Print error:', printError);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to print. Check if printer is connected and driver is installed.',
                details: printError.message
            });
        }

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            details: error.message
        });
    }
});

// API endpoint to get printer status
app.get('/api/printer/status', async (req, res) => {
    try {
        const printer = await getPrinterStatus(req.query.name);

        res.json({
            success: true,
            printer
        });
    } catch (error) {
        const status = /implemented/.test(error.message) ? 501 : 404;
        res.status(status).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint to list available printers
app.get('/api/printers', async (req, res) => {
    try {
        const printers = await listPrinters();

        res.json({
            success: true,
            printers
        });
    } catch (error) {
        const status = /implemented/.test(error.message) ? 501 : 500;
        res.status(status).json({
            success: false,
            error: error.message,
            details: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        error: 'Something went wrong!',
        details: err.message
    });
});

// Start server only when run directly (not when required by tests)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════════════════════╗
║        Receipt Printer Web UI - Server Running        ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  🌐 URL: http://localhost:${PORT}                        ║
║  🖨️  Printer: ${process.env.PRINTER_NAME || 'POS-80'}                              ║
║                                                        ║
║  Press Ctrl+C to stop the server                      ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
        `);
    });
}

module.exports = {
    app,
    toNumber,
    validatePrintRequest
};
