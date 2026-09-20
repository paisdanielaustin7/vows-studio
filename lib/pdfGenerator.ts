import { jsPDF } from 'jspdf';
import { ShootBooking, Invoice, Quotation, PDFThemeColor, StudioSettings } from '@/types';
import { defaultStudioSettings } from '@/lib/catalogDefaults';

// Format currency cleanly for PDF rendering
const formatINR = (val: number): string => {
  return 'Rs ' + new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(val) + ' /-';
};

interface PDFColorPalette {
  bg: [number, number, number];
  strip: [number, number, number];
  text: [number, number, number];
  muted: [number, number, number];
  accent: [number, number, number];
}

const PDF_PALETTES: Record<string, PDFColorPalette> = {
  sage: {
    bg: [243, 247, 244],
    strip: [228, 237, 231],
    text: [15, 23, 20],
    muted: [90, 105, 98],
    accent: [235, 56, 41],
  },
  monochrome: {
    bg: [248, 248, 248],
    strip: [232, 232, 232],
    text: [13, 13, 13],
    muted: [100, 100, 100],
    accent: [13, 13, 13],
  },
  sand_gold: {
    bg: [252, 250, 245],
    strip: [243, 236, 222],
    text: [28, 24, 18],
    muted: [120, 105, 85],
    accent: [175, 125, 40],
  },
  terracotta: {
    bg: [253, 247, 246],
    strip: [248, 231, 229],
    text: [30, 18, 16],
    muted: [125, 85, 80],
    accent: [215, 55, 40],
  },
};

