import { QuotationInput } from '@/lib/validations/sales.schema';
import { applyDiscount, apportionDiscount, computeGst } from './index';

/**
 * Recalculates quotation financial sums using lib/money.
 * Server recomputes all totals; client-side values are strictly verified against these.
 */
export function recalculateQuotation(input: QuotationInput) {
  const lineItems = input.items.map((item, idx) => {
    const qty = BigInt(item.quantity);
    const unitPrice = BigInt(item.unitPricePaise);
    const lineTotal = qty * unitPrice;
    return {
      ...item,
      id: item.id || `line-${idx}`,
      lineTotalPaise: Number(lineTotal),
    };
  });

  const subtotalPaise = lineItems.reduce((acc, item) => acc + BigInt(item.lineTotalPaise), 0n);

  let discountInput = null;
  if (input.discountType === 'percent') {
    discountInput = { type: 'percent' as const, value: input.discountBps ?? 0 };
  } else if (input.discountType === 'fixed') {
    discountInput = { type: 'fixed' as const, value: input.discountFixedPaise ?? 0 };
  }

  const { discountAmount, taxableBase } = applyDiscount(subtotalPaise, discountInput);

  const linesForApportionment = lineItems.map((item) => ({
    id: item.id,
    amount: BigInt(item.lineTotalPaise),
  }));
  const apportionedDiscounts = apportionDiscount(linesForApportionment, discountAmount);

  let totalCgstPaise = 0n;
  let totalSgstPaise = 0n;
  let totalIgstPaise = 0n;

  const computedItems = lineItems.map((item) => {
    const lineDisc = apportionedDiscounts.get(item.id) || 0n;
    const lineTaxable = BigInt(item.lineTotalPaise) - lineDisc;

    let lineCgst = 0n;
    let lineSgst = 0n;
    let lineIgst = 0n;

    if (input.gstApplied) {
      if (input.taxType === 'cgst_sgst') {
        const rateBps = (item.cgstBps ?? 900) + (item.sgstBps ?? 900);
        const gst = computeGst(lineTaxable, rateBps, false);
        lineCgst = gst.cgstPaise;
        lineSgst = gst.sgstPaise;
        totalCgstPaise += lineCgst;
        totalSgstPaise += lineSgst;
      } else if (input.taxType === 'igst') {
        const rateBps = item.igstBps ?? 1800;
        const gst = computeGst(lineTaxable, rateBps, true);
        lineIgst = gst.igstPaise;
        totalIgstPaise += lineIgst;
      }
    }

    return {
      ...item,
      lineDiscountPaise: Number(lineDisc),
      lineTaxablePaise: Number(lineTaxable),
      cgstPaise: Number(lineCgst),
      sgstPaise: Number(lineSgst),
      igstPaise: Number(lineIgst),
    };
  });

  const totalTaxPaise = totalCgstPaise + totalSgstPaise + totalIgstPaise;
  const totalPaise = taxableBase + totalTaxPaise;

  return {
    subtotalPaise: Number(subtotalPaise),
    discountPaise: Number(discountAmount),
    taxablePaise: Number(taxableBase),
    cgstPaise: Number(totalCgstPaise),
    sgstPaise: Number(totalSgstPaise),
    igstPaise: Number(totalIgstPaise),
    taxPaise: Number(totalTaxPaise),
    totalPaise: Number(totalPaise),
    items: computedItems,
  };
}
