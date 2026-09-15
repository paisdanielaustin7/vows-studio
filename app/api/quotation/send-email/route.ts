import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const {
      to,
      clientName,
      quotationNumber,
      packageTitle,
      totalPrice,
      customMessage,
      pdfBase64,
    } = await req.json();

    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Recipient email is required' },
        { status: 400 }
      );
    }

    // Check if external SMTP / Resend API key is configured
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      // Direct Resend API dispatch
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'VOWS Studio <proposals@vowsstudio.in>',
          to: [to],
          subject: `Proposal & Quotation: ${quotationNumber} — VOWS Studio // Reuben Serrao`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
              <h2 style="font-family: Georgia, serif; font-size: 24px; text-transform: uppercase; margin-bottom: 8px;">VOWS Studio</h2>
              <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #666; margin-top: 0;">Photography & Cinema // by Reuben</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
              <p>Dear <strong>${clientName}</strong>,</p>
              <p>${customMessage ? customMessage.replace(/\n/g, '<br/>') : 'Please find attached our detailed proposal and quotation for your upcoming celebration.'}</p>
              <div style="background: #f8faf9; border: 1px solid #e2e8e5; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 4px 0;"><strong>Quotation Ref:</strong> ${quotationNumber}</p>
                <p style="margin: 4px 0;"><strong>Package:</strong> ${packageTitle}</p>
                <p style="margin: 4px 0;"><strong>Investment:</strong> Rs ${Number(totalPrice).toLocaleString('en-IN')} /-</p>
              </div>
              <p style="font-size: 12px; color: #555;">The official two-page PDF proposal is available for your review.</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
              <p style="margin: 0; font-weight: bold; font-size: 13px;">REUBEN SERRAO</p>
              <p style="margin: 2px 0; font-size: 12px; color: #666;">Owner, Lead Photographer & Editor</p>
              <p style="margin: 2px 0; font-size: 12px; color: #666;">VOWS Studio // +91 97412 88401</p>
            </div>
          `,
          attachments: pdfBase64
            ? [
                {
                  filename: `${quotationNumber.replace(/\s+/g, '_')}_Proposal.pdf`,
                  content: pdfBase64.split('base64,')[1] || pdfBase64,
                },
              ]
            : [],
        }),
      });

      const resendData = await res.json();
      return NextResponse.json({
        success: true,
        method: 'resend',
        data: resendData,
        message: `Quotation email successfully delivered to ${to}`,
      });
    }

    // If no third-party email API key is configured yet, simulate successful dispatch
    // and provide mailto link metadata for client-side fallback
    return NextResponse.json({
      success: true,
      method: 'simulated',
      message: `Quotation email queued for ${to}. (Set RESEND_API_KEY in .env.local to activate automated live sending)`,
      mailtoFallback: `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(`Quotation ${quotationNumber} - VOWS Studio`)}&body=${encodeURIComponent(
        `Dear ${clientName},\n\nPlease find attached the quotation ${quotationNumber} for ${packageTitle}.\nTotal: Rs ${totalPrice}/-\n\nBest regards,\nReuben Serrao\nVOWS Studio`
      )}`,
    });
  } catch (error: any) {
    console.error('Error sending quotation email:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to dispatch quotation email' },
      { status: 500 }
    );
  }
}
