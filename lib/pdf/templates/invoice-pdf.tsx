import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { InvoicePdfData } from '../types';
import { pdfStyles } from '../styles';
import { formatINR } from '@/lib/money';

export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  const {
    invoiceNumber,
    issueDate,
    dueDate,
    status,
    business,
    client,
    items,
    subtotalPaise,
    discountPaise,
    taxablePaise,
    gstApplied,
    cgstPaise,
    sgstPaise,
    igstPaise,
    totalPaise,
    paidPaise,
    balancePaise,
    notesToClient,
    terms,
    isDemo,
  } = data;

  const totalTaxPaise = cgstPaise + sgstPaise + igstPaise;
  const isCancelled = status.toLowerCase() === 'cancelled';

  return (
    <Document title={`Tax Invoice - ${invoiceNumber}`}>
      <Page size="A4" style={pdfStyles.page}>
        {/* DEMO Watermark */}
        {isDemo && <Text style={pdfStyles.watermark}>DEMO PREVIEW</Text>}

        {/* CANCELLED Stamp */}
        {isCancelled && <Text style={pdfStyles.voidStamp}>CANCELLED</Text>}

        {/* Header */}
        <View style={pdfStyles.header}>
          <View>
            <Text style={pdfStyles.brandTitle}>{business.businessName || 'VOWS STUDIO'}</Text>
            {business.legalName && (
              <Text style={pdfStyles.brandSubtitle}>{business.legalName}</Text>
            )}
            {business.gstin && (
              <Text style={pdfStyles.brandSubtitle}>GSTIN: {business.gstin}</Text>
            )}
            {business.address && (
              <Text style={pdfStyles.brandSubtitle}>{business.address}</Text>
            )}
            {(business.phone || business.email) && (
              <Text style={pdfStyles.brandSubtitle}>
                {[business.phone, business.email].filter(Boolean).join(' • ')}
              </Text>
            )}
          </View>

          <View style={pdfStyles.docTitleBlock}>
            <Text style={pdfStyles.docType}>
              {business.gstin ? 'TAX INVOICE' : 'INVOICE'}
            </Text>
            <Text style={pdfStyles.docNumber}>{invoiceNumber}</Text>
            <Text style={pdfStyles.textMuted}>Issue Date: {issueDate}</Text>
            <Text style={pdfStyles.textMuted}>Due Date: {dueDate}</Text>
          </View>
        </View>

        {/* Client Details */}
        <View style={pdfStyles.gridTwoCol}>
          <View style={pdfStyles.col}>
            <Text style={pdfStyles.sectionHeading}>Billed To</Text>
            <Text style={pdfStyles.textBold}>{client.fullName}</Text>
            {client.phone && <Text style={pdfStyles.textRegular}>{client.phone}</Text>}
            {client.email && <Text style={pdfStyles.textRegular}>{client.email}</Text>}
            {client.billingAddress && (
              <Text style={pdfStyles.textRegular}>{client.billingAddress}</Text>
            )}
            {client.gstin && (
              <Text style={pdfStyles.textMuted}>Client GSTIN: {client.gstin}</Text>
            )}
          </View>

          <View style={pdfStyles.col}>
            <Text style={pdfStyles.sectionHeading}>Invoice Status</Text>
            <Text style={pdfStyles.textRegular}>
              Status:{' '}
              <Text style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                {status.replace(/_/g, ' ')}
              </Text>
            </Text>
            <Text style={pdfStyles.textRegular}>Invoice Date: {issueDate}</Text>
            <Text style={pdfStyles.textRegular}>Payment Due: {dueDate}</Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.colIndex}>#</Text>
            <Text style={pdfStyles.colDesc}>Description</Text>
            <Text style={pdfStyles.colQty}>Qty</Text>
            <Text style={pdfStyles.colRate}>Rate</Text>
            <Text style={pdfStyles.colAmount}>Amount</Text>
          </View>

          {items.map((item, idx) => (
            <View key={idx} style={pdfStyles.tableRow}>
              <Text style={pdfStyles.colIndex}>{idx + 1}</Text>
              <Text style={pdfStyles.colDesc}>{item.description}</Text>
              <Text style={pdfStyles.colQty}>{item.quantity}</Text>
              <Text style={pdfStyles.colRate}>
                {formatINR(BigInt(item.unitPricePaise))}
              </Text>
              <Text style={pdfStyles.colAmount}>
                {formatINR(BigInt(item.lineTotalPaise))}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals Summary */}
        <View style={pdfStyles.summaryContainer}>
          <View style={pdfStyles.summaryBox}>
            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Subtotal</Text>
              <Text style={pdfStyles.summaryValue}>
                {formatINR(BigInt(subtotalPaise))}
              </Text>
            </View>

            {discountPaise > 0 && (
              <View style={pdfStyles.summaryRow}>
                <Text style={pdfStyles.summaryLabel}>Discount</Text>
                <Text style={pdfStyles.summaryValue}>
                  - {formatINR(BigInt(discountPaise))}
                </Text>
              </View>
            )}

            {gstApplied && (
              <>
                <View style={pdfStyles.summaryRow}>
                  <Text style={pdfStyles.summaryLabel}>Taxable Base</Text>
                  <Text style={pdfStyles.summaryValue}>
                    {formatINR(BigInt(taxablePaise))}
                  </Text>
                </View>
                {cgstPaise > 0 && (
                  <View style={pdfStyles.summaryRow}>
                    <Text style={pdfStyles.summaryLabel}>CGST (9%)</Text>
                    <Text style={pdfStyles.summaryValue}>
                      {formatINR(BigInt(cgstPaise))}
                    </Text>
                  </View>
                )}
                {sgstPaise > 0 && (
                  <View style={pdfStyles.summaryRow}>
                    <Text style={pdfStyles.summaryLabel}>SGST (9%)</Text>
                    <Text style={pdfStyles.summaryValue}>
                      {formatINR(BigInt(sgstPaise))}
                    </Text>
                  </View>
                )}
                {igstPaise > 0 && (
                  <View style={pdfStyles.summaryRow}>
                    <Text style={pdfStyles.summaryLabel}>IGST (18%)</Text>
                    <Text style={pdfStyles.summaryValue}>
                      {formatINR(BigInt(igstPaise))}
                    </Text>
                  </View>
                )}
                <View style={pdfStyles.summaryRow}>
                  <Text style={pdfStyles.summaryLabel}>Total GST</Text>
                  <Text style={pdfStyles.summaryValue}>
                    {formatINR(BigInt(totalTaxPaise))}
                  </Text>
                </View>
              </>
            )}

            <View style={pdfStyles.totalRow}>
              <Text style={pdfStyles.totalLabel}>Invoice Total</Text>
              <Text style={pdfStyles.totalValue}>
                {formatINR(BigInt(totalPaise))}
              </Text>
            </View>

            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Amount Paid</Text>
              <Text style={[pdfStyles.summaryValue, { color: '#047857', fontWeight: 'bold' }]}>
                {formatINR(BigInt(paidPaise))}
              </Text>
            </View>

            <View style={[pdfStyles.summaryRow, { borderTopWidth: 0.5, borderColor: '#d6d3d1', paddingTop: 4 }]}>
              <Text style={[pdfStyles.summaryLabel, { fontWeight: 'bold' }]}>Balance Due</Text>
              <Text style={[pdfStyles.summaryValue, { fontWeight: 'bold', color: balancePaise > 0 ? '#b91c1c' : '#047857' }]}>
                {formatINR(BigInt(balancePaise))}
              </Text>
            </View>
          </View>
        </View>

        {/* Bank & Remittance details */}
        {business.bankAccountNumber && (
          <View style={pdfStyles.bankBox}>
            <Text style={pdfStyles.sectionHeading}>Bank Remittance Details</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={pdfStyles.textRegular}>Bank: {business.bankName}</Text>
                <Text style={pdfStyles.textRegular}>A/C Number: {business.bankAccountNumber}</Text>
              </View>
              <View>
                <Text style={pdfStyles.textRegular}>IFSC: {business.bankIfsc}</Text>
                {business.upiId && <Text style={pdfStyles.textRegular}>UPI ID: {business.upiId}</Text>}
              </View>
            </View>
          </View>
        )}

        {/* Notes & Terms */}
        {(notesToClient || terms) && (
          <View style={pdfStyles.termsBox}>
            {notesToClient && (
              <View style={{ marginBottom: 6 }}>
                <Text style={pdfStyles.sectionHeading}>Notes</Text>
                <Text style={pdfStyles.textRegular}>{notesToClient}</Text>
              </View>
            )}
            {terms && (
              <View>
                <Text style={pdfStyles.sectionHeading}>Terms & Conditions</Text>
                <Text style={pdfStyles.textMuted}>{terms}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={pdfStyles.footer}>
          <Text style={pdfStyles.footerText}>
            This is a computer-generated tax invoice issued by {business.businessName}.
          </Text>
          <Text style={pdfStyles.footerText}>{invoiceNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
