'use client';

import * as React from 'react';
import { AuditLogEntry } from '@/types/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogContent } from '@/components/ui/dialog';
import { Filter, Eye, RefreshCw } from 'lucide-react';

interface AuditLogViewerProps {
  entries: AuditLogEntry[];
  title: string;
  description: string;
  isScoped?: boolean;
}

export function AuditLogViewer({
  entries,
  title,
  description,
  isScoped = false,
}: AuditLogViewerProps) {
  const [selectedEntry, setSelectedEntry] = React.useState<AuditLogEntry | null>(null);
  const [actionFilter, setActionFilter] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  const filteredEntries = entries.filter((e) => {
    if (actionFilter !== 'all' && e.action !== actionFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTable = e.tableName?.toLowerCase().includes(q);
      const matchRecord = e.recordId?.toLowerCase().includes(q);
      const matchAction = e.action.toLowerCase().includes(q);
      const matchActor = e.actorRole?.toLowerCase().includes(q);
      if (!matchTable && !matchRecord && !matchAction && !matchActor) {
        return false;
      }
    }
    return true;
  });

  const uniqueActions = Array.from(new Set(entries.map((e) => e.action))).sort();

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div>
          <div className="text-xs uppercase tracking-widest text-outline font-semibold mb-1">
            {isScoped ? 'Studio Compliance' : 'System Administration'} &bull; Append-Only Ledger
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-on-surface">
            {title}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs">
        <div className="flex items-center gap-2 text-outline">
          <Filter className="w-4 h-4" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">Filters:</span>
        </div>

        <select
          className="h-8 px-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-xs focus:outline-none"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="all">All Actions ({entries.length})</option>
          {uniqueActions.map((act) => (
            <option key={act} value={act}>
              {act.replace('_', ' ').toUpperCase()}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search by table, ID, actor..."
          className="h-8 px-3 rounded-lg border border-outline-variant bg-surface text-on-surface text-xs placeholder:text-outline focus:outline-none w-48 sm:w-64"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="ml-auto text-[11px] text-outline">
          Showing {filteredEntries.length} of {entries.length} recorded events
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container/60 border-b border-outline-variant/30 text-outline uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Timestamp (IST)</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity Table</th>
                <th className="px-4 py-3">Record ID</th>
                <th className="px-4 py-3">Actor Role</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-outline">
                    No matching audit log records found.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-on-surface whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default" className="capitalize font-mono text-[11px]">
                        {item.action.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-on-surface-variant font-medium">
                      {item.tableName || 'system'}
                    </td>
                    <td className="px-4 py-3 font-mono text-outline truncate max-w-[120px]">
                      {item.recordId || '—'}
                    </td>
                    <td className="px-4 py-3 capitalize text-on-surface font-medium">
                      {item.actorRole?.replace('_', ' ') || 'system'}
                    </td>
                    <td className="px-4 py-3 font-mono text-outline">
                      {item.ipAddress || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEntry(item)}
                        className="gap-1 text-[11px] h-7"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Modal / Diff Viewer */}
      {selectedEntry && (
        <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto space-y-4">
            <DialogHeader>
              <DialogTitle className="font-serif text-lg font-semibold text-on-surface flex items-center justify-between">
                <span>Audit Entry #{selectedEntry.id}</span>
                <Badge variant="default" className="font-mono capitalize">
                  {selectedEntry.action}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 text-xs p-3 bg-surface-container-low rounded-xl">
              <div>
                <span className="text-outline uppercase text-[10px] font-semibold block">Entity</span>
                <span className="font-mono font-medium text-on-surface">
                  {selectedEntry.tableName} ({selectedEntry.recordId || 'N/A'})
                </span>
              </div>
              <div>
                <span className="text-outline uppercase text-[10px] font-semibold block">Timestamp (IST)</span>
                <span className="font-mono text-on-surface">
                  {new Date(selectedEntry.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </span>
              </div>
              <div>
                <span className="text-outline uppercase text-[10px] font-semibold block">Actor</span>
                <span className="capitalize text-on-surface">
                  {selectedEntry.actorRole?.replace('_', ' ') || 'System'} ({selectedEntry.actorUserId || 'N/A'})
                </span>
              </div>
              <div>
                <span className="text-outline uppercase text-[10px] font-semibold block">Client Network</span>
                <span className="font-mono text-on-surface">
                  {selectedEntry.ipAddress || 'Internal'}
                </span>
              </div>
            </div>

            {/* Before vs After JSON Diffs */}
            <div className="space-y-3">
              {Boolean(selectedEntry.oldValues) && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-error uppercase tracking-wider">
                    Previous Values (Before Mutation)
                  </span>
                  <pre className="p-3 bg-surface-container-high rounded-xl text-[11px] font-mono text-on-surface overflow-x-auto max-h-48">
                    {JSON.stringify(selectedEntry.oldValues, null, 2)}
                  </pre>
                </div>
              )}

              {Boolean(selectedEntry.newValues) && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    New Values (After Mutation)
                  </span>
                  <pre className="p-3 bg-surface-container-high rounded-xl text-[11px] font-mono text-on-surface overflow-x-auto max-h-48">
                    {JSON.stringify(selectedEntry.newValues, null, 2)}
                  </pre>
                </div>
              )}

              {Boolean(selectedEntry.metadata) && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-outline uppercase tracking-wider">
                    Operation Metadata
                  </span>
                  <pre className="p-3 bg-surface-container-high rounded-xl text-[11px] font-mono text-on-surface overflow-x-auto max-h-36">
                    {JSON.stringify(selectedEntry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
