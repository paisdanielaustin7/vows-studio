import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components';

interface InvoiceEmailProps {
  clientName: string;
  invoiceNumber: string;
  totalAmountFormatted: string;
  balanceDueFormatted: string;
  dueDate: string;
  studioName?: string;
  viewUrl?: string;
}

export function InvoiceEmail({
  clientName,
  invoiceNumber,
  totalAmountFormatted,
  balanceDueFormatted,
  dueDate,
  studioName = 'VOWS',
  viewUrl,
}: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f7f6f4', padding: '30px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: '8px', maxWidth: '600px', margin: '0 auto', padding: '32px', border: '1px solid #e7e5e4' }}>
          <Text style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', color: '#1c1917', textAlign: 'center', margin: '0 0 24px 0' }}>
            {studioName}
          </Text>
          <Hr style={{ borderColor: '#f5f5f4', margin: '0 0 24px 0' }} />
          
          <Text style={{ fontSize: '15px', color: '#292524', lineHeight: '1.6' }}>
            Dear {clientName},
          </Text>
          <Text style={{ fontSize: '15px', color: '#292524', lineHeight: '1.6' }}>
            Please find your official tax invoice for our services attached to this email.
          </Text>

          <Section style={{ backgroundColor: '#fafaf9', padding: '16px', borderRadius: '6px', margin: '20px 0', border: '1px solid #e7e5e4' }}>
            <Text style={{ margin: '4px 0', fontSize: '14px', color: '#44403c' }}>
              <strong>Invoice Number:</strong> {invoiceNumber}
            </Text>
            <Text style={{ margin: '4px 0', fontSize: '14px', color: '#44403c' }}>
              <strong>Total Invoice Amount:</strong> {totalAmountFormatted}
            </Text>
            <Text style={{ margin: '4px 0', fontSize: '14px', color: '#b91c1c' }}>
              <strong>Balance Due:</strong> {balanceDueFormatted}
            </Text>
            <Text style={{ margin: '4px 0', fontSize: '14px', color: '#44403c' }}>
              <strong>Payment Due By:</strong> {dueDate}
            </Text>
          </Section>

          <Text style={{ fontSize: '14px', color: '#78716c', lineHeight: '1.6' }}>
            Direct bank transfer and UPI remittance details are specified in the attached PDF invoice.
          </Text>

          {viewUrl && (
            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <Button
                href={viewUrl}
                style={{ backgroundColor: '#1c1917', color: '#ffffff', padding: '12px 24px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}
              >
                View Invoice Online
              </Button>
            </Section>
          )}

          <Hr style={{ borderColor: '#f5f5f4', margin: '24px 0' }} />
          <Text style={{ fontSize: '12px', color: '#a8a29e', textAlign: 'center', margin: '0' }}>
            © {new Date().getFullYear()} {studioName}. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default InvoiceEmail;
