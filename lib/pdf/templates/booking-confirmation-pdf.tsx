import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { BookingConfirmationPdfData } from '../types';
import { pdfStyles } from '../styles';
import { formatINR } from '@/lib/money';

export function BookingConfirmationPdf({ data }: { data: BookingConfirmationPdfData }) {
  const {
    bookingNumber,
    confirmationDate,
    client,
    business,
    events,
    crewRoles,
    deliverables,
    totalContractPaise,
    notes,
    isDemo,
  } = data;

  return (
    <Document title={`Booking Confirmation - ${bookingNumber}`}>
      <Page size="A4" style={pdfStyles.page}>
        {/* DEMO Watermark */}
        {isDemo && <Text style={pdfStyles.watermark}>DEMO PREVIEW</Text>}

        {/* Header */}
        <View style={pdfStyles.header}>
          <View>
            <Text style={pdfStyles.brandTitle}>{business.businessName || 'VOWS STUDIO'}</Text>
            {business.legalName && (
              <Text style={pdfStyles.brandSubtitle}>{business.legalName}</Text>
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
            <Text style={pdfStyles.docType}>BOOKING CONFIRMATION</Text>
            <Text style={pdfStyles.docNumber}>{bookingNumber}</Text>
            <Text style={pdfStyles.textMuted}>Confirmed: {confirmationDate}</Text>
          </View>
        </View>

        {/* Client & Contract Value */}
        <View style={pdfStyles.gridTwoCol}>
          <View style={pdfStyles.col}>
            <Text style={pdfStyles.sectionHeading}>Client Information</Text>
            <Text style={pdfStyles.textBold}>{client.fullName}</Text>
            {client.phone && <Text style={pdfStyles.textRegular}>{client.phone}</Text>}
            {client.email && <Text style={pdfStyles.textRegular}>{client.email}</Text>}
          </View>

          <View style={pdfStyles.col}>
            <Text style={pdfStyles.sectionHeading}>Production Scope</Text>
            <Text style={pdfStyles.textRegular}>Contract Total: {formatINR(BigInt(totalContractPaise))}</Text>
            <Text style={pdfStyles.textRegular}>Total Events: {events.length}</Text>
          </View>
        </View>

        {/* Scheduled Events Section */}
        <View style={{ marginBottom: 16 }}>
          <Text style={pdfStyles.sectionHeading}>Scheduled Production Events</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={{ width: '35%' }}>Event Name</Text>
              <Text style={{ width: '25%' }}>Date</Text>
              <Text style={{ width: '20%' }}>Timings</Text>
              <Text style={{ width: '20%' }}>Venue</Text>
            </View>
            {events.map((ev, idx) => (
              <View key={idx} style={pdfStyles.tableRow}>
                <Text style={[{ width: '35%' }, pdfStyles.textBold]}>{ev.name}</Text>
                <Text style={{ width: '25%' }}>{ev.date}</Text>
                <Text style={{ width: '20%' }}>
                  {[ev.startTime, ev.endTime].filter(Boolean).join(' - ') || 'Full Day'}
                </Text>
                <Text style={{ width: '20%' }}>{ev.venueName || 'To be specified'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Deliverables Table */}
        <View style={{ marginBottom: 16 }}>
          <Text style={pdfStyles.sectionHeading}>Contract Deliverables</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={{ width: '80%' }}>Deliverable Description</Text>
              <Text style={[{ width: '20%' }, { textAlign: 'center' }]}>Quantity</Text>
            </View>
            {deliverables.map((del, idx) => (
              <View key={idx} style={pdfStyles.tableRow}>
                <Text style={{ width: '80%' }}>{del.description}</Text>
                <Text style={[{ width: '20%' }, { textAlign: 'center' }]}>{del.quantity}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Crew Assignments (if present) */}
        {crewRoles.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={pdfStyles.sectionHeading}>Production Crew Roster</Text>
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={{ width: '40%' }}>Event</Text>
                <Text style={{ width: '30%' }}>Role</Text>
                <Text style={{ width: '30%' }}>Assigned Specialist</Text>
              </View>
              {crewRoles.map((cr, idx) => (
                <View key={idx} style={pdfStyles.tableRow}>
                  <Text style={{ width: '40%' }}>{cr.event}</Text>
                  <Text style={{ width: '30%', textTransform: 'capitalize' }}>
                    {cr.role.replace(/_/g, ' ')}
                  </Text>
                  <Text style={{ width: '30%' }}>{cr.memberName || 'TBD'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        {notes && (
          <View style={pdfStyles.termsBox}>
            <Text style={pdfStyles.sectionHeading}>Production Notes</Text>
            <Text style={pdfStyles.textRegular}>{notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={pdfStyles.footer}>
          <Text style={pdfStyles.footerText}>
            Official production booking confirmation issued by {business.businessName}.
          </Text>
          <Text style={pdfStyles.footerText}>{bookingNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
