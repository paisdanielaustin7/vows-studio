import React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
} from '@react-email/components';

interface ReceiptEmailProps {
  clientName: string;
  receiptNumber: string;
  amountReceivedFormatted: string;
  paymentDate: string;
  paymentMethod: string;
  studioName?: string;
}

export function ReceiptEmail({
  clientName,
  receiptNumber,
  amountReceivedFormatted,
  paymentDate,
  paymentMethod,
  studioName = 'VOWS',
}: ReceiptEmailProps) {
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
            Thank you! We have received your payment. Your official payment receipt is attached to this email.
          </Text>

          <Section style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '6px', margin: '20px 0', border: '1px solid #bbf7d0' }}>
            <Text style={{ margin: '4px 0', fontSize: '14px', color: '#166534' }}>
              <strong>Receipt Number:</strong> {receiptNumber}
            </Text>
            <Text style={{ margin: '4px 0', fontSize: '16px', fontWeight: 'bold', color: '#15803d' }}>
              <strong>Amount Received:</strong> {amountReceivedFormatted}
            </Text>
            <Text style={{ margin: '4px 0', fontSize: '14px', color: '#166534' }}>
              <strong>Payment Date:</strong> {paymentDate}
            </Text>
            <Text style={{ margin: '4px 0', fontSize: '14px', color: '#166534', textTransform: 'capitalize' }}>
              <strong>Payment Mode:</strong> {paymentMethod.replace(/_/g, ' ')}
            </Text>
          </Section>

          <Text style={{ fontSize: '14px', color: '#78716c', lineHeight: '1.6' }}>
            This receipt confirms the allocation of funds to your account.
          </Text>

          <Hr style={{ borderColor: '#f5f5f4', margin: '24px 0' }} />
          <Text style={{ fontSize: '12px', color: '#a8a29e', textAlign: 'center', margin: '0' }}>
            © {new Date().getFullYear()} {studioName}. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ReceiptEmail;
