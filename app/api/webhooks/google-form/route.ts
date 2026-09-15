import { NextRequest, NextResponse } from 'next/server';
import { Enquiry } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Map fields whether received from standard JSON or Google Apps Script form event
    const clientName =
      body.clientName ||
      body['Name'] ||
      body['Client Name'] ||
      body['Full Name'] ||
      body['Bride / Groom Name'] ||
      'New Client Enquiry';

    const phone =
      body.phone ||
      body['Phone'] ||
      body['Contact Number'] ||
      body['WhatsApp Number'] ||
      '+91 00000 00000';

    const email =
      body.email ||
      body['Email'] ||
      body['Email Address'] ||
      '';

    const city =
      body.city ||
      body['City'] ||
      body['Event Location'] ||
      body['Venue'] ||
      'Mangalore';

    const eventDate =
      body.eventDate ||
      body['Event Date'] ||
      body['Date'] ||
      new Date().toISOString().split('T')[0];

    const eventType =
      body.eventType ||
      body['Event Type'] ||
      body['Shoot Type'] ||
      'Wedding Cinemastory & Stills';

    const budgetRaw =
      body.estimatedBudget ||
      body['Budget'] ||
      body['Estimated Budget'] ||
      '45000';

    const estimatedBudget = typeof budgetRaw === 'number' 
      ? budgetRaw 
      : parseFloat(String(budgetRaw).replace(/[^0-9.]/g, '')) || 45000;

    const notes =
      body.notes ||
      body['Notes'] ||
      body['Requirements'] ||
      body['Special Requests'] ||
      (body.responses ? JSON.stringify(body.responses) : 'Submitted via VOWS Google Form automation.');

    const newEnquiry: Enquiry = {
      id: `enq-${Date.now()}`,
      enquiryNumber: `ENQ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      clientName,
      phone,
      email,
      city,
      eventDate,
      eventType,
      estimatedBudget,
      status: 'NEW',
      notes,
      createdAt: new Date().toISOString().split('T')[0],
    };

    return NextResponse.json({
      success: true,
      message: 'Google Form response synced into VOWS Studio successfully.',
      enquiry: newEnquiry,
    });
  } catch (error: any) {
    console.error('Error parsing Google Form webhook submission:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to parse submission' },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhooks/google-form',
    studio: 'VOWS Studio',
    usage: 'Post Google Form webhook payload with clientName, phone, email, eventDate, city, eventType, estimatedBudget, notes.',
  });
}
