/**
 * ESC/POS Thermal Printer Command Library
 * Based on 80mm Thermal Printer Programming Manual
 */

export class EscPosCommands {
  // Control characters
  private static readonly ESC = '\x1B';
  private static readonly GS = '\x1D';
  private static readonly FS = '\x1C';
  private static readonly LF = '\x0A';
  private static readonly CR = '\x0D';
  private static readonly HT = '\x09';

  /**
   * Initialize printer - ESC @
   * Clears data and resets to power-on mode
   */
  static initialize(): string {
    return `${this.ESC}@`;
  }

  /**
   * Print and line feed - LF
   */
  static lineFeed(): string {
    return this.LF;
  }

  /**
   * Print and feed n lines - ESC d n
   */
  static feedLines(n: number): string {
    return `${this.ESC}d${String.fromCharCode(n)}`;
  }

  /**
   * Select print mode - ESC ! n
   * Bit 0: Font B (1) or Font A (0)
   * Bit 3: Emphasized
   * Bit 4: Double-height
   * Bit 5: Double-width
   * Bit 7: Underline
   */
  static selectPrintMode(
    fontB = false,
    emphasized = false,
    doubleHeight = false,
    doubleWidth = false,
    underline = false
  ): string {
    let n = 0;
    if (fontB) n |= 0x01;
    if (emphasized) n |= 0x08;
    if (doubleHeight) n |= 0x10;
    if (doubleWidth) n |= 0x20;
    if (underline) n |= 0x80;
    return `${this.ESC}!${String.fromCharCode(n)}`;
  }

  /**
   * Turn emphasized mode on/off - ESC E n
   */
  static setEmphasized(enabled: boolean): string {
    return `${this.ESC}E${String.fromCharCode(enabled ? 1 : 0)}`;
  }

  /**
   * Turn underline mode on/off - ESC - n
   * n = 0: Off, 1: 1-dot thick, 2: 2-dots thick
   */
  static setUnderline(mode: 0 | 1 | 2): string {
    return `${this.ESC}-${String.fromCharCode(mode)}`;
  }

  /**
   * Select justification - ESC a n
   * n = 0: Left, 1: Center, 2: Right
   */
  static setAlignment(alignment: 'left' | 'center' | 'right'): string {
    const n = alignment === 'left' ? 0 : alignment === 'center' ? 1 : 2;
    return `${this.ESC}a${String.fromCharCode(n)}`;
  }

  /**
   * Set character size - GS ! n
   * Width: bits 4-7 (0-7 = 1x to 8x)
   * Height: bits 0-3 (0-7 = 1x to 8x)
   */
  static setCharacterSize(widthMultiplier: number, heightMultiplier: number): string {
    const width = Math.max(0, Math.min(7, widthMultiplier - 1));
    const height = Math.max(0, Math.min(7, heightMultiplier - 1));
    const n = (width << 4) | height;
    return `${this.GS}!${String.fromCharCode(n)}`;
  }

  /**
   * Set left margin - GS L nL nH
   */
  static setLeftMargin(dots: number): string {
    const nL = dots & 0xFF;
    const nH = (dots >> 8) & 0xFF;
    return `${this.GS}L${String.fromCharCode(nL)}${String.fromCharCode(nH)}`;
  }

  /**
   * Set printing area width - GS W nL nH
   */
  static setPrintingWidth(dots: number): string {
    const nL = dots & 0xFF;
    const nH = (dots >> 8) & 0xFF;
    return `${this.GS}W${String.fromCharCode(nL)}${String.fromCharCode(nH)}`;
  }

  /**
   * Turn white/black reverse printing on/off - GS B n
   */
  static setReversePrinting(enabled: boolean): string {
    return `${this.GS}B${String.fromCharCode(enabled ? 1 : 0)}`;
  }

  /**
   * Set line spacing to default (1/6 inch) - ESC 2
   */
  static setDefaultLineSpacing(): string {
    return `${this.ESC}2`;
  }

  /**
   * Set line spacing - ESC 3 n
   * n = line spacing in vertical motion units
   */
  static setLineSpacing(units: number): string {
    return `${this.ESC}3${String.fromCharCode(units)}`;
  }

