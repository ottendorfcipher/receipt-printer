// Receipt Printer UI - Interactive Controller
// Following NN/G principles: immediate feedback, error prevention, recognition over recall

class ReceiptUI {
    constructor() {
        this.items = [];
        this.initElements();
        this.attachEventListeners();
        this.loadThemePreference();
        this.loadPrinters();
        this.loadSampleData();
        this.updatePreview();
    }

    initElements() {
        // Form elements
        this.form = {
            storeName: document.getElementById('storeName'),
            address: document.getElementById('address'),
            phone: document.getElementById('phone'),
            taxId: document.getElementById('taxId'),
            receiptNo: document.getElementById('receiptNo'),
            cashier: document.getElementById('cashier'),
            subtotal: document.getElementById('subtotal'),
            tax: document.getElementById('tax'),
            discount: document.getElementById('discount'),
            total: document.getElementById('total'),
            paymentMethod: document.getElementById('paymentMethod'),
            amountPaid: document.getElementById('amountPaid'),
            change: document.getElementById('change'),
            footerMessage: document.getElementById('footerMessage'),
            barcode: document.getElementById('barcode')
        };

        // UI elements
        this.itemsList = document.getElementById('itemsList');
        this.receiptContent = document.getElementById('receiptContent');
        this.itemTemplate = document.getElementById('itemTemplate');
        this.toast = document.getElementById('toast');
        this.themeToggle = document.getElementById('themeToggle');

        // Buttons
        this.addItemBtn = document.getElementById('addItemBtn');
        this.printBtn = document.getElementById('printBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.generateReceiptNoBtn = document.getElementById('generateReceiptNo');
        this.printerSelect = document.getElementById('printerSelect');
        this.refreshPrintersBtn = document.getElementById('refreshPrintersBtn');
    }

    attachEventListeners() {
        // Button clicks
        this.addItemBtn.addEventListener('click', () => this.addItem());
        this.printBtn.addEventListener('click', () => this.printReceipt());
        this.resetBtn.addEventListener('click', () => this.resetForm());
        this.generateReceiptNoBtn.addEventListener('click', () => this.generateReceiptNumber());
        this.refreshPrintersBtn.addEventListener('click', () => this.loadPrinters());
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Form changes - debounced for performance (KLM-GOMS: minimize cognitive load)
        const debouncedUpdate = this.debounce(() => this.updatePreview(), 300);
        
        Object.values(this.form).forEach(element => {
            if (element) {
                element.addEventListener('input', debouncedUpdate);
                element.addEventListener('change', debouncedUpdate);
            }
        });

        // Immediate calculation updates (no debounce for numeric feedback)
        this.form.tax.addEventListener('input', () => this.calculateTotals());
        this.form.discount.addEventListener('input', () => this.calculateTotals());
        this.form.amountPaid.addEventListener('input', () => this.calculateChange());
    }

    // Add new item (Progressive Disclosure)
    addItem(data = {}) {
        const itemCard = this.itemTemplate.content.cloneNode(true);
        const itemDiv = itemCard.querySelector('.item-card');
        
        // Set unique ID for tracking
        const itemId = Date.now() + Math.random();
        itemDiv.dataset.itemId = itemId;

        // Get input elements
        const nameInput = itemCard.querySelector('.item-name');
        const quantityInput = itemCard.querySelector('.item-quantity');
        const priceInput = itemCard.querySelector('.item-price');
        const totalValue = itemCard.querySelector('.item-total-value');
        const removeBtn = itemCard.querySelector('.btn-remove');
        const itemNumber = itemCard.querySelector('.item-number');

        // Set values if provided
        if (data.name) nameInput.value = data.name;
        if (data.quantity) quantityInput.value = data.quantity;
        if (data.price) priceInput.value = data.price;

        // Update item number
        itemNumber.textContent = `Item ${this.items.length + 1}`;

        // Auto-calculate item total (immediate feedback)
        const updateItemTotal = () => {
            const qty = parseFloat(quantityInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const total = qty * price;
            totalValue.textContent = `$${total.toFixed(2)}`;
            this.calculateTotals();
            this.updatePreview();
        };

        quantityInput.addEventListener('input', updateItemTotal);
        priceInput.addEventListener('input', updateItemTotal);
        nameInput.addEventListener('input', () => this.updatePreview());

        // Remove button
        removeBtn.addEventListener('click', () => {
            itemDiv.remove();
            this.items = this.items.filter(item => item.id !== itemId);
            this.renumberItems();
            this.calculateTotals();
            this.updatePreview();
        });

        // Store item reference
        this.items.push({
            id: itemId,
            element: itemDiv,
            getName: () => nameInput.value,
            getQuantity: () => parseFloat(quantityInput.value) || 0,
            getPrice: () => parseFloat(priceInput.value) || 0
        });

        this.itemsList.appendChild(itemCard);
        updateItemTotal();

        // Focus on name input (efficient interaction - KLM-GOMS)
        nameInput.focus();
    }

    removeItem(itemId) {
        const itemIndex = this.items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            this.items[itemIndex].element.remove();
            this.items.splice(itemIndex, 1);
            this.renumberItems();
            this.calculateTotals();
            this.updatePreview();
        }
    }

    renumberItems() {
        this.items.forEach((item, index) => {
            const itemNumber = item.element.querySelector('.item-number');
            if (itemNumber) {
                itemNumber.textContent = `Item ${index + 1}`;
            }
        });
    }

    // Auto-calculate subtotal and total (Error Prevention)
    calculateTotals() {
        const subtotal = this.items.reduce((sum, item) => {
            return sum + (item.getQuantity() * item.getPrice());
        }, 0);

        const tax = parseFloat(this.form.tax.value) || 0;
        const discount = parseFloat(this.form.discount.value) || 0;
        const total = subtotal + tax - discount;

        this.form.subtotal.value = subtotal.toFixed(2);
        this.form.total.value = total.toFixed(2);

        this.calculateChange();
    }

    calculateChange() {
        const total = parseFloat(this.form.total.value) || 0;
        const amountPaid = parseFloat(this.form.amountPaid.value) || 0;
        const change = Math.max(0, amountPaid - total);

        this.form.change.value = change.toFixed(2);
    }


    // Load available printers from server
    async loadPrinters() {
        try {
            const response = await fetch('/api/printers');
            const result = await response.json();

            if (result.success && result.printers) {
                this.printerSelect.innerHTML = '';
                
                if (result.printers.length === 0) {
                    this.printerSelect.innerHTML = '<option value="">No printers found</option>';
                } else {
                    result.printers.forEach(printer => {
                        const option = document.createElement('option');
                        const isPdf = printer.isPdf === true || /pdf/i.test(printer.name || '');
                        const labelName = isPdf ? 'Print to PDF' : printer.name;
                        option.value = printer.name;
                        option.textContent = labelName;
                        this.printerSelect.appendChild(option);
                    });
                    
                    // Auto-select a receipt printer if available, otherwise PDF, otherwise first.
                    const receipt = result.printers.find(p => p.isReceipt);
                    const pdf = result.printers.find(p => p.isPdf || /pdf/i.test(p.name || ''));
                    if (receipt) {
                        this.printerSelect.value = receipt.name;
                    } else if (pdf) {
                        this.printerSelect.value = pdf.name;
                    } else if (result.printers[0]) {
                        this.printerSelect.value = result.printers[0].name;
                    }
                }
            } else {
                this.printerSelect.innerHTML = '<option value="">Error loading printers</option>';
            }
        } catch (error) {
            console.error('Failed to load printers:', error);
            this.printerSelect.innerHTML = '<option value="">Connection error</option>';
        }
    }

    // Generate receipt number (Recognition over Recall)
    generateReceiptNumber() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
        
        this.form.receiptNo.value = `R-${year}${month}${day}-${time}`;
        this.updatePreview();
    }

