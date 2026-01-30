/**
 * Receipt Builder with opinionated receipt layout presets
 * Creates formatted receipts using ESC/POS commands
 */

import { EscPosCommands as ESC } from './EscPosCommands';

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  tax?: number;
}

export interface ReceiptHeader {
  storeName: string;
  address?: string;
  phone?: string;
  taxId?: string;
}

export interface ReceiptFooter {
  message?: string;
  barcode?: string;
}

export class ReceiptBuilder {
  private commands: string[] = [];
  private readonly PAPER_WIDTH_58MM = 384; // dots
  private readonly PAPER_WIDTH_80MM = 576; // dots
  private paperWidth: number;

  constructor(paperWidth: '58mm' | '80mm' = '80mm') {
    this.paperWidth = paperWidth === '58mm' ? this.PAPER_WIDTH_58MM : this.PAPER_WIDTH_80MM;
  }

  /**
   * Initialize the receipt
   */
  init(): this {
    this.commands.push(ESC.initialize());
    this.commands.push(ESC.selectCharacterCodeTable(0)); // PC437
    return this;
  }

  /**
   * Add header section (primary branding section)
   */
  addHeader(header: ReceiptHeader): this {
    // Store name - centered, double size, emphasized
    this.commands.push(ESC.setAlignment('center'));
    this.commands.push(ESC.setCharacterSize(2, 2));
    this.commands.push(ESC.setEmphasized(true));
    this.commands.push(header.storeName);
    this.commands.push(ESC.lineFeed());
    this.commands.push(ESC.setEmphasized(false));
    this.commands.push(ESC.setCharacterSize(1, 1));

    // Address
    if (header.address) {
      this.commands.push(ESC.setAlignment('center'));
      this.commands.push(header.address);
      this.commands.push(ESC.lineFeed());
    }

    // Phone
    if (header.phone) {
      this.commands.push(ESC.setAlignment('center'));
      this.commands.push(`Tel: ${header.phone}`);
      this.commands.push(ESC.lineFeed());
    }

    // Tax ID
    if (header.taxId) {
      this.commands.push(ESC.setAlignment('center'));
      this.commands.push(`Tax ID: ${header.taxId}`);
      this.commands.push(ESC.lineFeed());
    }

    // Separator line (section divider)
    this.addSeparator();
    
    return this;
  }

  /**
   * Add separator line
   */
  addSeparator(char: string = '-'): this {
    this.commands.push(ESC.setAlignment('left'));
    const width = this.paperWidth === this.PAPER_WIDTH_80MM ? 48 : 32;
    this.commands.push(char.repeat(width));
    this.commands.push(ESC.lineFeed());
    return this;
  }

  /**
   * Add receipt info (date, receipt number, etc.)
   */
  addReceiptInfo(receiptNo: string, date?: Date, cashier?: string): this {
    const dateStr = date ? date.toLocaleString() : new Date().toLocaleString();
    
    this.commands.push(ESC.setAlignment('left'));
    this.commands.push(ESC.selectFont(false)); // Font A
    
    this.commands.push(`Receipt No: ${receiptNo}`);
    this.commands.push(ESC.lineFeed());
    
    this.commands.push(`Date: ${dateStr}`);
    this.commands.push(ESC.lineFeed());
    
    if (cashier) {
      this.commands.push(`Cashier: ${cashier}`);
      this.commands.push(ESC.lineFeed());
    }
    
    this.addSeparator();
    
    return this;
  }

  /**
   * Add line item (data table row)
   */
  addItem(item: ReceiptItem): this {
    this.commands.push(ESC.setAlignment('left'));
    
    // Item name
    this.commands.push(item.name);
    this.commands.push(ESC.lineFeed());
    
    // Quantity x Price = Total (using tabs)
    const qty = item.quantity.toString();
    const price = item.price.toFixed(2);
    const total = (item.quantity * item.price).toFixed(2);
    
    const line = `  ${qty} x $${price}${' '.repeat(10)}$${total}`;
    this.commands.push(line);
    this.commands.push(ESC.lineFeed());
    
    return this;
  }

  /**
   * Add multiple items
   */
  addItems(items: ReceiptItem[]): this {
    items.forEach(item => this.addItem(item));
    return this;
  }

  /**
   * Add totals section (summary panel)
   */
  addTotals(subtotal: number, tax: number, total: number, discount?: number): this {
    this.addSeparator();
    
    this.commands.push(ESC.setAlignment('right'));
    
    // Subtotal
    this.commands.push(`Subtotal: $${subtotal.toFixed(2)}`);
    this.commands.push(ESC.lineFeed());
    
    // Discount if applicable
    if (discount && discount > 0) {
      this.commands.push(`Discount: -$${discount.toFixed(2)}`);
      this.commands.push(ESC.lineFeed());
    }
    
    // Tax
    this.commands.push(`Tax: $${tax.toFixed(2)}`);
    this.commands.push(ESC.lineFeed());
    
    // Total - emphasized
    this.commands.push(ESC.setEmphasized(true));
    this.commands.push(ESC.setCharacterSize(2, 2));
    this.commands.push(`TOTAL: $${total.toFixed(2)}`);
    this.commands.push(ESC.lineFeed());
    this.commands.push(ESC.setCharacterSize(1, 1));
    this.commands.push(ESC.setEmphasized(false));
    
    this.addSeparator();
    
    return this;
  }

