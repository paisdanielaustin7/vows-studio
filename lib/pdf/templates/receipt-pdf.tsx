import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { ReceiptPdfData } from '../types';
import { pdfStyles } from '../styles';
import { formatINR } from '@/lib/money';

export function ReceiptPdf({ data }: { data: ReceiptPdfData }) {
  const {
    receiptNumber,
    paymentDate,
    amountPaise,
    paymentMethod,
    referenceNumber,
    status,
    business,
    client,
    allocations,
    notes,
    isDemo,
  } = data;

  const isVoided = status === 'voided';

  return (
    <Document title={`Payment Receipt - ${receiptNumber}`}>
      <Page size="A4" style={pdfStyles.page}>
        {/* DEMO Watermark */}
        {isDemo && <Text style={pdfStyles.watermark}>DEMO PREVIEW</Text>}

        {/* VOID Stamp */}
        {isVoided && <Text style={pdfStyles.voidStamp}>VOIDED</Text>}

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
            <Text style={pdfStyles.docType}>PAYMENT RECEIPT</Text>
            <Text style={pdfStyles.docNumber}>{receiptNumber}</Text>
            <Text style={pdfStyles.textMuted}>Receipt Date: {paymentDate}</Text>
            <Text style={pdfStyles.textMuted}>
              Status: {isVoided ? 'VOIDED' : 'CONFIRMED'}
            </Text>
          </View>
        </View>

        {/* Received From & Payment Info */}
        <View style={pdfStyles.gridTwoCol}>
          <View style={pdfStyles.col}>
            <Text style={pdfStyles.sectionHeading}>Received From</Text>
            <Text style={pdfStyles.textBold}>{client.fullName}</Text>
            {client.phone && <Text style={pdfStyles.textRegular}>{client.phone}</Text>}
            {client.email && <Text style={pdfStyles.textRegular}>{client.email}</Text>}
            {client.billingAddress && (
              <Text style={pdfStyles.textRegular}>{client.billingAddress}</Text>
            )}
          </View>

          <View style={pdfStyles.col}>
            <Text style={pdfStyles.sectionHeading}>Payment Details</Text>
            <Text style={pdfStyles.textRegular}>
              Method: <Text style={{ textTransform: 'capitalize' }}>{paymentMethod.replace(/_/g, ' ')}</Text>
            </Text>
            {referenceNumber && (
              <Text style={pdfStyles.textRegular}>Reference / UTR: {referenceNumber}</Text>
            )}
            <Text style={pdfStyles.textRegular}>Payment Date: {paymentDate}</Text>
          </View>
        </View>

        {/* Amount Box */}
        <View style={[pdfStyles.bankBox, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', padding: 16, marginBottom: 20 }]}>
          <Text style={{ fontSize: 9, color: '#166534', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Amount Received
          </Text>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#15803d', marginTop: 4 }}>
            {formatINR(BigInt(amountPaise))}
          </Text>
        </View>

        {/* Allocation Breakdown */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.colIndex}>#</Text>
            <Text style={[pdfStyles.colDesc, { width: '64%' }]}>Invoice Settled</Text>
            <Text style={[pdfStyles.colAmount, { width: '30%' }]}>Allocated Amount</Text>
          </View>

          {allocations.map((alloc, idx) => (
            <View key={idx} style={pdfStyles.tableRow}>
              <Text style={pdfStyles.colIndex}>{idx + 1}</Text>
              <Text style={[pdfStyles.colDesc, { width: '64%' }]}>
                Invoice #{alloc.invoiceNumber}
              </Text>
              <Text style={[pdfStyles.colAmount, { width: '30%' }]}>
                {formatINR(BigInt(alloc.allocatedAmountPaise))}
              </Text>
            </View>
          ))}
        </View>

        {/* Notes */}
        {notes && (
          <View style={pdfStyles.termsBox}>
            <Text style={pdfStyles.sectionHeading}>Notes</Text>
            <Text style={pdfStyles.textRegular}>{notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={pdfStyles.footer}>
          <Text style={pdfStyles.footerText}>
            Official payment receipt acknowledging receipt of funds.
          </Text>
          <Text style={pdfStyles.footerText}>{receiptNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