    // Real-time preview update (Immediate Feedback)
    updatePreview() {
        const data = this.getFormData();
        const html = this.generatePreviewHTML(data);
        this.receiptContent.innerHTML = html;
    }

    generatePreviewHTML(data) {
        if (!data.storeName && this.items.length === 0) {
            return '<p class="preview-placeholder">Configure receipt details to see preview</p>';
        }

        let html = '<div class="receipt-preview-content">';

        // Header
        if (data.storeName) {
            html += '<div class="receipt-header">';
            html += `<div class="receipt-store-name">${this.escapeHtml(data.storeName)}</div>`;
            if (data.address) html += `<div>${this.escapeHtml(data.address)}</div>`;
            if (data.phone) html += `<div>Tel: ${this.escapeHtml(data.phone)}</div>`;
            if (data.taxId) html += `<div>Tax ID: ${this.escapeHtml(data.taxId)}</div>`;
            html += '</div>';
        }

        html += '<div class="receipt-separator"></div>';

        // Receipt info
        if (data.receiptNo || data.cashier) {
            if (data.receiptNo) html += `<div>Receipt No: ${this.escapeHtml(data.receiptNo)}</div>`;
            html += `<div>Date: ${new Date().toLocaleString()}</div>`;
            if (data.cashier) html += `<div>Cashier: ${this.escapeHtml(data.cashier)}</div>`;
            html += '<div class="receipt-separator"></div>';
        }

        // Items
        if (this.items.length > 0) {
            this.items.forEach(item => {
                const name = item.getName();
                const qty = item.getQuantity();
                const price = item.getPrice();
                const total = qty * price;

                if (name) {
                    html += '<div class="receipt-item">';
                    html += `<div>${this.escapeHtml(name)}</div>`;
                    html += '<div class="receipt-row">';
                    html += `<div class="receipt-item-details">${qty} x $${price.toFixed(2)}</div>`;
                    html += `<div>$${total.toFixed(2)}</div>`;
                    html += '</div>';
                    html += '</div>';
                }
            });

            html += '<div class="receipt-separator"></div>';
        }

        // Totals
        const subtotal = parseFloat(data.subtotal) || 0;
        const tax = parseFloat(data.tax) || 0;
        const discount = parseFloat(data.discount) || 0;
        const total = parseFloat(data.total) || 0;

        if (subtotal > 0) {
            html += `<div class="receipt-row"><span>Subtotal:</span><span>$${subtotal.toFixed(2)}</span></div>`;
            if (discount > 0) html += `<div class="receipt-row"><span>Discount:</span><span>-$${discount.toFixed(2)}</span></div>`;
            if (tax > 0) html += `<div class="receipt-row"><span>Tax:</span><span>$${tax.toFixed(2)}</span></div>`;
            html += `<div class="receipt-row receipt-total"><span>TOTAL:</span><span>$${total.toFixed(2)}</span></div>`;
            html += '<div class="receipt-separator"></div>';
        }

        // Payment
        if (data.paymentMethod) {
            html += `<div>Payment: ${this.escapeHtml(data.paymentMethod)}</div>`;
            const amountPaid = parseFloat(data.amountPaid) || 0;
            const change = parseFloat(data.change) || 0;
            if (amountPaid > 0) {
                html += `<div class="receipt-row"><span>Amount Paid:</span><span>$${amountPaid.toFixed(2)}</span></div>`;
                if (change > 0) html += `<div class="receipt-row"><span>Change:</span><span>$${change.toFixed(2)}</span></div>`;
            }
            html += '<div class="receipt-separator"></div>';
        }

        // Footer
        if (data.footerMessage) {
            html += `<div class="receipt-footer">${this.escapeHtml(data.footerMessage).replace(/\n/g, '<br>')}</div>`;
        }

        if (data.barcode) {
            html += `<div class="receipt-barcode">${this.escapeHtml(data.barcode)}</div>`;
        }

        html += '</div>';
        return html;
    }