// Helper: Convert hex to RGB tuple
const hexToRgb = (hex: string): [number, number, number] => {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [15, 23, 20];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

// Helper: Blend two RGB colors
const blendRgb = (
  c1: [number, number, number],
  c2: [number, number, number],
  ratio: number
): [number, number, number] => {
  return [
    Math.round(c1[0] * (1 - ratio) + c2[0] * ratio),
    Math.round(c1[1] * (1 - ratio) + c2[1] * ratio),
    Math.round(c1[2] * (1 - ratio) + c2[2] * ratio),
  ];
};

// Resolves theme palette from presets or custom customer palettes defined in settings
export const resolvePDFPalette = (settings: StudioSettings): PDFColorPalette => {
  const themeId = settings.pdfThemeColor || 'sage';

  // Check preset first
  if (PDF_PALETTES[themeId]) {
    return PDF_PALETTES[themeId];
  }

  // Check custom palettes
  if (settings.customPalettes && settings.customPalettes.length > 0) {
    const found = settings.customPalettes.find((p) => p.id === themeId);
    if (found) {
      const primaryRgb = hexToRgb(found.primaryColor);
      const bgRgb = hexToRgb(found.backgroundColor || '#f8f9fa');
      const textRgb = hexToRgb(found.textColor || '#111827');
      const stripRgb = blendRgb(bgRgb, primaryRgb, 0.12);
      const mutedRgb = blendRgb(textRgb, [150, 150, 150], 0.45);

      return {
        bg: bgRgb,
        strip: stripRgb,
        text: textRgb,
        muted: mutedRgb,
        accent: primaryRgb,
      };
    }
  }

  return PDF_PALETTES.sage;
};

/**
 * Generates an exact 2-page luxury Quotation PDF doc with custom theme colour, studio settings, and optional breakup hide
 */
export const createQuotationPDFDoc = (
  quote: Quotation,
  settings: StudioSettings = defaultStudioSettings
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  const palette = resolvePDFPalette(settings);

  // Background tint
  const drawBackground = () => {
    doc.setFillColor(palette.bg[0], palette.bg[1], palette.bg[2]);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  };

  // Draw Brand Header (VOWS Studio)
  const drawHeader = (yPos: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
    doc.text(settings.studioName || 'VOWS Studio', margin, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(palette.muted[0], palette.muted[1], palette.muted[2]);
    doc.text(settings.tagline || 'Photography & Cinema // by Reuben', margin, yPos + 3.5);

    // Quotation Number top right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
    doc.text(quote.quotationNumber, pageWidth - margin, yPos, { align: 'right' });
  };

  // ==========================================
  // PAGE 1: PACKAGE, REQUIREMENTS, DELIVERABLES
  // ==========================================
  drawBackground();
  drawHeader(24);

  let y = 48;

  // 1. Big "PACKAGE" title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text(quote.packageTitle.toUpperCase(), margin, y);

  y += 12;

  // 2. Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Date:  ${quote.date}`, margin, y);

  y += 14;

  // 3. Quoted To Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text('Quoted to:', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(quote.clientName, margin, y + 6);
  doc.text(quote.clientCity, margin, y + 12);

  y += 24;

  // 4. Requirements & Price Table (with optional hideBreakup)
  doc.setFillColor(palette.strip[0], palette.strip[1], palette.strip[2]);
  doc.roundedRect(margin, y, contentWidth, 9, 1, 1, 'F');

  const showBreakup = !quote.hideBreakup;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text('Requirement', margin + 6, y + 6.2);
  doc.text(showBreakup ? 'Price' : 'Status', pageWidth - margin - 8, y + 6.2, { align: 'right' });

  y += 11;

  const activeReqs = quote.requirements.filter((r) => r.included);
  activeReqs.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
    doc.text(item.name, margin + 6, y + 4.5);

    if (showBreakup) {
      const priceText = item.price && item.price !== '-' ? `${item.price}` : '-';
      doc.text(priceText, pageWidth - margin - 8, y + 4.5, { align: 'right' });
    } else {
      doc.setFontSize(8.5);
      doc.setTextColor(palette.muted[0], palette.muted[1], palette.muted[2]);
      doc.text('Included in Package', pageWidth - margin - 8, y + 4.5, { align: 'right' });
    }

    y += 9;
  });

  y += 2;

  // Total Strip
  doc.setFillColor(palette.strip[0], palette.strip[1], palette.strip[2]);
  doc.roundedRect(margin, y, contentWidth, 9, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text('Total', margin + 6, y + 6.3);
  doc.text(formatINR(quote.totalPrice), pageWidth - margin - 8, y + 6.3, { align: 'right' });

  y += 22;

  // 5. Deliverables Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text('Deliverables', pageWidth / 2, y, { align: 'center' });

  y += 8;

  // Deliverables Table Header
  doc.setFillColor(palette.strip[0], palette.strip[1], palette.strip[2]);
  doc.roundedRect(margin, y, contentWidth, 9, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text('Items', margin + 6, y + 6.2);
  doc.text('Details', margin + 95, y + 6.2);

  y += 11;

  const activeDelivs = quote.deliverables.filter((d) => d.included);
  activeDelivs.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
    doc.text(item.item, margin + 6, y + 4.5);

    doc.setFontSize(8);
    doc.setTextColor(palette.muted[0], palette.muted[1], palette.muted[2]);
    doc.text(item.details, margin + 95, y + 4.5);

    y += 9;
  });

  // ==========================================
  // PAGE 2: CREW ALLOCATION & TERMS
  // ==========================================
  doc.addPage();
  drawBackground();
  drawHeader(24);

  y = 48;

  // 6. Crew Allocation Table
  doc.setFillColor(palette.strip[0], palette.strip[1], palette.strip[2]);
  doc.roundedRect(margin, y, contentWidth, 9, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text('Crew Allocation', margin + 6, y + 6.2);
  doc.text('Number', pageWidth - margin - 8, y + 6.2, { align: 'right' });

  y += 11;

  quote.crewAllocation.forEach((crew) => {
    // Strip bracketed names for confidentiality (e.g. "Cinematographer (Gavin John)" -> "Cinematographer")
    const cleanRole = crew.role.replace(/\s*\([^)]*\)/g, '').trim();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
    doc.text(cleanRole, margin + 6, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.text('1', pageWidth - margin - 8, y + 4.5, { align: 'right' });

    y += 9;
  });

  y += 14;

  // 7. Terms & Conditions Title (Centered with underline)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text('Terms & Conditions', pageWidth / 2, y, { align: 'center' });
  const textWidth = doc.getTextWidth('Terms & Conditions');
  doc.setDrawColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - textWidth / 2, y + 1.5, pageWidth / 2 + textWidth / 2, y + 1.5);

  y += 12;

  // 8. Terms List (from quote or dynamic settings)
  const terms = quote.termsAndConditions || settings.termsAndConditions;
  doc.setFontSize(8.5);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);

  terms.forEach((term, idx) => {
    const fullText = `${idx + 1}. ${term}`;
    const wrapped = doc.splitTextToSize(fullText, contentWidth - 4);
    doc.setFont('helvetica', 'normal');
    doc.text(wrapped, margin + 2, y);
    y += wrapped.length * 4.6 + 1.6;
  });

  // 9. Bottom Footer Bar: Contact Name & Phone
  const footerY = pageHeight - 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text((quote.contactPerson || settings.contactPerson).toUpperCase(), margin, footerY);
  doc.text(quote.contactPhone || settings.contactPhone, pageWidth - margin, footerY, { align: 'right' });

  return doc;
};

