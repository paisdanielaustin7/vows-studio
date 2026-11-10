'use client';

import * as React from 'react';
import { ExpenseCategory } from '@/types/sales';
import {
  createExpenseCategoryAction,
  archiveExpenseCategoryAction,
} from '@/server/actions/settings.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Archive, ArchiveRestore, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export function ExpenseCategoriesManager({
  initialCategories,
  canEdit,
}: {
  initialCategories: ExpenseCategory[];
  canEdit: boolean;
}) {
  const [categories, setCategories] = React.useState(initialCategories);
  const [newCode, setNewCode] = React.useState('');
  const [newName, setNewName] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [archivingId, setArchivingId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !newCode.trim() || !newName.trim()) return;

    setCreating(true);
    setStatus(null);

    const res = await createExpenseCategoryAction({
      code: newCode.trim(),
      name: newName.trim(),
      sort: categories.length + 1,
    });

    setCreating(false);
    if (res.error) {
      setStatus({ type: 'error', message: res.error.message });
    } else {
      setStatus({ type: 'success', message: 'Expense category created.' });
      setCategories([
        ...categories,
        {
          id: res.data || 'temp',
          code: newCode.trim().toLowerCase().replace(/\s+/g, '_'),
          name: newName.trim(),
          isBuiltin: false,
          isArchived: false,
          sort: categories.length + 1,
        },
      ]);
      setNewCode('');
      setNewName('');
    }
  };

  const handleToggleArchive = async (cat: ExpenseCategory) => {
    if (!canEdit || cat.isBuiltin) return;
    setArchivingId(cat.id);
    setStatus(null);

    const res = await archiveExpenseCategoryAction(cat.id);
    setArchivingId(null);

    if (res.error) {
      setStatus({ type: 'error', message: res.error.message });
    } else {
      setCategories(
        categories.map((c) => (c.id === cat.id ? { ...c, isArchived: !c.isArchived } : c))
      );
      setStatus({
        type: 'success',
        message: `Category ${cat.name} ${cat.isArchived ? 'restored' : 'archived'}.`,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {status && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
            status.type === 'success'
              ? 'bg-secondary-container/50 text-on-secondary-container border border-secondary-container'
              : 'bg-error-container/50 text-error border border-error-container'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-primary" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-error" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      {/* Add New Category Form */}
      {canEdit && (
        <form
          onSubmit={handleCreate}
          className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col sm:flex-row gap-3 items-end"
        >
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-xs font-medium text-on-surface">Category Name *</label>
            <Input
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (!newCode || newCode === newName.toLowerCase().replace(/\s+/g, '_')) {
                  setNewCode(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                }
              }}
              placeholder="Props & Styling"
              disabled={creating}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5 w-full sm:w-48">
            <label className="text-xs font-medium text-on-surface">System Code *</label>
            <Input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
              placeholder="props_styling"
              disabled={creating}
              required
            />
          </div>

          <Button type="submit" disabled={creating} className="w-full sm:w-auto">
            {creating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-1.5" />
            )}
            Add Category
          </Button>
        </form>
      )}

      {/* Categories List */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/20 bg-surface-container/50 text-xs text-outline uppercase font-semibold">
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Code</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Status</th>
              {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20 text-sm">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-surface-container/30 transition-colors">
                <td className="py-3 px-4 font-medium text-on-surface">{cat.name}</td>
                <td className="py-3 px-4 font-mono text-xs text-outline">{cat.code}</td>
                <td className="py-3 px-4">
                  {cat.isBuiltin ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-secondary-container text-on-secondary-container font-medium">
                      <Lock className="w-3 h-3" />
                      Built-in
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] bg-surface-container text-on-surface-variant">
                      Custom
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {cat.isArchived ? (
                    <span className="px-2 py-0.5 rounded text-[11px] bg-outline-variant/40 text-outline">
                      Archived
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] bg-secondary-container/50 text-on-secondary-container">
                      Active
                    </span>
                  )}
                </td>
                {canEdit && (
                  <td className="py-3 px-4 text-right">
                    {!cat.isBuiltin ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleArchive(cat)}
                        disabled={archivingId === cat.id}
                        className="text-xs h-8"
                      >
                        {archivingId === cat.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : cat.isArchived ? (
                          <>
                            <ArchiveRestore className="w-3.5 h-3.5 mr-1" />
                            Restore
                          </>
                        ) : (
                          <>
                            <Archive className="w-3.5 h-3.5 mr-1 text-outline" />
                            Archive
                          </>
                        )}
                      </Button>
                    ) : (
                      <span className="text-xs text-outline italic">Protected</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