    getFormData() {
        return {
            storeName: this.form.storeName.value,
            address: this.form.address.value,
            phone: this.form.phone.value,
            taxId: this.form.taxId.value,
            receiptNo: this.form.receiptNo.value,
            cashier: this.form.cashier.value,
            subtotal: this.form.subtotal.value,
            tax: this.form.tax.value,
            discount: this.form.discount.value,
            total: this.form.total.value,
            paymentMethod: this.form.paymentMethod.value,
            amountPaid: this.form.amountPaid.value,
            change: this.form.change.value,
            footerMessage: this.form.footerMessage.value,
            barcode: this.form.barcode.value,
            items: this.items.map(item => ({
                name: item.getName(),
                quantity: item.getQuantity(),
                price: item.getPrice()
            }))
        };
    }

    // Print receipt - Try Web Serial first, fallback to server
    async printReceipt() {
        // Validation (Error Prevention)
        if (!this.form.storeName.value) {
            this.showToast('Please enter a store name', 'error');
            this.form.storeName.focus();
            return;
        }

        if (!this.form.receiptNo.value) {
            this.showToast('Please enter a receipt number', 'error');
            this.form.receiptNo.focus();
            return;
        }

        if (this.items.length === 0) {
            this.showToast('Please add at least one item', 'error');
            return;
        }

        // Try server-side printing (more reliable for Windows)
        await this.printViaServer();
    }