export const generateQuotationPDF = (
  quote: Quotation,
  settings: StudioSettings = defaultStudioSettings
) => {
  const doc = createQuotationPDFDoc(quote, settings);
  doc.save(`Proposal for ${quote.clientName.trim()}.pdf`);
};

export const getQuotationPDFBlob = (
  quote: Quotation,
  settings: StudioSettings = defaultStudioSettings
): Blob => {
  const doc = createQuotationPDFDoc(quote, settings);
  return doc.output('blob');
};

export const getQuotationPDFBase64 = (
  quote: Quotation,
  settings: StudioSettings = defaultStudioSettings
): string => {
  const doc = createQuotationPDFDoc(quote, settings);
  return doc.output('datauristring');
};

/**
 * Generates an official Tax Invoice PDF with dynamic theme colour and banking remittance
 */
/**
 * Generates an official Tax Invoice PDF doc with dynamic theme colour and banking remittance
 */
export const createInvoicePDFDoc = (
  invoice: Invoice,
  settings: StudioSettings = defaultStudioSettings
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  const palette = resolvePDFPalette(settings);

  // Background tint
  doc.setFillColor(palette.bg[0], palette.bg[1], palette.bg[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Brand Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text(settings.studioName || 'VOWS Studio', margin, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(palette.muted[0], palette.muted[1], palette.muted[2]);
  doc.text(settings.tagline || 'Photography & Cinema // by Reuben', margin, 27.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text('TAX INVOICE', pageWidth - margin, 24, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(palette.muted[0], palette.muted[1], palette.muted[2]);
  doc.text(invoice.invoiceNumber, pageWidth - margin, 28, { align: 'right' });

  let y = 42;

  // Metadata Strip
  doc.setFillColor(palette.strip[0], palette.strip[1], palette.strip[2]);
  doc.roundedRect(margin, y, contentWidth, 14, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(palette.muted[0], palette.muted[1], palette.muted[2]);
  doc.text('BILLED TO', margin + 6, y + 5);
  doc.text('ISSUE DATE', margin + 70, y + 5);
  doc.text('DUE DATE', margin + 115, y + 5);
  doc.text('STATUS', pageWidth - margin - 8, y + 5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text(invoice.clientName, margin + 6, y + 10);
  doc.text(invoice.issueDate, margin + 70, y + 10);
  doc.text(invoice.dueDate, margin + 115, y + 10);

  // Status Badge
  const statusColor = invoice.status === 'PAID' ? [35, 120, 50] : [215, 55, 40];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(invoice.status, pageWidth - margin - 8, y + 10, { align: 'right' });

  y += 22;

  // Line Items Table Header (Only Deliverables & Total, No Split Prices)
  doc.setFillColor(palette.strip[0], palette.strip[1], palette.strip[2]);
  doc.roundedRect(margin, y, contentWidth, 9, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text('Deliverable & Scope of Production', margin + 6, y + 6.2);
  doc.text('Status', pageWidth - margin - 8, y + 6.2, { align: 'right' });

  y += 11;

  invoice.items.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);

    const lines = doc.splitTextToSize(item.description, contentWidth - 55);
    doc.text(lines[0], margin + 6, y + 4.5);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(palette.muted[0], palette.muted[1], palette.muted[2]);
    doc.text('Included in Package', pageWidth - margin - 8, y + 4.5, { align: 'right' });

    y += 9;
  });

  y += 4;

  // Totals (Display Total Only)
  doc.setFillColor(palette.strip[0], palette.strip[1], palette.strip[2]);
  doc.roundedRect(margin, y, contentWidth, 9, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text('Total Invoiced', margin + 6, y + 6.3);
  doc.text(formatINR(invoice.totalAmount), pageWidth - margin - 8, y + 6.3, { align: 'right' });

  y += 14;

  if (invoice.balanceDue > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(palette.accent[0], palette.accent[1], palette.accent[2]);
    doc.text(`Balance Payable:  ${formatINR(invoice.balanceDue)}`, pageWidth - margin, y, { align: 'right' });
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(35, 120, 50);
    doc.text('PAYMENT CLEARED IN FULL', pageWidth - margin, y, { align: 'right' });
  }

  y += 18;

  // Remittance Box using Dynamic Settings
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, contentWidth, 26, 1, 1, 'F');
  doc.setDrawColor(215, 225, 218);
  doc.roundedRect(margin, y, contentWidth, 26, 1, 1, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text('BANKING REMITTANCE (NEFT / RTGS / IMPS / UPI)', margin + 6, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(palette.muted[0], palette.muted[1], palette.muted[2]);
  doc.text(`Account Name: ${settings.bankingDetails.accountName}`, margin + 6, y + 12);
  doc.text(`Bank: ${settings.bankingDetails.bankName}, ${settings.bankingDetails.branch}`, margin + 6, y + 17);
  doc.text(`A/C No: ${settings.bankingDetails.accountNumber}  |  IFSC: ${settings.bankingDetails.ifscCode}${settings.bankingDetails.upiId ? `  |  UPI: ${settings.bankingDetails.upiId}` : ''}`, margin + 6, y + 22);

  // Footer
  const footerY = pageHeight - 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text(`${settings.contactPerson.toUpperCase()} // DIRECTOR`, margin, footerY);
  doc.text(settings.contactPhone, pageWidth - margin, footerY, { align: 'right' });

  return doc;
};

export const generateInvoicePDF = (
  invoice: Invoice,
  settings: StudioSettings = defaultStudioSettings
) => {
  const doc = createInvoicePDFDoc(invoice, settings);
  doc.save(`Invoice for ${invoice.clientName.trim()}.pdf`);
};

export const getInvoicePDFBlob = (
  invoice: Invoice,
  settings: StudioSettings = defaultStudioSettings
): Blob => {
  const doc = createInvoicePDFDoc(invoice, settings);
  return doc.output('blob');
};

export const getInvoicePDFBase64 = (
  invoice: Invoice,
  settings: StudioSettings = defaultStudioSettings
): string => {
  const doc = createInvoicePDFDoc(invoice, settings);
  const dataUri = doc.output('datauristring');
  return dataUri.split(',')[1];
};

/**
 * CLIENT CALL SHEET PDF (Financials, balance, and sensitive internal notes hidden)
 */
export const createClientCallSheetPDFDoc = (
  shoot: ShootBooking,
  settings: StudioSettings = defaultStudioSettings
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const palette = resolvePDFPalette(settings);

  doc.setFillColor(palette.bg[0], palette.bg[1], palette.bg[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Top Bar
  doc.setFillColor(palette.strip[0], palette.strip[1], palette.strip[2]);
  doc.roundedRect(margin, 20, contentWidth, 14, 1, 1, 'F');

  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('VOWS // PRODUCTION CALL SHEET', margin + 6, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`COMMISSION: ${shoot.shootCode}`, pageWidth - margin - 6, 28, { align: 'right' });

  let y = 44;

  // Title
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(shoot.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 2;

  // Client Details
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(palette.accent[0], palette.accent[1], palette.accent[2]);
  doc.text(`[ ${shoot.type.toUpperCase()} ]`, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(palette.muted[0], palette.muted[1], palette.muted[2]);
  doc.text(`Client: ${shoot.client.name}`, margin + 65, y);

  y += 10;

  // Logistics Box
  doc.setFillColor(palette.strip[0], palette.strip[1], palette.strip[2]);
  doc.roundedRect(margin, y, contentWidth, 22, 1, 1, 'F');

  doc.setTextColor(palette.muted[0], palette.muted[1], palette.muted[2]);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('EVENT DATE & CALL TIME', margin + 6, y + 6);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.setFontSize(9.5);
  doc.text(`${shoot.date} @ ${shoot.callTime}`, margin + 6, y + 12);
  doc.setFontSize(8);
  doc.setTextColor(palette.accent[0], palette.accent[1], palette.accent[2]);
  doc.text(`Wrap Target: ${shoot.endTime}`, margin + 6, y + 17.5);

  doc.setTextColor(palette.muted[0], palette.muted[1], palette.muted[2]);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('SET LOCATION', margin + contentWidth / 2, y + 6);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.setFontSize(9.5);
  doc.text(shoot.location.name, margin + contentWidth / 2, y + 12);
  doc.setFontSize(8);
  doc.setTextColor(palette.muted[0], palette.muted[1], palette.muted[2]);
  doc.text(shoot.location.city, margin + contentWidth / 2, y + 17.5);

  y += 30;

  // Timeline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text('EVENT SCHEDULE TIMELINE', margin, y);

  y += 4;
  doc.setFillColor(palette.strip[0], palette.strip[1], palette.strip[2]);
  doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'F');
  doc.setFontSize(8);
  doc.text('TIME', margin + 4, y + 4.8);
  doc.text('COVERAGE & EVENT ACTIVITY', margin + 30, y + 4.8);

  y += 9;

  shoot.scheduleTimeline.forEach((item) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(palette.accent[0], palette.accent[1], palette.accent[2]);
    doc.text(item.time, margin + 4, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
    const act = doc.splitTextToSize(item.activity, contentWidth - 40);
    doc.text(act[0], margin + 30, y + 4.5);

    y += 7.5;
  });

  y += 10;

  // Client Set Guidelines & Notes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text('IMPORTANT EVENT GUIDELINES', margin, y);

  y += 4;
  const guidelines = [
    'Please ensure couple portraiture sessions begin on schedule for optimal coastal light.',
    'Hard drive for master RAW data collection should be handed to the lead crew coordinator.',
    'Accommodation and travel arrangements should be verified as per booking agreement.',
  ];

  guidelines.forEach((g, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(palette.muted[0], palette.muted[1], palette.muted[2]);
    doc.text(`${idx + 1}. ${g}`, margin + 2, y + 4);
    y += 6.5;
  });

  // Footer
  const footerY = pageHeight - 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
  doc.text('VOWS // WEDDING CINEMATICS & STILLS', margin, footerY);
  doc.text(`CONTACT: ${settings.contactPhone}`, pageWidth - margin, footerY, { align: 'right' });

  return doc;
};

export const generateClientCallSheetPDF = (
  shoot: ShootBooking,
  settings: StudioSettings = defaultStudioSettings
) => {
  const doc = createClientCallSheetPDFDoc(shoot, settings);
  doc.save(`Call Sheet for ${shoot.client.name.trim()}.pdf`);
};

/**
 * CREW TECHNICAL CALL SHEET PDF (Full gear checklist, gate access, technical timeline)
 */
export const createCrewCallSheetPDFDoc = (
  shoot: ShootBooking,
  settings: StudioSettings = defaultStudioSettings
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const palette = resolvePDFPalette(settings);

  doc.setFillColor(palette.bg[0], palette.bg[1], palette.bg[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Top Bar
  doc.setFillColor(13, 13, 13);
  doc.roundedRect(margin, 20, contentWidth, 14, 1, 1, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('VOWS // TECHNICAL CREW CALL SHEET', margin + 6, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`CODE: ${shoot.shootCode}`, pageWidth - margin - 6, 28, { align: 'right' });

  let y = 44;

  // Title
  doc.setTextColor(13, 13, 13);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(shoot.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 2;

  // Type & Location
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(palette.accent[0], palette.accent[1], palette.accent[2]);
  doc.text(`[ ${shoot.type.toUpperCase()} ]`, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Client: ${shoot.client.name} — ${shoot.client.company}`, margin + 65, y);

  y += 10;

  // Logistics Box with Gate Access
  doc.setFillColor(palette.strip[0], palette.strip[1], palette.strip[2]);
  doc.roundedRect(margin, y, contentWidth, 22, 1, 1, 'F');

  doc.setTextColor(70, 80, 75);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('CALL TIME & WRAP TARGET', margin + 6, y + 6);
  doc.setTextColor(13, 13, 13);
  doc.setFontSize(9.5);
  doc.text(`${shoot.date} @ ${shoot.callTime}`, margin + 6, y + 12);
  doc.setFontSize(8);
  doc.setTextColor(palette.accent[0], palette.accent[1], palette.accent[2]);
  doc.text(`Wrap Target: ${shoot.endTime}`, margin + 6, y + 17.5);

  doc.setTextColor(70, 80, 75);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('LOCATION & ACCESS CODE', margin + contentWidth / 2, y + 6);
  doc.setTextColor(13, 13, 13);
  doc.setFontSize(9.5);
  doc.text(shoot.location.name, margin + contentWidth / 2, y + 12);
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text(`${shoot.location.city} // Code: ${shoot.location.accessCode || 'Open Set'}`, margin + contentWidth / 2, y + 17.5);

  y += 30;

  // Technical Timeline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 20);
  doc.text('PRODUCTION SCHEDULE & CREW LEADS', margin, y);

  y += 4;
  doc.setFillColor(palette.strip[0], palette.strip[1], palette.strip[2]);
  doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'F');
  doc.setFontSize(8);
  doc.text('TIME', margin + 4, y + 4.8);
  doc.text('ACTIVITY / SETUP SPECIFICATION', margin + 30, y + 4.8);
  doc.text('COORDINATOR', margin + 125, y + 4.8);

  y += 9;

  shoot.scheduleTimeline.forEach((item) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(palette.accent[0], palette.accent[1], palette.accent[2]);
    doc.text(item.time, margin + 4, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(13, 13, 13);
    const act = doc.splitTextToSize(item.activity, 92);
    doc.text(act[0], margin + 30, y + 4.5);

    doc.setTextColor(90, 90, 90);
    doc.text(item.lead, margin + 125, y + 4.5);

    y += 7.5;
  });

  y += 8;

  // Allocated Gear Checklist
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 20);
  doc.text(`ALLOCATED STUDIO & RENTAL GEAR (${shoot.gearAllocated.length} ITEMS)`, margin, y);

  y += 4;
  shoot.gearAllocated.forEach((gear, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 40, 35);
    doc.text(`[✓]  ${gear}`, margin + 4, y + 4);
    y += 6;
  });

  y += 6;

  // Crew Dispatch
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 20);
  doc.text(`CONFIRMED CREW DISPATCH (${shoot.productionTeam.length})`, margin, y);

  y += 4;
  const colWidth = contentWidth / 2;
  shoot.productionTeam.forEach((member, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const itemX = margin + col * colWidth;
    const itemY = y + row * 9;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(itemX, itemY, colWidth - 2, 7.5, 1, 1, 'F');
    doc.setDrawColor(220, 220, 218);
    doc.roundedRect(itemX, itemY, colWidth - 2, 7.5, 1, 1, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(13, 13, 13);
    doc.text(member.name, itemX + 4, itemY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text(member.role, itemX + 45, itemY + 5);
  });

  // Footer
  const footerY = pageHeight - 14;
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text('VOWS // TECHNICAL DIGITAL DISPATCH', margin, footerY);
  doc.text(`CONFIDENTIAL PRODUCTION DOSSIER`, pageWidth - margin, footerY, { align: 'right' });

  return doc;
};

export const generateCrewCallSheetPDF = (
  shoot: ShootBooking,
  settings: StudioSettings = defaultStudioSettings
) => {
  const doc = createCrewCallSheetPDFDoc(shoot, settings);
  doc.save(`Crew Call Sheet - ${shoot.shootCode.trim()}.pdf`);
};

export const generateCallSheetPDF = (
  shoot: ShootBooking,
  settings: StudioSettings = defaultStudioSettings
) => {
  generateCrewCallSheetPDF(shoot, settings);
};