  /**
   * Select character font - ESC M n
   * n = 0: Font A (12×24), n = 1: Font B (9×17)
   */
  static selectFont(fontB: boolean): string {
    return `${this.ESC}M${String.fromCharCode(fontB ? 1 : 0)}`;
  }

  /**
   * Print barcode - GS k m n d1...dn
   * m = barcode type
   */
  static printBarcode(type: number, data: string): string {
    const dataBytes = data.split('').map(c => c.charCodeAt(0));
    return `${this.GS}k${String.fromCharCode(type)}${String.fromCharCode(data.length)}${data}`;
  }

  /**
   * Set barcode height - GS h n
   */
  static setBarcodeHeight(dots: number): string {
    return `${this.GS}h${String.fromCharCode(dots)}`;
  }

  /**
   * Set barcode width - GS w n
   * n = 2-6 (module width)
   */
  static setBarcodeWidth(width: number): string {
    return `${this.GS}w${String.fromCharCode(width)}`;
  }

  /**
   * Select HRI character print position - GS H n
   * n = 0: Not printed, 1: Above, 2: Below, 3: Both
   */
  static setBarcodeHRIPosition(position: 0 | 1 | 2 | 3): string {
    return `${this.GS}H${String.fromCharCode(position)}`;
  }

  /**
   * Cut paper - GS V m
   * m = 0 or 48: Partial cut, m = 1 or 49: Partial cut
   */
  static cutPaper(fullCut = false): string {
    return `${this.GS}V${String.fromCharCode(fullCut ? 1 : 0)}`;
  }

  /**
   * Cut paper with feed - GS V m n
   * Feeds paper and cuts
   */
  static cutPaperWithFeed(feedDots: number): string {
    return `${this.GS}V${String.fromCharCode(66)}${String.fromCharCode(feedDots)}`;
  }

  /**
   * Generate pulse (open cash drawer) - ESC p m t1 t2
   * m = 0: pin 2, m = 1: pin 5
   */
  static openCashDrawer(pin: 0 | 1 = 0, onTime = 50, offTime = 50): string {
    return `${this.ESC}p${String.fromCharCode(pin)}${String.fromCharCode(onTime)}${String.fromCharCode(offTime)}`;
  }

  /**
   * Print raster bit image - GS v 0 m xL xH yL yH d1...dk
   * m = 0: Normal, 1: Double-width, 2: Double-height, 3: Quadruple
   */
  static printRasterImage(
    width: number,
    height: number,
    data: Uint8Array,
    mode: 0 | 1 | 2 | 3 = 0
  ): string {
    const xL = width & 0xFF;
    const xH = (width >> 8) & 0xFF;
    const yL = height & 0xFF;
    const yH = (height >> 8) & 0xFF;
    
    let cmd = `${this.GS}v0${String.fromCharCode(mode)}`;
    cmd += String.fromCharCode(xL) + String.fromCharCode(xH);
    cmd += String.fromCharCode(yL) + String.fromCharCode(yH);
    cmd += String.fromCharCode(...Array.from(data));
    
    return cmd;
  }

  /**
   * Horizontal tab - HT
   */
  static horizontalTab(): string {
    return this.HT;
  }

  /**
   * Set horizontal tab positions - ESC D n1...nk NUL
   */
  static setTabPositions(positions: number[]): string {
    let cmd = `${this.ESC}D`;
    positions.forEach(pos => {
      cmd += String.fromCharCode(pos);
    });
    cmd += '\x00'; // NUL terminator
    return cmd;
  }

  /**
   * Print text with automatic line wrapping
   */
  static printText(text: string): string {
    return text;
  }

  /**
   * Beeper command - ESC B n t
   * n = number of beeps (1-9)
   * t = duration of each beep (1-9, t×50ms)
   */
  static beep(times: number, duration: number): string {
    return `${this.ESC}B${String.fromCharCode(times)}${String.fromCharCode(duration)}`;
  }

  /**
   * Select character code table - ESC t n
   * n = 0: PC437, 1: Katakana, 2: PC850, etc.
   */
  static selectCharacterCodeTable(table: number): string {
    return `${this.ESC}t${String.fromCharCode(table)}`;
  }
}
