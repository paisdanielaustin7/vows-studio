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

interface ReviewRequestEmailProps {
  clientName: string;
  reviewUrl: string;
  studioName?: string;
}

export function ReviewRequestEmail({
  clientName,
  reviewUrl,
  studioName = 'VOWS',
}: ReviewRequestEmailProps) {
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
            It was a genuine pleasure documenting your celebration! We hope you love your photographs and cinema films as much as we loved creating them.
          </Text>
          <Text style={{ fontSize: '15px', color: '#292524', lineHeight: '1.6' }}>
            Would you take a moment to share your feedback and experience with us?
          </Text>

          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button
              href={reviewUrl}
              style={{ backgroundColor: '#1c1917', color: '#ffffff', padding: '12px 28px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}
            >
              Leave a Review
            </Button>
          </Section>

          <Hr style={{ borderColor: '#f5f5f4', margin: '24px 0' }} />
          <Text style={{ fontSize: '12px', color: '#a8a29e', textAlign: 'center', margin: '0' }}>
            © {new Date().getFullYear()} {studioName}. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ReviewRequestEmail;
