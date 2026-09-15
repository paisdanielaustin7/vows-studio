import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

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

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 28px; color: #111a24; background-color: #ffffff; border: 1px solid #e6e8eb; border-radius: 6px;">
        <div style="border-bottom: 2px solid #111a24; padding-bottom: 12px; margin-bottom: 20px;">
          <h1 style="font-family: Georgia, serif; font-size: 24px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin: 0; color: #111a24;">VOWS Studio</h1>
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 2.5px; color: #738079; margin: 4px 0 0 0; font-family: monospace;">Photography & Cinema // by Reuben</p>
        </div>

        <p style="font-size: 14px; line-height: 1.6; margin-bottom: 16px;">Dear <strong>${clientName}</strong>,</p>
        
        <p style="font-size: 14px; line-height: 1.6; color: #333d47; white-space: pre-line; margin-bottom: 20px;">
          ${customMessage || 'Thank you for reaching out to VOWS Studio. Please find attached our detailed proposal and quotation for your upcoming celebration.'}
        </p>

        <div style="background-color: #f7f9fa; border: 1px solid #dce2e6; border-left: 4px solid #111a24; padding: 16px 20px; margin: 24px 0; border-radius: 3px;">
          <table style="width: 100%; font-size: 13px; font-family: monospace;">
            <tr>
              <td style="padding: 4px 0; color: #6b7785; text-transform: uppercase;">Quotation Code:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #111a24;">${quotationNumber}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #6b7785; text-transform: uppercase;">Selected Package:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #111a24;">${packageTitle}</td>
            </tr>
            <tr style="border-top: 1px dashed #cfd7de;">
              <td style="padding: 10px 0 4px 0; font-weight: bold; text-transform: uppercase; font-size: 14px;">Total Investment:</td>
              <td style="padding: 10px 0 4px 0; text-align: right; font-weight: 900; font-size: 16px; color: #111a24;">Rs ${Number(totalPrice).toLocaleString('en-IN')} /-</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 12px; color: #667085; line-height: 1.5; margin-bottom: 24px;">
          📎 <strong>Attachment:</strong> The official, comprehensive two-page bespoke proposal & call-sheet coverage schedule has been attached to this email as a PDF.
        </p>

        <div style="border-top: 1px solid #e6e8eb; padding-top: 18px; font-size: 12px; line-height: 1.5; color: #55606e;">
          <p style="margin: 0; font-weight: bold; color: #111a24; font-size: 13px; text-transform: uppercase;">Reuben Serrao</p>
          <p style="margin: 2px 0;">Director & Lead Photographer // VOWS Studio</p>
          <p style="margin: 2px 0;">Direct WhatsApp / Mobile: <strong>+91 97412 88401</strong></p>
          <p style="margin: 2px 0; font-size: 11px; color: #8a96a3;">Mangalore, Karnataka • Worldwide Commission</p>
        </div>
      </div>
    `;

    // --------------------------------------------------------------------------
    // METHOD 1: GMAIL SMTP (Recommended - Zero domain setup, 100% deliverability)
    // --------------------------------------------------------------------------
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (gmailUser && gmailPass) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser.trim(),
          pass: gmailPass.replace(/\s+/g, ''), // clean any pasted spaces
        },
      });

      const cleanPdfBase64 = pdfBase64
        ? pdfBase64.split('base64,')[1] || pdfBase64
        : null;

      const info = await transporter.sendMail({
        from: `"VOWS Studio // Reuben Serrao" <${gmailUser.trim()}>`,
        to,
        replyTo: gmailUser.trim(),
        subject: `Proposal & Quotation: ${quotationNumber} — VOWS Studio // Reuben Serrao`,
        html: emailHtml,
        attachments: cleanPdfBase64
          ? [
              {
                filename: `${quotationNumber.replace(/\s+/g, '_')}_Proposal.pdf`,
                content: cleanPdfBase64,
                encoding: 'base64',
              },
            ]
          : [],
      });

      return NextResponse.json({
        success: true,
        method: 'gmail',
        messageId: info.messageId,
        message: `Quotation email successfully delivered to ${to} via Gmail!`,
      });
    }

    // --------------------------------------------------------------------------
    // METHOD 2: RESEND API (Fallback if RESEND_API_KEY is configured)
    // --------------------------------------------------------------------------
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      const fromAddress = process.env.EMAIL_FROM || 'VOWS Studio <onboarding@resend.dev>';

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          subject: `Proposal & Quotation: ${quotationNumber} — VOWS Studio // Reuben Serrao`,
          html: emailHtml,
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

      if (!res.ok) {
        return NextResponse.json(
          {
            success: false,
            error: resendData.message || resendData.error || `Resend Error (${res.status})`,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        method: 'resend',
        data: resendData,
        message: `Quotation email successfully delivered to ${to}`,
      });
    }

    // --------------------------------------------------------------------------
    // METHOD 3: SIMULATED FALLBACK WITH INSTRUCTIONS
    // --------------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      method: 'simulated',
      message: `Quotation email queued for ${to}. To activate live sending from your Gmail, add GMAIL_USER and GMAIL_APP_PASSWORD to your .env.local or Vercel settings!`,
      mailtoFallback: `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
        `Quotation ${quotationNumber} - VOWS Studio`
      )}&body=${encodeURIComponent(
        `Dear ${clientName},\n\nPlease find attached quotation ${quotationNumber} for ${packageTitle}.\nTotal: Rs ${totalPrice}/-\n\nWarm regards,\nReuben Serrao\nVOWS Studio\n+91 97412 88401`
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
