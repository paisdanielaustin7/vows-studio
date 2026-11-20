'use client';

import * as React from 'react';
import { Service, ServiceCategory, ServiceUnit } from '@/types/sales';
import {
  createServiceAction,
  updateServiceAction,
  archiveServiceAction,
} from '@/server/actions/catalogue.actions';
import { formatINR } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Loader2,
  Edit2,
  Archive,
  Globe,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

const CATEGORIES: ServiceCategory[] = [
  'photography',
  'videography',
  'cinematography',
  'drone',
  'album',
  'editing',
  'other',
];

const UNITS: ServiceUnit[] = ['day', 'hour', 'session', 'item', 'fixed'];

export function ServicesManager({
  initialServices,
  canManage,
}: {
  initialServices: Service[];
  canManage: boolean;
}) {
  const [services, setServices] = React.useState<Service[]>(initialServices);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingService, setEditingService] = React.useState<Service | null>(null);

  const [formData, setFormData] = React.useState({
    name: '',
    category: 'photography' as ServiceCategory,
    description: '',
    unit: 'day' as ServiceUnit,
    priceRupees: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    isActive: true,
    showOnWebsite: false,
    sort: 0,
  });

  const [saving, setSaving] = React.useState(false);
  const [archivingId, setArchivingId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const openCreate = () => {
    setEditingService(null);
    setFormData({
      name: '',
      category: 'photography',
      description: '',
      unit: 'day',
      priceRupees: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      isActive: true,
      showOnWebsite: false,
      sort: services.length + 1,
    });
    setIsDrawerOpen(true);
    setStatus(null);
  };

  const openEdit = (svc: Service) => {
    setEditingService(svc);
    setFormData({
      name: svc.name,
      category: svc.category,
      description: svc.description || '',
      unit: svc.unit,
      priceRupees: svc.currentPricePaise ? (Number(svc.currentPricePaise) / 100).toString() : '0',
      effectiveFrom: svc.priceEffectiveFrom || new Date().toISOString().split('T')[0],
      isActive: svc.isActive,
      showOnWebsite: svc.showOnWebsite,
      sort: svc.sort,
    });
    setIsDrawerOpen(true);
    setStatus(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    setSaving(true);
    setStatus(null);

    const pricePaise = Math.round(Number(formData.priceRupees) * 100);

    if (editingService) {
      const res = await updateServiceAction(editingService.id, {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        unit: formData.unit,
        pricePaise,
        effectiveFrom: formData.effectiveFrom,
        isActive: formData.isActive,
        showOnWebsite: formData.showOnWebsite,
        sort: formData.sort,
      });

      setSaving(false);
      if (res.error) {
        setStatus({ type: 'error', message: res.error.message });
      } else {
        setServices(
          services.map((s) =>
            s.id === editingService.id
              ? {
                  ...s,
                  name: formData.name,
                  category: formData.category,
                  description: formData.description,
                  unit: formData.unit,
                  currentPricePaise: pricePaise,
                  priceEffectiveFrom: formData.effectiveFrom,
                  isActive: formData.isActive,
                  showOnWebsite: formData.showOnWebsite,
                }
              : s
          )
        );
        setIsDrawerOpen(false);
        setStatus({ type: 'success', message: 'Service updated successfully.' });
      }
    } else {
      const res = await createServiceAction({
        name: formData.name,
        category: formData.category,
        description: formData.description,
        unit: formData.unit,
        pricePaise,
        effectiveFrom: formData.effectiveFrom,
        isActive: formData.isActive,
        showOnWebsite: formData.showOnWebsite,
        sort: formData.sort,
      });

      setSaving(false);
      if (res.error) {
        setStatus({ type: 'error', message: res.error.message });
      } else {
        setServices([
          ...services,
          {
            id: res.data || 'temp',
            name: formData.name,
            category: formData.category,
            description: formData.description,
            unit: formData.unit,
            currentPricePaise: pricePaise,
            priceEffectiveFrom: formData.effectiveFrom,
            isActive: formData.isActive,
            showOnWebsite: formData.showOnWebsite,
            sort: formData.sort,
          },
        ]);
        setIsDrawerOpen(false);
        setStatus({ type: 'success', message: 'Service created successfully.' });
      }
    }
  };

  const handleArchive = async (id: string) => {
    if (!canManage) return;
    setArchivingId(id);
    const res = await archiveServiceAction(id);
    setArchivingId(null);

    if (res.error) {
      setStatus({ type: 'error', message: res.error.message });
    } else {
      setServices(services.filter((s) => s.id !== id));
      setStatus({ type: 'success', message: 'Service archived.' });
    }
  };

  const filtered =
    selectedCategory === 'all'
      ? services
      : services.filter((s) => s.category === selectedCategory);

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

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            All Services ({services.length})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors capitalize ${
                selectedCategory === cat
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {canManage && (
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Service
          </Button>
        )}
      </div>

      {/* Services Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/20 bg-surface-container/50 text-xs text-outline uppercase font-semibold">
              <th className="py-3 px-4">Service</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Unit</th>
              <th className="py-3 px-4">Current Price</th>
              <th className="py-3 px-4">Effective Date</th>
              <th className="py-3 px-4">Status</th>
              {canManage && <th className="py-3 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20 text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-outline text-sm">
                  No services found in this category.
                </td>
              </tr>
            ) : (
              filtered.map((svc) => (
                <tr key={svc.id} className="hover:bg-surface-container/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-on-surface">{svc.name}</span>
                        {svc.showOnWebsite && (
                          <span
                            title="Visible on public website"
                            className="text-primary hover:text-primary-dark"
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      {svc.description && (
                        <span className="text-xs text-outline line-clamp-1">{svc.description}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface-container text-on-surface-variant capitalize">
                      {svc.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 capitalize text-on-surface-variant text-xs">{svc.unit}</td>
                  <td className="py-3 px-4 font-medium text-on-surface">
                    {svc.currentPricePaise ? formatINR(BigInt(svc.currentPricePaise)) : '—'}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-outline">
                    {svc.priceEffectiveFrom || '—'}
                  </td>
                  <td className="py-3 px-4">
                    {svc.isActive ? (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-secondary-container/60 text-on-secondary-container font-medium">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-outline-variant/40 text-outline">
                        Inactive
                      </span>
                    )}
                  </td>
                  {canManage && (
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(svc)}
                          className="h-8 px-2 text-on-surface-variant"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchive(svc.id)}
                          disabled={archivingId === svc.id}
                          className="h-8 px-2 text-outline hover:text-error"
                        >
                          {archivingId === svc.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Archive className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer / Modal for Add & Edit */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md h-full bg-surface-container-lowest border-l border-outline-variant/30 p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                <h3 className="text-base font-semibold text-on-surface">
                  {editingService ? 'Edit Service' : 'New Service'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-on-surface">Service Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Traditional Videography"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as ServiceCategory })
                    }
                    className="h-9 px-3 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-xs capitalize text-on-surface"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Billing Unit *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value as ServiceUnit })
                    }
                    className="h-9 px-3 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-xs capitalize text-on-surface"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        Per {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Price (₹) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.priceRupees === '0' || !formData.priceRupees ? '' : formData.priceRupees}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, priceRupees: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Effective Date *</label>
                  <Input
                    type="date"
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-on-surface">Description</label>
                <Textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details of deliverables, coverage and team crew..."
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="text-xs font-medium text-on-surface">Show on Public Website</label>
                <input
                  type="checkbox"
                  checked={formData.showOnWebsite}
                  onChange={(e) => setFormData({ ...formData, showOnWebsite: e.target.checked })}
                  className="rounded border-outline-variant/40 text-primary focus:ring-primary w-4 h-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-on-surface">Is Active</label>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-outline-variant/40 text-primary focus:ring-primary w-4 h-4"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-outline-variant/20">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDrawerOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingService ? (
                    'Update Service'
                  ) : (
                    'Create Service'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
