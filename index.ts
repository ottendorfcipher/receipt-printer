/**
 * receipt-printer
 * 80mm Thermal Receipt Printer Library with ESC/POS Commands
 * Includes opinionated receipt layout presets
 */

// Export ESC/POS Commands
export { EscPosCommands as ESC } from './EscPosCommands';

// Export Receipt Builder
export {
  ReceiptBuilder,
  LayoutReceiptDesign,
  type ReceiptHeader,
  type ReceiptItem,
  type ReceiptFooter
} from './ReceiptBuilder';
