<?php
/**
 * Receipt Printer PHP Backend
 * Handles printing to Windows thermal printers
 */

class ReceiptPrinter {
    private $printerName;
    private $encoding = 'ASCII';
    
    /**
     * Constructor
     * @param string $printerName Windows printer name (e.g., "POS-80")
     */
    public function __construct($printerName = 'POS-80') {
        $this->printerName = $printerName;
    }
    
    /**
     * Print raw ESC/POS data to the printer
     * @param string $data Raw ESC/POS command string
     * @return bool Success status
     */
    public function printRaw($data) {
        try {
            // For Windows: Use PowerShell to print
            $tempFile = tempnam(sys_get_temp_dir(), 'receipt_');
            file_put_contents($tempFile, $data);
            
            $escapedPrinter = escapeshellarg($this->printerName);
            $escapedFile = escapeshellarg($tempFile);
            
            // Use Out-Printer PowerShell cmdlet
            $command = "powershell -Command \"Get-Content $escapedFile -Encoding Byte -ReadCount 0 | Set-Content -Path $escapedFile -Encoding Byte; Out-Printer -Name $escapedPrinter -InputObject (Get-Content $escapedFile)\"";
            
            exec($command, $output, $returnCode);
            
            // Clean up temp file
            unlink($tempFile);
            
            return $returnCode === 0;
        } catch (Exception $e) {
            error_log("Printer error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Print directly using Windows printer
     * @param string $data ESC/POS data
     * @return bool
     */
    public function printDirect($data) {
        try {
            // Alternative method: Direct printer connection
            $connector = $this->getWindowsPrinterConnector($this->printerName);
            
            if ($connector && is_resource($connector)) {
                fwrite($connector, $data);
                fclose($connector);
                return true;
            }
            
            return $this->printRaw($data);
        } catch (Exception $e) {
            error_log("Direct print error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get Windows printer connector
     * @param string $printerName
     * @return resource|false
     */
    private function getWindowsPrinterConnector($printerName) {
        // Try to open printer as file (Windows allows this)
        $printerPath = "\\\\localhost\\$printerName";
        return @fopen($printerPath, 'wb');
    }
    
    /**
     * Test printer connection
     * @return bool
     */
    public function testConnection() {
        // Send a simple test
        $testData = "\x1B@"; // ESC @ - Initialize
        $testData .= "TEST PRINT\n\n\n";
        
        return $this->printRaw($testData);
    }
    
    /**
     * Get list of available printers (Windows)
     * @return array
     */
    public static function getAvailablePrinters() {
        $printers = [];
        
        $command = 'powershell -Command "Get-Printer | Select-Object Name, PortName | ConvertTo-Json"';
        exec($command, $output, $returnCode);
        
        if ($returnCode === 0) {
            $json = implode('', $output);
            $data = json_decode($json, true);
            
            if (is_array($data)) {
                foreach ($data as $printer) {
                    $printers[] = [
                        'name' => $printer['Name'] ?? '',
                        'port' => $printer['PortName'] ?? ''
                    ];
                }
            }
        }
        
        return $printers;
    }
}

/**
 * ESC/POS Command Generator (PHP)
 */
class EscPosCommands {
    const ESC = "\x1B";
    const GS = "\x1D";
    const FS = "\x1C";
    const LF = "\x0A";
    const CR = "\x0D";
    const HT = "\x09";
    
    public static function initialize() {
        return self::ESC . "@";
    }
    
    public static function lineFeed() {
        return self::LF;
    }
    
    public static function feedLines($n) {
        return self::ESC . "d" . chr($n);
    }
    
    public static function setAlignment($alignment) {
        $n = $alignment === 'left' ? 0 : ($alignment === 'center' ? 1 : 2);
        return self::ESC . "a" . chr($n);
    }
    
    public static function setEmphasized($enabled) {
        return self::ESC . "E" . chr($enabled ? 1 : 0);
    }
    
    public static function setUnderline($mode) {
        return self::ESC . "-" . chr($mode);
    }
    
    public static function setCharacterSize($width, $height) {
        $w = max(0, min(7, $width - 1));
        $h = max(0, min(7, $height - 1));
        $n = ($w << 4) | $h;
        return self::GS . "!" . chr($n);
    }
    
    public static function cutPaper($fullCut = false) {
        return self::GS . "V" . chr($fullCut ? 1 : 0);
    }
    
    public static function openCashDrawer($pin = 0, $onTime = 50, $offTime = 50) {
        return self::ESC . "p" . chr($pin) . chr($onTime) . chr($offTime);
    }
    
    public static function setBarcodeHeight($dots) {
        return self::GS . "h" . chr($dots);
    }
    
    public static function setBarcodeWidth($width) {
        return self::GS . "w" . chr($width);
    }
    
    public static function setBarcodeHRI($position) {
        return self::GS . "H" . chr($position);
    }
    
    public static function printBarcode($type, $data) {
        return self::GS . "k" . chr($type) . chr(strlen($data)) . $data;
    }
}

/**
 * Receipt Builder (PHP)
 */
class ReceiptBuilder {
    private $commands = [];
    
    public function init() {
        $this->commands[] = EscPosCommands::initialize();
        return $this;
    }
    
    public function addHeader($storeName, $address = null, $phone = null, $taxId = null) {
        // Store name
        $this->commands[] = EscPosCommands::setAlignment('center');
        $this->commands[] = EscPosCommands::setCharacterSize(2, 2);
        $this->commands[] = EscPosCommands::setEmphasized(true);
        $this->commands[] = $storeName;
        $this->commands[] = EscPosCommands::lineFeed();
        $this->commands[] = EscPosCommands::setEmphasized(false);
        $this->commands[] = EscPosCommands::setCharacterSize(1, 1);
        
        if ($address) {
            $this->commands[] = $address;
            $this->commands[] = EscPosCommands::lineFeed();
        }
        
        if ($phone) {
            $this->commands[] = "Tel: $phone";
            $this->commands[] = EscPosCommands::lineFeed();
        }
        
        if ($taxId) {
            $this->commands[] = "Tax ID: $taxId";
            $this->commands[] = EscPosCommands::lineFeed();
        }
        
        $this->addSeparator();
        return $this;
    }
    
    public function addSeparator($char = '-', $width = 48) {
        $this->commands[] = EscPosCommands::setAlignment('left');
        $this->commands[] = str_repeat($char, $width);
        $this->commands[] = EscPosCommands::lineFeed();
        return $this;
    }
    
    public function addReceiptInfo($receiptNo, $date = null, $cashier = null) {
        $dateStr = $date ?? date('Y-m-d H:i:s');
        
        $this->commands[] = EscPosCommands::setAlignment('left');
        $this->commands[] = "Receipt No: $receiptNo";
        $this->commands[] = EscPosCommands::lineFeed();
        $this->commands[] = "Date: $dateStr";
        $this->commands[] = EscPosCommands::lineFeed();
        
        if ($cashier) {
            $this->commands[] = "Cashier: $cashier";
            $this->commands[] = EscPosCommands::lineFeed();
        }
        
        $this->addSeparator();
        return $this;
    }
    
    public function addItem($name, $quantity, $price) {
        $this->commands[] = EscPosCommands::setAlignment('left');
        $this->commands[] = $name;
        $this->commands[] = EscPosCommands::lineFeed();
        
        $total = $quantity * $price;
        $line = sprintf("  %d x $%.2f%s$%.2f", $quantity, $price, str_repeat(' ', 10), $total);
        $this->commands[] = $line;
        $this->commands[] = EscPosCommands::lineFeed();
        
        return $this;
    }
    
    public function addTotals($subtotal, $tax, $total, $discount = 0) {
        $this->addSeparator();
        $this->commands[] = EscPosCommands::setAlignment('right');
        
        $this->commands[] = sprintf("Subtotal: $%.2f", $subtotal);
        $this->commands[] = EscPosCommands::lineFeed();
        
        if ($discount > 0) {
            $this->commands[] = sprintf("Discount: -$%.2f", $discount);
            $this->commands[] = EscPosCommands::lineFeed();
        }
        
        $this->commands[] = sprintf("Tax: $%.2f", $tax);
        $this->commands[] = EscPosCommands::lineFeed();
        
        $this->commands[] = EscPosCommands::setEmphasized(true);
        $this->commands[] = EscPosCommands::setCharacterSize(2, 2);
        $this->commands[] = sprintf("TOTAL: $%.2f", $total);
        $this->commands[] = EscPosCommands::lineFeed();
        $this->commands[] = EscPosCommands::setCharacterSize(1, 1);
        $this->commands[] = EscPosCommands::setEmphasized(false);
        
        $this->addSeparator();
        return $this;
    }
    
    public function addPayment($method, $amount, $change = null) {
        $this->commands[] = EscPosCommands::setAlignment('left');
        $this->commands[] = "Payment Method: $method";
        $this->commands[] = EscPosCommands::lineFeed();
        $this->commands[] = sprintf("Amount Paid: $%.2f", $amount);
        $this->commands[] = EscPosCommands::lineFeed();
        
        if ($change !== null && $change > 0) {
            $this->commands[] = sprintf("Change: $%.2f", $change);
            $this->commands[] = EscPosCommands::lineFeed();
        }
        
        $this->addSeparator();
        return $this;
    }
    
    public function addFooter($message = null, $barcode = null) {
        if ($message) {
            $this->commands[] = EscPosCommands::setAlignment('center');
            $this->commands[] = EscPosCommands::lineFeed();
            $this->commands[] = $message;
            $this->commands[] = EscPosCommands::lineFeed();
            $this->commands[] = EscPosCommands::lineFeed();
        }
        
        if ($barcode) {
            $this->commands[] = EscPosCommands::setAlignment('center');
            $this->commands[] = EscPosCommands::setBarcodeHeight(60);
            $this->commands[] = EscPosCommands::setBarcodeWidth(3);
            $this->commands[] = EscPosCommands::setBarcodeHRI(2);
            $this->commands[] = EscPosCommands::printBarcode(73, $barcode);
            $this->commands[] = EscPosCommands::lineFeed();
        }
        
        return $this;
    }
    
    public function addText($text, $options = []) {
        if (isset($options['alignment'])) {
            $this->commands[] = EscPosCommands::setAlignment($options['alignment']);
        }
        
        if (isset($options['emphasized']) && $options['emphasized']) {
            $this->commands[] = EscPosCommands::setEmphasized(true);
        }
        
        if (isset($options['size'])) {
            $this->commands[] = EscPosCommands::setCharacterSize($options['size']['width'], $options['size']['height']);
        }
        
        $this->commands[] = $text;
        $this->commands[] = EscPosCommands::lineFeed();
        
        // Reset
        if (isset($options['emphasized']) && $options['emphasized']) {
            $this->commands[] = EscPosCommands::setEmphasized(false);
        }
        
        if (isset($options['size'])) {
            $this->commands[] = EscPosCommands::setCharacterSize(1, 1);
        }
        
        return $this;
    }
    
    public function cut($feedLines = 3) {
        $this->commands[] = EscPosCommands::feedLines($feedLines);
        $this->commands[] = EscPosCommands::cutPaper(false);
        return $this;
    }
    
    public function openDrawer() {
        $this->commands[] = EscPosCommands::openCashDrawer(0);
        return $this;
    }
    
    public function build() {
        return implode('', $this->commands);
    }
}