  /**
   * Add payment information
   */
  addPayment(method: string, amount: number, change?: number): this {
    this.commands.push(ESC.setAlignment('left'));
    
    this.commands.push(`Payment Method: ${method}`);
    this.commands.push(ESC.lineFeed());
    
    this.commands.push(`Amount Paid: $${amount.toFixed(2)}`);
    this.commands.push(ESC.lineFeed());
    
    if (change !== undefined && change > 0) {
      this.commands.push(`Change: $${change.toFixed(2)}`);
      this.commands.push(ESC.lineFeed());
    }
    
    this.addSeparator();
    
    return this;
  }

  /**
   * Add footer with barcode (footer section)
   */
  addFooter(footer: ReceiptFooter): this {
    // Thank you message
    if (footer.message) {
      this.commands.push(ESC.setAlignment('center'));
      this.commands.push(ESC.lineFeed());
      this.commands.push(footer.message);
      this.commands.push(ESC.lineFeed());
      this.commands.push(ESC.lineFeed());
    }
    
    // Barcode
    if (footer.barcode) {
      this.commands.push(ESC.setAlignment('center'));
      this.commands.push(ESC.setBarcodeHeight(60));
      this.commands.push(ESC.setBarcodeWidth(3));
      this.commands.push(ESC.setBarcodeHRIPosition(2)); // Below
      this.commands.push(ESC.printBarcode(73, footer.barcode)); // CODE128
      this.commands.push(ESC.lineFeed());
    }
    
    return this;
  }

  /**
   * Add QR code (for modern receipts)
   */
  addQRCode(data: string): this {
    // QR codes require specific commands not in basic ESC/POS
    // This is a placeholder for advanced implementation
    this.commands.push(ESC.setAlignment('center'));
    this.commands.push(`[QR Code: ${data}]`);
    this.commands.push(ESC.lineFeed());
    return this;
  }

  /**
   * Add custom text
   */
  addText(text: string, options?: {
    alignment?: 'left' | 'center' | 'right';
    emphasized?: boolean;
    size?: { width: number; height: number };
    underline?: boolean;
  }): this {
    if (options?.alignment) {
      this.commands.push(ESC.setAlignment(options.alignment));
    }
    
    if (options?.size) {
      this.commands.push(ESC.setCharacterSize(options.size.width, options.size.height));
    }
    
    if (options?.emphasized) {
      this.commands.push(ESC.setEmphasized(true));
    }
    
    if (options?.underline) {
      this.commands.push(ESC.setUnderline(1));
    }
    
    this.commands.push(text);
    this.commands.push(ESC.lineFeed());
    
    // Reset
    if (options?.underline) {
      this.commands.push(ESC.setUnderline(0));
    }
    
    if (options?.emphasized) {
      this.commands.push(ESC.setEmphasized(false));
    }
    
    if (options?.size) {
      this.commands.push(ESC.setCharacterSize(1, 1));
    }
    
    return this;
  }

  /**
   * Add line feed
   */
  addLineFeed(lines: number = 1): this {
    for (let i = 0; i < lines; i++) {
      this.commands.push(ESC.lineFeed());
    }
    return this;
  }

  /**
   * Cut the paper
   */
  cut(feedLines: number = 3): this {
    this.commands.push(ESC.feedLines(feedLines));
    this.commands.push(ESC.cutPaper(false));
    return this;
  }

  /**
   * Open cash drawer
   */
  openDrawer(): this {
    this.commands.push(ESC.openCashDrawer(0));
    return this;
  }

  /**
   * Build the final command string
   */
  build(): string {
    return this.commands.join('');
  }

  /**
   * Build and return as Buffer for printing
   */
  buildBuffer(): Buffer {
    return Buffer.from(this.build(), 'binary');
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.commands = [];
    return this;
  }
}

/**
 * Layout preset helper
 * Provides pre-configured receipt layouts
 */
export class LayoutReceiptDesign {
  /**
   * Create a standard retail receipt
   */
  static createRetailReceipt(
    header: ReceiptHeader,
    items: ReceiptItem[],
    totals: { subtotal: number; tax: number; total: number; discount?: number },
    payment: { method: string; amount: number; change?: number },
    receiptNo: string,
    options?: { cashier?: string; footer?: ReceiptFooter }
  ): ReceiptBuilder {
    const builder = new ReceiptBuilder('80mm');
    
    builder
      .init()
      .addHeader(header)
      .addReceiptInfo(receiptNo, new Date(), options?.cashier)
      .addItems(items)
      .addTotals(totals.subtotal, totals.tax, totals.total, totals.discount)
      .addPayment(payment.method, payment.amount, payment.change);
    
    if (options?.footer) {
      builder.addFooter(options.footer);
    }
    
    builder.cut();
    
    return builder;
  }

  /**
   * Create a simple kitchen receipt
   */
  static createKitchenReceipt(
    orderNumber: string,
    items: ReceiptItem[],
    notes?: string
  ): ReceiptBuilder {
    const builder = new ReceiptBuilder('80mm');
    
    builder
      .init()
      .addText('KITCHEN ORDER', { alignment: 'center', size: { width: 2, height: 2 }, emphasized: true })
      .addSeparator()
      .addText(`Order #${orderNumber}`, { alignment: 'center', size: { width: 2, height: 2 } })
      .addText(new Date().toLocaleTimeString(), { alignment: 'center' })
      .addSeparator();
    
    items.forEach(item => {
      builder.addText(`${item.quantity}x ${item.name}`, { size: { width: 2, height: 2 } });
    });
    
    if (notes) {
      builder.addSeparator().addText(`Notes: ${notes}`, { emphasized: true });
    }
    
    builder.addLineFeed(2).cut();
    
    return builder;
  }
}
