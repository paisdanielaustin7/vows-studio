import { describe, it, expect } from 'vitest';
import {
  computeDashboardMetrics,
  getIndianFinancialYearOptions,
  isDateInFY,
} from '@/lib/dashboard/metrics';

describe('Dashboard Role-Based Metrics & RBAC R3 Enforcement', () => {
  const mockQuotations = [
    {
      id: 'q-1',
      quotationNumber: 'QT-2025-001',
      clientName: 'Rahul & Priya',
      status: 'accepted',
      totalPaise: 25000000n, // ₹2,50,000
      validUntil: '2025-12-31',
      createdAt: '2025-06-15T10:00:00.000Z',
    },
    {
      id: 'q-2',
      quotationNumber: 'QT-2025-002',
      clientName: 'Aditya & Ananya',
      status: 'sent',
      totalPaise: 18000000n, // ₹1,80,000
      validUntil: '2025-12-31',
      createdAt: '2025-07-20T10:00:00.000Z',
    },
  ];

  const mockInvoices = [
    {
      id: 'inv-1',
      invoiceNumber: 'INV-2025-001',
      clientName: 'Rahul & Priya',
      status: 'sent',
      totalPaise: 25000000n,
      balancePaise: 15000000n,
      issueDate: '2025-06-16',
      dueDate: '2025-07-01', // Past due
    },
  ];

  const mockPayments = [
    {
      id: 'pay-1',
      amountPaise: 10000000n, // ₹1,00,000 collected
      paymentDate: '2025-06-17',
    },
  ];

  const mockEnquiries = [
    { id: 'enq-1', clientName: 'Siddharth', status: 'new', eventType: 'Wedding' },
    { id: 'enq-2', clientName: 'Meera', status: 'quoted', eventType: 'Reception' },
  ];

  const mockBookings = [
    { id: 'bk-1', bookingNumber: 'BK-2025-001', status: 'confirmed', eventType: 'Wedding Ceremony' },
  ];

  const mockStages = [
    {
      id: 'stg-1',
      pipelineId: 'pipe-1',
      bookingNumber: 'BK-2025-001',
      name: 'Trailer Cut',
      status: 'blocked',
      notes: 'Waiting for song audio selection',
    },
  ];

  it('allows SuperAdmin to view complete financial metrics, ledger, and overdue invoices', () => {
    const metrics = computeDashboardMetrics({
      userRole: 'system_admin',
      enquiries: mockEnquiries,
      quotations: mockQuotations,
      clients: [{ id: 'c-1' }],
      bookings: mockBookings,
      invoices: mockInvoices,
      payments: mockPayments,
      deliveryStages: mockStages,
    });

    expect(metrics.hasFinancialAccess).toBe(true);
    expect(metrics.acceptedRevenuePaise).toBe(25000000n);
    expect(metrics.pipelineForecastPaise).toBe(18000000n);
    expect(metrics.collectedRevenuePaise).toBe(10000000n);
    expect(metrics.invoicedRevenuePaise).toBe(25000000n);
    expect(metrics.overdueInvoicesPaise).toBe(15000000n);
    expect(metrics.overdueInvoices).toHaveLength(1);
    expect(metrics.monthlyRevenueChart).not.toBeNull();
    expect(metrics.recentQuotations[0].totalPaise).toBe(25000000n);
  });

  it('allows Business Owner to view complete financial metrics and executive briefing', () => {
    const metrics = computeDashboardMetrics({
      userRole: 'business_owner',
      enquiries: mockEnquiries,
      quotations: mockQuotations,
      clients: [{ id: 'c-1' }],
      bookings: mockBookings,
      invoices: mockInvoices,
      payments: mockPayments,
      deliveryStages: mockStages,
    });

    expect(metrics.hasFinancialAccess).toBe(true);
    expect(metrics.acceptedRevenuePaise).toBe(25000000n);
    expect(metrics.collectedRevenuePaise).toBe(10000000n);
  });

  it('STRICTLY hides all financial metrics from Manager per RBAC R3 ruling', () => {
    const metrics = computeDashboardMetrics({
      userRole: 'manager',
      enquiries: mockEnquiries,
      quotations: mockQuotations,
      clients: [{ id: 'c-1' }],
      bookings: mockBookings,
      invoices: mockInvoices,
      payments: mockPayments,
      deliveryStages: mockStages,
    });

    // 1. Financial access flag MUST be false
    expect(metrics.hasFinancialAccess).toBe(false);

    // 2. All currency KPI totals MUST be null
    expect(metrics.acceptedRevenuePaise).toBeNull();
    expect(metrics.pipelineForecastPaise).toBeNull();
    expect(metrics.collectedRevenuePaise).toBeNull();
    expect(metrics.invoicedRevenuePaise).toBeNull();
    expect(metrics.overdueInvoicesPaise).toBeNull();

    // 3. Overdue invoices list and revenue chart MUST be null
    expect(metrics.overdueInvoices).toBeNull();
    expect(metrics.monthlyRevenueChart).toBeNull();

    // 4. Quotation totals in recent items MUST be masked (null)
    expect(metrics.recentQuotations[0].totalPaise).toBeNull();
    expect(metrics.recentQuotations[1].totalPaise).toBeNull();

    // 5. Operations KPIs MUST remain fully functional
    expect(metrics.activeEnquiriesCount).toBe(2);
    expect(metrics.activeBookingsCount).toBe(1);
    expect(metrics.blockedDeliveryStagesCount).toBe(1);
  });

  it('allows Accountant to view financial ledger and revenue charts without operations management', () => {
    const metrics = computeDashboardMetrics({
      userRole: 'accountant',
      enquiries: mockEnquiries,
      quotations: mockQuotations,
      clients: [{ id: 'c-1' }],
      bookings: mockBookings,
      invoices: mockInvoices,
      payments: mockPayments,
      deliveryStages: mockStages,
    });

    expect(metrics.hasFinancialAccess).toBe(true);
    expect(metrics.hasOperationsAccess).toBe(false);
    expect(metrics.collectedRevenuePaise).toBe(10000000n);
    expect(metrics.invoicedRevenuePaise).toBe(25000000n);
  });

  it('denies financial access to Staff and Crew Members', () => {
    const staffMetrics = computeDashboardMetrics({
      userRole: 'staff',
      enquiries: mockEnquiries,
      quotations: mockQuotations,
      clients: [],
      bookings: [],
    });
    expect(staffMetrics.hasFinancialAccess).toBe(false);
    expect(staffMetrics.acceptedRevenuePaise).toBeNull();

    const crewMetrics = computeDashboardMetrics({
      userRole: 'crew_member',
      enquiries: mockEnquiries,
      quotations: mockQuotations,
      clients: [],
      bookings: [],
    });
    expect(crewMetrics.hasFinancialAccess).toBe(false);
    expect(crewMetrics.collectedRevenuePaise).toBeNull();
  });

  describe('Indian Financial Year Calculations', () => {
    it('correctly calculates Indian FY options from April 1 to March 31', () => {
      // Test fixed date: Nov 11, 2025 -> FY 2025-26
      const testDate = new Date('2025-11-11T12:00:00.000Z');
      const options = getIndianFinancialYearOptions(testDate);

      expect(options.length).toBeGreaterThanOrEqual(3);
      const currentFY = options.find((o) => o.label === 'FY 2025-26');
      expect(currentFY).toBeDefined();
      expect(currentFY?.startDate).toBe('2025-04-01T00:00:00.000Z');
      expect(currentFY?.endDate).toBe('2026-03-31T23:59:59.999Z');
    });

    it('correctly determines whether a transaction falls into Indian FY', () => {
      const fy2526 = {
        label: 'FY 2025-26',
        key: '2025-2026',
        startDate: '2025-04-01T00:00:00.000Z',
        endDate: '2026-03-31T23:59:59.999Z',
      };

      expect(isDateInFY('2025-04-01T00:00:00.000Z', fy2526)).toBe(true);
      expect(isDateInFY('2025-10-15T12:30:00.000Z', fy2526)).toBe(true);
      expect(isDateInFY('2026-03-31T23:59:00.000Z', fy2526)).toBe(true);
      expect(isDateInFY('2025-03-31T23:59:00.000Z', fy2526)).toBe(false); // Previous FY
      expect(isDateInFY('2026-04-01T00:00:00.000Z', fy2526)).toBe(false); // Next FY
    });
  });
});
