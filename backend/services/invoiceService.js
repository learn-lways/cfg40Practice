const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

class InvoiceService {
  constructor() {
    this.ensureDirectories();
  }

  // Ensure required directories exist
  ensureDirectories() {
    const invoicesDir = path.join(process.cwd(), "invoices");
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
      console.log("📁 Created invoices directory");
    }
  }

  // Generate PDF invoice
  async generateInvoicePDF(invoice) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 50 });
        const chunks = [];

        // Collect PDF data
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });
        doc.on("error", reject);

        // Generate PDF content
        this.buildInvoicePDF(doc, invoice);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Build PDF content
  buildInvoicePDF(doc, invoice) {
    // Colors
    const primaryColor = "#007bff";
    const textColor = "#333333";
    const lightGray = "#f8f9fa";

    // Header
    this.generateHeader(doc, invoice, primaryColor);

    // Company and Customer Info
    this.generateCompanyInfo(doc, invoice, 50, 150);
    this.generateCustomerInfo(doc, invoice, 300, 150);

    // Invoice Details
    this.generateInvoiceDetails(doc, invoice, 50, 250);

    // Items Table
    this.generateItemsTable(doc, invoice, 50, 320);

    // Totals
    this.generateTotals(doc, invoice, 350, 500);

    // Footer
    this.generateFooter(doc, invoice);
  }

  // Generate header
  generateHeader(doc, invoice, primaryColor) {
    doc
      .fillColor(primaryColor)
      .fontSize(28)
      .text("INVOICE", 50, 50, { align: "left" })
      .fillColor("#333333")
      .fontSize(12)
      .text(invoice.companyInfo.name, 50, 85)
      .text(invoice.companyInfo.website, 50, 100, {
        link: `https://${invoice.companyInfo.website}`,
      });

    // Invoice number and date
    doc
      .fillColor(primaryColor)
      .fontSize(16)
      .text(`Invoice #${invoice.invoiceNumber}`, 400, 50, { align: "right" })
      .fillColor("#666666")
      .fontSize(12)
      .text(
        `Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`,
        400,
        75,
        { align: "right" }
      )
      .text(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`, 400, 90, {
        align: "right",
      });

    // Horizontal line
    doc
      .strokeColor("#cccccc")
      .lineWidth(1)
      .moveTo(50, 120)
      .lineTo(550, 120)
      .stroke();
  }

  // Generate company info
  generateCompanyInfo(doc, invoice, x, y) {
    doc
      .fillColor("#333333")
      .fontSize(14)
      .text("From:", x, y)
      .fontSize(12)
      .text(invoice.companyInfo.name, x, y + 20)
      .text(invoice.companyInfo.address, x, y + 35)
      .text(`Phone: ${invoice.companyInfo.phone}`, x, y + 50)
      .text(`Email: ${invoice.companyInfo.email}`, x, y + 65)
      .text(`GST: ${invoice.companyInfo.gst}`, x, y + 80);
  }

  // Generate customer info
  generateCustomerInfo(doc, invoice, x, y) {
    doc
      .fillColor("#333333")
      .fontSize(14)
      .text("Bill To:", x, y)
      .fontSize(12)
      .text(invoice.billingAddress.name, x, y + 20)
      .text(invoice.billingAddress.address, x, y + 35)
      .text(
        `${invoice.billingAddress.city}, ${invoice.billingAddress.state}`,
        x,
        y + 50
      )
      .text(
        `${invoice.billingAddress.postalCode}, ${invoice.billingAddress.country}`,
        x,
        y + 65
      )
      .text(`Phone: ${invoice.billingAddress.phone}`, x, y + 80)
      .text(`Email: ${invoice.billingAddress.email}`, x, y + 95);
  }

  // Generate invoice details
  generateInvoiceDetails(doc, invoice, x, y) {
    const details = [
      { label: "Payment Method", value: invoice.paymentMethod.toUpperCase() },
      { label: "Payment Status", value: invoice.paymentStatus.toUpperCase() },
      { label: "Transaction ID", value: invoice.transactionId || "N/A" },
    ];

    doc.fillColor("#333333").fontSize(12);

    details.forEach((detail, index) => {
      doc
        .text(`${detail.label}:`, x, y + index * 15)
        .text(detail.value, x + 120, y + index * 15);
    });
  }

  // Generate items table
  generateItemsTable(doc, invoice, x, y) {
    const tableTop = y;
    const itemHeight = 20;

    // Table headers
    doc
      .fillColor("#007bff")
      .fontSize(12)
      .text("Item", x, tableTop)
      .text("Qty", x + 250, tableTop)
      .text("Price", x + 300, tableTop)
      .text("Total", x + 400, tableTop);

    // Header line
    doc
      .strokeColor("#cccccc")
      .lineWidth(1)
      .moveTo(x, tableTop + 15)
      .lineTo(x + 500, tableTop + 15)
      .stroke();

    // Items
    let currentY = tableTop + 25;
    doc.fillColor("#333333").fontSize(11);

    invoice.items.forEach((item, index) => {
      doc
        .text(item.name, x, currentY)
        .text(item.quantity.toString(), x + 250, currentY)
        .text(`₹${item.price.toFixed(2)}`, x + 300, currentY)
        .text(`₹${item.total.toFixed(2)}`, x + 400, currentY);

      currentY += itemHeight;
    });

    // Bottom line
    doc
      .strokeColor("#cccccc")
      .lineWidth(1)
      .moveTo(x, currentY + 5)
      .lineTo(x + 500, currentY + 5)
      .stroke();

    return currentY + 20;
  }

  // Generate totals
  generateTotals(doc, invoice, x, y) {
    const totals = [
      { label: "Subtotal", value: `₹${invoice.subtotal.toFixed(2)}` },
      {
        label: `Tax (${invoice.taxRate}%)`,
        value: `₹${invoice.tax.toFixed(2)}`,
      },
      { label: "Shipping", value: `₹${invoice.shippingCost.toFixed(2)}` },
      { label: "Discount", value: `-₹${invoice.discount.toFixed(2)}` },
    ];

    doc.fillColor("#333333").fontSize(12);

    totals.forEach((total, index) => {
      doc
        .text(total.label, x, y + index * 20)
        .text(total.value, x + 100, y + index * 20);
    });

    // Total amount
    doc
      .fillColor("#007bff")
      .fontSize(16)
      .text("Total Amount:", x, y + 100)
      .text(`₹${invoice.totalAmount.toFixed(2)}`, x + 100, y + 100);
  }

  // Generate footer
  generateFooter(doc, invoice) {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 100;

    // Payment status badge
    if (invoice.paymentStatus === "paid") {
      doc
        .fillColor("#28a745")
        .roundedRect(50, footerY - 50, 100, 25, 5)
        .fill()
        .fillColor("white")
        .fontSize(12)
        .text("PAID", 55, footerY - 45);
    }

    // Notes and terms
    doc
      .fillColor("#666666")
      .fontSize(10)
      .text("Notes:", 50, footerY - 20)
      .text(invoice.notes, 50, footerY - 5)
      .text("Terms & Conditions:", 50, footerY + 15)
      .text(invoice.terms, 50, footerY + 30, { width: 500 });
  }

  // Save PDF to file
  async savePDFToFile(invoice, pdfBuffer) {
    try {
      const filename = `Invoice-${invoice.invoiceNumber}.pdf`;
      const filepath = path.join(process.cwd(), "invoices", filename);

      fs.writeFileSync(filepath, pdfBuffer);

      console.log(`📄 Invoice PDF saved: ${filepath}`);
      return {
        success: true,
        filepath,
        filename,
        message: "PDF saved successfully",
      };
    } catch (error) {
      console.error("Error saving PDF:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to save PDF",
      };
    }
  }

  // Generate and save invoice
  async createInvoice(invoice) {
    try {
      // Generate PDF buffer
      const pdfBuffer = await this.generateInvoicePDF(invoice);

      // Save to file
      const saveResult = await this.savePDFToFile(invoice, pdfBuffer);

      return {
        success: true,
        pdfBuffer,
        filepath: saveResult.filepath,
        filename: saveResult.filename,
        message: "Invoice created successfully",
      };
    } catch (error) {
      console.error("Error creating invoice:", error);
      throw new Error(`Invoice creation failed: ${error.message}`);
    }
  }
}

module.exports = new InvoiceService();
