import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { CreditNotePdfData } from '../types';
import { pdfStyles } from '../styles';
import { formatINR } from '@/lib/money';

export function CreditNotePdf({ data }: { data: CreditNotePdfData }) {
  const {
    creditNoteNumber,
    invoiceNumber,
    issueDate,
    reason,
    business,
    client,
    items,
    totalPaise,
    notes,
    isDemo,
  } = data;

  return (
    <Document title={`Credit Note - ${creditNoteNumber}`}>
      <Page size="A4" style={pdfStyles.page}>
        {/* DEMO Watermark */}
        {isDemo && <Text style={pdfStyles.watermark}>DEMO PREVIEW</Text>}

        {/* Header */}
        <View style={pdfStyles.header}>
          <View>
            {business.logoUrl ? (
              <Image src={business.logoUrl} style={pdfStyles.brandLogo} />
            ) : (
              <Text style={pdfStyles.brandTitle}>{business.businessName || 'VOWS'}</Text>
            )}
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
            <Text style={pdfStyles.docType}>CREDIT NOTE</Text>
            <Text style={pdfStyles.docNumber}>{creditNoteNumber}</Text>
            <Text style={pdfStyles.textMuted}>Issue Date: {issueDate}</Text>
            <Text style={pdfStyles.textMuted}>Ref Invoice: {invoiceNumber}</Text>
          </View>
        </View>

        {/* Client Details & Reason */}
        <View style={pdfStyles.gridTwoCol}>
          <View style={pdfStyles.col}>
            <Text style={pdfStyles.sectionHeading}>Issued To</Text>
            <Text style={pdfStyles.textBold}>{client.fullName}</Text>
            {client.phone && <Text style={pdfStyles.textRegular}>{client.phone}</Text>}
            {client.email && <Text style={pdfStyles.textRegular}>{client.email}</Text>}
            {client.billingAddress && (
              <Text style={pdfStyles.textRegular}>{client.billingAddress}</Text>
            )}
          </View>

          <View style={pdfStyles.col}>
            <Text style={pdfStyles.sectionHeading}>Credit Details</Text>
            <Text style={pdfStyles.textRegular}>Reference Invoice: #{invoiceNumber}</Text>
            <Text style={pdfStyles.textRegular}>Date: {issueDate}</Text>
            <Text style={[pdfStyles.textRegular, { marginTop: 4 }]}>
              Reason: <Text style={{ fontWeight: 'bold' }}>{reason}</Text>
            </Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.colIndex}>#</Text>
            <Text style={pdfStyles.colDesc}>Adjustment Description</Text>
            <Text style={pdfStyles.colQty}>Qty</Text>
            <Text style={pdfStyles.colRate}>Rate</Text>
            <Text style={pdfStyles.colAmount}>Credit Amount</Text>
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

        {/* Total Box */}
        <View style={pdfStyles.summaryContainer}>
          <View style={pdfStyles.summaryBox}>
            <View style={pdfStyles.totalRow}>
              <Text style={pdfStyles.totalLabel}>Total Credited</Text>
              <Text style={pdfStyles.totalValue}>
                {formatINR(BigInt(totalPaise))}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {notes && (
          <View style={pdfStyles.termsBox}>
            <Text style={pdfStyles.sectionHeading}>Remarks</Text>
            <Text style={pdfStyles.textRegular}>{notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={pdfStyles.footer}>
          <Text style={pdfStyles.footerText}>
            Credit note issued in reduction of outstanding balance on Invoice #{invoiceNumber}.
          </Text>
          <Text style={pdfStyles.footerText}>{creditNoteNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
