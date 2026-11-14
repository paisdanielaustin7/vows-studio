import { QuotationInput } from '@/lib/validations/sales.schema';
import { recalculateQuotation } from '@/lib/money/quotation-calculator';

/**
 * Maps quotation input & computed financial totals into a dual-cased JSON payload
 * for Postgres RPC routines (public.create_quotation, public.create_quotation_version).
 * Guarantees that both snake_case (Postgres convention) and camelCase properties
 * are present, completely eliminating null-pointer and NOT-NULL constraint violations.
 */
export function formatQuotationRpcPayload(
  input: QuotationInput,
  recalculated: ReturnType<typeof recalculateQuotation>
) {
  return {
    client_id: input.clientId,
    clientId: input.clientId,

    enquiry_id: input.enquiryId || null,
    enquiryId: input.enquiryId || null,

    status: (input as any).status || 'draft',

    event_date: input.eventDate || null,
    eventDate: input.eventDate || null,

    valid_until: input.validUntil,
    validUntil: input.validUntil,

    subtotal_paise: recalculated.subtotalPaise,
    subtotalPaise: recalculated.subtotalPaise,

    discount_type: input.discountType || null,
    discountType: input.discountType || null,

    discount_bps: input.discountBps ?? null,
    discountBps: input.discountBps ?? null,

    discount_fixed_paise: input.discountFixedPaise ?? null,
    discountFixedPaise: input.discountFixedPaise ?? null,

    discount_paise: recalculated.discountPaise,
    discountPaise: recalculated.discountPaise,

    taxable_paise: recalculated.taxablePaise,
    taxablePaise: recalculated.taxablePaise,

    cgst_paise: recalculated.cgstPaise,
    cgstPaise: recalculated.cgstPaise,

    sgst_paise: recalculated.sgstPaise,
    sgstPaise: recalculated.sgstPaise,

    igst_paise: recalculated.igstPaise,
    igstPaise: recalculated.igstPaise,

    tax_paise: recalculated.taxPaise,
    taxPaise: recalculated.taxPaise,

    total_paise: recalculated.totalPaise,
    totalPaise: recalculated.totalPaise,

    gst_applied: input.gstApplied ?? false,
    gstApplied: input.gstApplied ?? false,

    tax_type: input.taxType ?? 'none',
    taxType: input.taxType ?? 'none',

    business_gstin: input.businessGstin || null,
    businessGstin: input.businessGstin || null,

    client_gstin: input.clientGstin || null,
    clientGstin: input.clientGstin || null,

    place_of_supply_state_code: input.placeOfSupplyStateCode || null,
    placeOfSupplyStateCode: input.placeOfSupplyStateCode || null,

    notes_to_client: input.notesToClient || null,
    notesToClient: input.notesToClient || null,

    internal_notes: input.internalNotes || null,
    internalNotes: input.internalNotes || null,

    terms: input.terms || null,

    items: recalculated.items.map((it: any, idx: number) => ({
      service_id: it.serviceId || null,
      serviceId: it.serviceId || null,

      package_id: it.packageId || null,
      packageId: it.packageId || null,

      description: it.description,

      quantity: it.quantity,

      unit_price_paise: it.unitPricePaise,
      unitPricePaise: it.unitPricePaise,

      line_total_paise: it.lineTotalPaise,
      lineTotalPaise: it.lineTotalPaise,

      hsn_sac_code: it.hsnSacCode || null,
      hsnSacCode: it.hsnSacCode || null,

      cgst_bps: it.cgstBps ?? null,
      cgstBps: it.cgstBps ?? null,

      sgst_bps: it.sgstBps ?? null,
      sgstBps: it.sgstBps ?? null,

      igst_bps: it.igstBps ?? null,
      igstBps: it.igstBps ?? null,

      line_discount_paise: it.lineDiscountPaise ?? 0,
      lineDiscountPaise: it.lineDiscountPaise ?? 0,

      line_taxable_paise: it.lineTaxablePaise ?? it.lineTotalPaise,
      lineTaxablePaise: it.lineTaxablePaise ?? it.lineTotalPaise,

      cgst_paise: it.cgstPaise ?? 0,
      cgstPaise: it.cgstPaise ?? 0,

      sgst_paise: it.sgstPaise ?? 0,
      sgstPaise: it.sgstPaise ?? 0,

      igst_paise: it.igstPaise ?? 0,
      igstPaise: it.igstPaise ?? 0,

      sort: it.sort ?? idx,
    })),
  };
}
