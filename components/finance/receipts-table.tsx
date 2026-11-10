'use client';

import React, { useState } from 'react';
import { formatINR } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ReceiptRow {
  id: string;
  receiptNumber: string;
  paymentId: string;
  paymentDate: string;
  clientName: string;
  amountPaise: number;
  method: string;
  pdfPath: string | null;
  createdAt: string;
}

interface ReceiptsTableProps {
  initialReceipts: ReceiptRow[];
}

export function ReceiptsTable({ initialReceipts }: ReceiptsTableProps) {
  const [receipts] = useState<ReceiptRow[]>(initialReceipts);
  const [search, setSearch] = useState('');

  const filtered = receipts.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.receiptNumber.toLowerCase().includes(q) ||
      r.clientName.toLowerCase().includes(q) ||
      r.method.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 tracking-tight">Payment Receipts</h1>
          <p className="text-stone-500 text-sm mt-1">
            System-generated official receipts (RCP) created upon confirmed payment allocation
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search receipts or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold text-stone-600 uppercase tracking-wider">
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount Received</th>
                <th className="py-3 px-4 text-center">Receipt Doc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm text-stone-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-stone-400">
                    No payment receipts found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-stone-900">
                      {r.receiptNumber}
                    </td>
                    <td className="py-3 px-4 text-stone-600 whitespace-nowrap">
                      {r.paymentDate || new Date(r.createdAt).toISOString().slice(0, 10)}
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-900">
                      {r.clientName}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="muted" className="capitalize text-xs font-normal">
                        {r.method.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-800 font-mono">
                      {formatINR(BigInt(r.amountPaise))}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-stone-600 hover:text-stone-900"
                        onClick={() => {
                          window.open(`/api/pdf/receipt/${r.id}`, '_blank');
                        }}
                      >
                        Download PDF
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
