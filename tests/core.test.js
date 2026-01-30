const assert = require('assert');
const path = require('path');

const { createPrinter } = require('../printer');
const { toNumber, validatePrintRequest } = require('../server');

function testToNumber() {
    assert.strictEqual(toNumber('5.5', 0), 5.5, 'parses numeric strings');
    assert.strictEqual(toNumber('0', 1), 0, 'parses zero correctly');
    assert.strictEqual(toNumber('', 1), 1, 'falls back on empty string');
    assert.strictEqual(toNumber(undefined, 2), 2, 'falls back on undefined');
    assert.strictEqual(toNumber('not-a-number', 3), 3, 'falls back on NaN');
}

function testValidatePrintRequest() {
    assert.strictEqual(
        validatePrintRequest(null),
        'Request body is required',
        'requires body'
    );

    assert.strictEqual(
        validatePrintRequest({}),
        'Store name is required',
        'requires storeName'
    );

    assert.strictEqual(
        validatePrintRequest({ storeName: 'Store' }),
        'Receipt number is required',
        'requires receiptNo'
    );

    assert.strictEqual(
        validatePrintRequest({ storeName: 'Store', receiptNo: 'R1', items: [] }),
        'At least one item is required',
        'requires at least one item'
    );

    assert.strictEqual(
        validatePrintRequest({ storeName: 'Store', receiptNo: 'R1', items: [{}] }),
        null,
        'valid payload passes'
    );
}

async function testSendToPrinterUsesExecutor() {
    const calls = [];

    const fakeExec = async (cmd) => {
        calls.push(cmd);
        return { stdout: '', stderr: '' };
    };

    const { sendToPrinter } = createPrinter(fakeExec);

    const buffer = Buffer.from('test-receipt');
    await sendToPrinter(buffer, 'TEST-PRINTER');

    assert.ok(calls.length === 1, 'exec function called once');
    const invokedCmd = calls[0];
    assert.ok(typeof invokedCmd === 'string' && invokedCmd.length > 0, 'exec called with command');
    // We dont assert exact command string to keep the test robust across platforms.
}

(async function run() {
    try {
        testToNumber();
        testValidatePrintRequest();
        await testSendToPrinterUsesExecutor();
        console.log('All core tests passed');
    } catch (err) {
        console.error('Test failure:', err.message || err);
        process.exitCode = 1;
    }
})();
