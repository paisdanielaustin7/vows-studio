import { describe, it, expect } from 'vitest';
import {
  businessSettingsSchema,
  documentNumberConfigSchema,
  emailTemplateSchema,
  expenseCategorySchema,
  clientPhoneSchema,
  clientEmailSchema,
  clientSchema,
  serviceSchema,
  packageSchema,
  enquirySchema,
  followUpSchema,
  quotationItemSchema,
  quotationSchema,
} from './sales.schema';

describe('Sales Validation Schemas', () => {
  describe('businessSettingsSchema', () => {
    it('accepts valid business settings', () => {
      const valid = businessSettingsSchema.safeParse({
        studioName: 'VOWS',
        tagline: 'Wedding Cinematic & Stills',
        phone: '+919840012345',
        email: 'info@vowsstudio.com',
        website: 'https://vowsstudio.com',
        addressLine1: '12 Studio Lane',
        addressLine2: 'Arts District',
        city: 'Chennai',
        state: 'Tamil Nadu',
        stateCode: '33',
        pincode: '600001',
        gstin: '33AAAAA0000A1Z5',
        pan: 'AAAAA0000A',
        bankName: 'HDFC Bank',
        bankAccountHolder: 'VOWS',
        bankAccountNumber: '50200012345678',
        bankIfsc: 'HDFC0001234',
        upiId: 'vows@hdfcbank',
        gstEnabled: true,
        defaultCgstBps: 900,
        defaultSgstBps: 900,
        defaultIgstBps: 1800,
        primaryColor: '#4c6452',
        secondaryColor: '#ceead2',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects empty studio name or invalid GSTIN/PAN', () => {
      expect(businessSettingsSchema.safeParse({ studioName: '' }).success).toBe(false);
      expect(businessSettingsSchema.safeParse({ studioName: 'VOWS', gstin: 'INVALID' }).success).toBe(false);
      expect(businessSettingsSchema.safeParse({ studioName: 'VOWS', pan: 'INVALID' }).success).toBe(false);
      expect(businessSettingsSchema.safeParse({ studioName: 'VOWS', bankIfsc: 'INVALID' }).success).toBe(false);
      expect(businessSettingsSchema.safeParse({ studioName: 'VOWS', primaryColor: 'red' }).success).toBe(false);
      expect(businessSettingsSchema.safeParse({ studioName: 'VOWS', stateCode: '333' }).success).toBe(false);
      expect(businessSettingsSchema.safeParse({ studioName: 'VOWS', pincode: '123' }).success).toBe(false);
    });
  });

  describe('documentNumberConfigSchema', () => {
    it('validates document number config', () => {
      const valid = documentNumberConfigSchema.safeParse({
        docType: 'QT',
        prefix: 'QT',
        padding: 6,
        yearFormat: 'YYYY',
        fyStartMonth: 4,
      });
      expect(valid.success).toBe(true);

      const invalid = documentNumberConfigSchema.safeParse({
        docType: 'INVALID',
        prefix: '',
        padding: 0,
        yearFormat: 'YYY',
        fyStartMonth: 13,
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('emailTemplateSchema', () => {
    it('validates template', () => {
      const valid = emailTemplateSchema.safeParse({
        code: 'quotation',
        subject: 'Quotation {{quotation_number}}',
        bodyHtml: '<p>Dear {{client_name}}</p>',
        isActive: true,
      });
      expect(valid.success).toBe(true);

      const invalid = emailTemplateSchema.safeParse({
        code: 'invalid_code',
        subject: '',
        bodyHtml: '',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('expenseCategorySchema', () => {
    it('validates expense category', () => {
      const valid = expenseCategorySchema.safeParse({
        code: 'travel',
        name: 'Travel & Conveyance',
        sort: 1,
      });
      expect(valid.success).toBe(true);

      expect(expenseCategorySchema.safeParse({ code: '', name: '' }).success).toBe(false);
    });
  });

  describe('clientPhoneSchema and clientEmailSchema', () => {
    it('validates Indian E.164 phone and international phone', () => {
      const inValid = clientPhoneSchema.safeParse({
        phoneE164: '+919840012345',
        label: 'Mobile',
        isPrimary: true,
        isInternational: false,
      });
      expect(inValid.success).toBe(true);

      const inInvalid = clientPhoneSchema.safeParse({
        phoneE164: '9840012345',
        isInternational: false,
      });
      expect(inInvalid.success).toBe(false);

      const intlValid = clientPhoneSchema.safeParse({
        phoneE164: '+14155552671',
        label: 'US Mobile',
        isPrimary: false,
        isInternational: true,
      });
      expect(intlValid.success).toBe(true);
    });

    it('validates client email', () => {
      expect(clientEmailSchema.safeParse({ email: 'client@example.com', isPrimary: true }).success).toBe(true);
      expect(clientEmailSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
    });
  });

  describe('clientSchema', () => {
    it('accepts valid client with phones and emails', () => {
      const valid = clientSchema.safeParse({
        fullName: 'Aarav Patel',
        city: 'Chennai',
        state: 'Tamil Nadu',
        stateCode: '33',
        pincode: '600001',
        phones: [
          { phoneE164: '+919840012345', label: 'Primary', isPrimary: true, isInternational: false },
        ],
        emails: [{ email: 'aarav@example.com', isPrimary: true }],
      });
      expect(valid.success).toBe(true);
    });

    it('rejects client without primary phone or with >3 phones', () => {
      const noPrimary = clientSchema.safeParse({
        fullName: 'Aarav Patel',
        phones: [{ phoneE164: '+919840012345', isPrimary: false, isInternational: false }],
      });
      expect(noPrimary.success).toBe(false);

      const tooManyPhones = clientSchema.safeParse({
        fullName: 'Aarav Patel',
        phones: [
          { phoneE164: '+919840012341', isPrimary: true, isInternational: false },
          { phoneE164: '+919840012342', isPrimary: false, isInternational: false },
          { phoneE164: '+919840012343', isPrimary: false, isInternational: false },
          { phoneE164: '+919840012344', isPrimary: false, isInternational: false },
        ],
      });
      expect(tooManyPhones.success).toBe(false);
    });
  });

  describe('serviceSchema and packageSchema', () => {
    it('validates service', () => {
      const valid = serviceSchema.safeParse({
        name: 'Traditional Photography',
        category: 'photography',
        unit: 'day',
        pricePaise: 5000000,
        effectiveFrom: '2026-04-01',
        isActive: true,
      });
      expect(valid.success).toBe(true);

      const invalid = serviceSchema.safeParse({
        name: 'X',
        category: 'unknown_category',
        pricePaise: -100,
        effectiveFrom: '01-04-2026',
      });
      expect(invalid.success).toBe(false);
    });

    it('validates package', () => {
      const valid = packageSchema.safeParse({
        name: 'Complete Wedding Suite',
        pricePaise: 25000000,
        effectiveFrom: '2026-04-01',
        items: [
          { serviceId: 'b0000000-0000-0000-0000-000000000001', quantity: 2 },
        ],
      });
      expect(valid.success).toBe(true);

      const noItems = packageSchema.safeParse({
        name: 'Empty Package',
        pricePaise: 1000,
        effectiveFrom: '2026-04-01',
        items: [],
      });
      expect(noItems.success).toBe(false);
    });
  });

  describe('enquirySchema and followUpSchema', () => {
    it('validates enquiry with guest or client', () => {
      const validGuest = enquirySchema.safeParse({
        guestName: 'Kavita Sundaram',
        guestPhone: '+919840055555',
        eventType: 'wedding',
        eventDate: '2026-12-15',
        source: 'instagram',
      });
      expect(validGuest.success).toBe(true);

      const validClient = enquirySchema.safeParse({
        clientId: 'c0000000-0000-0000-0000-000000000001',
        eventType: 'reception',
      });
      expect(validClient.success).toBe(true);

      const invalid = enquirySchema.safeParse({
        eventType: 'wedding',
      });
      expect(invalid.success).toBe(false);
    });

    it('validates follow up', () => {
      const valid = followUpSchema.safeParse({
        enquiryId: 'e0000000-0000-0000-0000-000000000001',
        dueAt: '2026-11-15T10:00:00Z',
        assignedTo: 'a0000000-0000-0000-0000-000000000001',
        status: 'open',
      });
      expect(valid.success).toBe(true);
    });
  });

  describe('quotationSchema and quotationItemSchema', () => {
    it('validates quotation line item', () => {
      const valid = quotationItemSchema.safeParse({
        description: 'Candid Cinematography',
        quantity: 1,
        unitPricePaise: 8000000,
        lineTotalPaise: 8000000,
        cgstBps: 900,
        sgstBps: 900,
        cgstPaise: 720000,
        sgstPaise: 720000,
        lineTaxablePaise: 8000000,
      });
      expect(valid.success).toBe(true);

      const invalid = quotationItemSchema.safeParse({
        description: '',
        quantity: 0,
        unitPricePaise: -1,
        lineTotalPaise: -1,
      });
      expect(invalid.success).toBe(false);
    });

    it('validates complete quotation', () => {
      const valid = quotationSchema.safeParse({
        clientId: 'c0000000-0000-0000-0000-000000000001',
        eventDate: '2026-12-20',
        validUntil: '2026-12-01',
        subtotalPaise: 8000000,
        discountType: 'percent',
        discountBps: 1000,
        discountPaise: 800000,
        taxablePaise: 7200000,
        cgstPaise: 648000,
        sgstPaise: 648000,
        taxPaise: 1296000,
        totalPaise: 8496000,
        gstApplied: true,
        taxType: 'cgst_sgst',
        items: [
          {
            description: 'Candid Cinematography',
            quantity: 1,
            unitPricePaise: 8000000,
            lineTotalPaise: 8000000,
            lineDiscountPaise: 800000,
            lineTaxablePaise: 7200000,
            cgstPaise: 648000,
            sgstPaise: 648000,
            cgstBps: 900,
            sgstBps: 900,
          },
        ],
      });
      expect(valid.success).toBe(true);

      const emptyItems = quotationSchema.safeParse({
        clientId: 'c0000000-0000-0000-0000-000000000001',
        validUntil: '2026-12-01',
        subtotalPaise: 0,
        taxablePaise: 0,
        totalPaise: 0,
        items: [],
      });
      expect(emptyItems.success).toBe(false);
    });
  });
});