    // Print via server (Windows printer driver)
    async printViaServer() {
        // Check if printer is selected
        const selectedPrinter = this.printerSelect.value;
        if (!selectedPrinter) {
            this.showToast('Please select a printer', 'error');
            return;
        }

        this.printBtn.disabled = true;
        this.printBtn.textContent = 'Printing...';

        try {
            const data = this.getFormData();
            data.printerName = selectedPrinter;
            
            const response = await fetch('/api/print', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Receipt printed successfully!', 'success');
            } else {
                this.showToast(result.error || 'Print failed', 'error');
            }
        } catch (error) {
            console.error('Print error:', error);
            this.showToast('Failed to print. Check if server is running.', 'error');
        } finally {
            this.printBtn.disabled = false;
            this.printBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print Receipt
            `;
        }
    }

    // Reset form
    resetForm() {
        if (confirm('Are you sure you want to reset the form? All data will be lost.')) {
            Object.values(this.form).forEach(element => {
                if (element && element.tagName !== 'SELECT') {
                    element.value = '';
                }
            });

            // Remove all items
            this.items.forEach(item => item.element.remove());
            this.items = [];

            // Reset to defaults
            this.form.paymentMethod.value = 'Cash';
            
            this.updatePreview();
            this.showToast('Form reset', 'success');
        }
    }

    // Load sample data (helps users understand interface - Recognition over Recall)
    loadSampleData() {
        this.form.storeName.value = 'My Awesome Store';
        this.form.address.value = '123 Main Street, City, State 12345';
        this.form.phone.value = '(555) 123-4567';
        this.form.taxId.value = 'TAX-123456789';
        this.generateReceiptNumber();
        this.form.cashier.value = 'John Doe';
        this.form.footerMessage.value = 'Thank you for your purchase!\nPlease visit us again!';
        
        // Add sample items
        this.addItem({ name: 'Coffee - Large', quantity: 2, price: 4.50 });
        this.addItem({ name: 'Croissant', quantity: 1, price: 3.25 });
        
        this.form.tax.value = '1.10';
        this.form.amountPaid.value = '20.00';
        
        this.calculateTotals();
        this.updatePreview();
    }

    // Toast notifications (Immediate Feedback)
    showToast(message, type = 'success') {
        this.toast.textContent = message;
        this.toast.className = `toast ${type} show`;

        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }

    // Theme handling
    loadThemePreference() {
        let theme = 'light';
        try {
            const stored = window.localStorage && window.localStorage.getItem('theme');
            if (stored === 'light' || stored === 'dark') {
                theme = stored;
            } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                theme = 'dark';
            }
        } catch (e) {
            // Fallback to light on any error
            theme = 'light';
        }
        this.applyTheme(theme);
    }

    applyTheme(theme) {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);

        if (this.themeToggle) {
            const isDark = theme === 'dark';
            this.themeToggle.setAttribute('aria-pressed', String(isDark));
            this.themeToggle.textContent = isDark ? 'Light mode' : 'Dark mode';
        }

        try {
            if (window.localStorage) {
                window.localStorage.setItem('theme', theme);
            }
        } catch (e) {
            // Ignore storage errors
        }
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        this.applyTheme(next);
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.receiptUI = new ReceiptUI();
});
