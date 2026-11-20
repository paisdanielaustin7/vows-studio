'use client';

import * as React from 'react';
import { Package, Service } from '@/types/sales';
import {
  createPackageAction,
  updatePackageAction,
  archivePackageAction,
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
  Package as PackageIcon,
  Trash2,
} from 'lucide-react';

export function PackagesManager({
  initialPackages,
  availableServices,
  canManage,
}: {
  initialPackages: Package[];
  availableServices: Service[];
  canManage: boolean;
}) {
  const [packages, setPackages] = React.useState<Package[]>(initialPackages);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingPackage, setEditingPackage] = React.useState<Package | null>(null);

  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    priceRupees: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    isActive: true,
    showOnWebsite: false,
    items: [] as Array<{ serviceId: string; quantity: number }>,
  });

  const [saving, setSaving] = React.useState(false);
  const [archivingId, setArchivingId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const openCreate = () => {
    setEditingPackage(null);
    setFormData({
      name: '',
      description: '',
      priceRupees: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      isActive: true,
      showOnWebsite: false,
      items: availableServices[0] ? [{ serviceId: availableServices[0].id, quantity: 1 }] : [],
    });
    setIsDrawerOpen(true);
    setStatus(null);
  };

  const openEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      priceRupees: pkg.currentPricePaise ? (Number(pkg.currentPricePaise) / 100).toString() : '0',
      effectiveFrom: pkg.priceEffectiveFrom || new Date().toISOString().split('T')[0],
      isActive: pkg.isActive,
      showOnWebsite: pkg.showOnWebsite,
      items: (pkg.items || []).map((i) => ({ serviceId: i.serviceId, quantity: i.quantity })),
    });
    setIsDrawerOpen(true);
    setStatus(null);
  };

  const addItem = () => {
    if (availableServices[0]) {
      setFormData({
        ...formData,
        items: [...formData.items, { serviceId: availableServices[0].id, quantity: 1 }],
      });
    }
  };

  const removeItem = (idx: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== idx),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    if (formData.items.length === 0) {
      setStatus({ type: 'error', message: 'Package must contain at least one service item.' });
      return;
    }

    setSaving(true);
    setStatus(null);

    const pricePaise = Math.round(Number(formData.priceRupees) * 100);

    if (editingPackage) {
      const res = await updatePackageAction(editingPackage.id, {
        name: formData.name,
        description: formData.description,
        pricePaise,
        effectiveFrom: formData.effectiveFrom,
        items: formData.items,
        isActive: formData.isActive,
        showOnWebsite: formData.showOnWebsite,
        sort: editingPackage.sort,
      });

      setSaving(false);
      if (res.error) {
        setStatus({ type: 'error', message: res.error.message });
      } else {
        setPackages(
          packages.map((p) =>
            p.id === editingPackage.id
              ? {
                  ...p,
                  name: formData.name,
                  description: formData.description,
                  currentPricePaise: pricePaise,
                  priceEffectiveFrom: formData.effectiveFrom,
                  isActive: formData.isActive,
                  showOnWebsite: formData.showOnWebsite,
                  items: formData.items.map((i) => {
                    const match = availableServices.find((s) => s.id === i.serviceId);
                    return {
                      serviceId: i.serviceId,
                      serviceName: match?.name || 'Service',
                      unit: match?.unit || 'day',
                      quantity: i.quantity,
                    };
                  }),
                }
              : p
          )
        );
        setIsDrawerOpen(false);
        setStatus({ type: 'success', message: 'Package updated successfully.' });
      }
    } else {
      const res = await createPackageAction({
        name: formData.name,
        description: formData.description,
        pricePaise,
        effectiveFrom: formData.effectiveFrom,
        items: formData.items,
        isActive: formData.isActive,
        showOnWebsite: formData.showOnWebsite,
        sort: packages.length + 1,
      });

      setSaving(false);
      if (res.error) {
        setStatus({ type: 'error', message: res.error.message });
      } else {
        setPackages([
          ...packages,
          {
            id: res.data || 'temp',
            name: formData.name,
            description: formData.description,
            currentPricePaise: pricePaise,
            priceEffectiveFrom: formData.effectiveFrom,
            isActive: formData.isActive,
            showOnWebsite: formData.showOnWebsite,
            sort: packages.length + 1,
            items: formData.items.map((i) => {
              const match = availableServices.find((s) => s.id === i.serviceId);
              return {
                serviceId: i.serviceId,
                serviceName: match?.name || 'Service',
                unit: match?.unit || 'day',
                quantity: i.quantity,
              };
            }),
          },
        ]);
        setIsDrawerOpen(false);
        setStatus({ type: 'success', message: 'Package created successfully.' });
      }
    }
  };

  const handleArchive = async (id: string) => {
    if (!canManage) return;
    setArchivingId(id);
    const res = await archivePackageAction(id);
    setArchivingId(null);

    if (res.error) {
      setStatus({ type: 'error', message: res.error.message });
    } else {
      setPackages(packages.filter((p) => p.id !== id));
      setStatus({ type: 'success', message: 'Package archived.' });
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

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-outline font-medium">
          Showing {packages.length} bundled packages
        </span>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Build Package
          </Button>
        )}
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-xs flex flex-col justify-between gap-5 hover:border-primary/40 transition-colors"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-surface-container text-primary">
                    <PackageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-on-surface leading-tight">
                      {pkg.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {pkg.showOnWebsite && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-primary">
                          <Globe className="w-3 h-3" />
                          Website
                        </span>
                      )}
                      {!pkg.isActive && (
                        <span className="text-[11px] text-outline italic">Inactive</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {pkg.description && (
                <p className="text-xs text-outline line-clamp-2 leading-relaxed">
                  {pkg.description}
                </p>
              )}

              {/* Items included */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-outline-variant/20">
                <span className="text-[11px] uppercase tracking-wider text-outline font-semibold">
                  Included Services
                </span>
                <ul className="flex flex-col gap-1 text-xs text-on-surface-variant">
                  {(pkg.items || []).map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between">
                      <span className="truncate">{item.serviceName}</span>
                      <span className="font-mono text-xs text-outline shrink-0 ml-2">
                        × {item.quantity} {item.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
              <div className="flex flex-col">
                <span className="text-[11px] text-outline">Package Price</span>
                <span className="font-serif text-lg font-bold text-on-surface">
                  {pkg.currentPricePaise ? formatINR(BigInt(pkg.currentPricePaise)) : '—'}
                </span>
              </div>

              {canManage && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(pkg)}
                    className="h-8 px-2 text-on-surface-variant"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArchive(pkg.id)}
                    disabled={archivingId === pkg.id}
                    className="h-8 px-2 text-outline hover:text-error"
                  >
                    {archivingId === pkg.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Archive className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Drawer for Package Builder */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg h-full bg-surface-container-lowest border-l border-outline-variant/30 p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                <h3 className="text-base font-semibold text-on-surface">
                  {editingPackage ? 'Edit Package' : 'Build New Package'}
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
                <label className="text-xs font-medium text-on-surface">Package Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Complete 2-Day Wedding Suite"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Package Price (₹) *</label>
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
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Package summary and key inclusions..."
                />
              </div>

              {/* Inclusions Editor */}
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-on-surface">Included Services *</label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 text-xs">
                    <Plus className="w-3 h-3 mr-1" />
                    Add Item
                  </Button>
                </div>

                <div className="flex flex-col gap-2">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-surface-container p-2 rounded-lg">
                      <select
                        value={item.serviceId}
                        onChange={(e) => {
                          const updated = [...formData.items];
                          updated[idx] = { ...item, serviceId: e.target.value };
                          setFormData({ ...formData, items: updated });
                        }}
                        className="flex-1 h-8 px-2 bg-surface-container-lowest border border-outline-variant/40 rounded text-xs text-on-surface"
                      >
                        {availableServices.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.unit})
                          </option>
                        ))}
                      </select>

                      <Input
                        type="number"
                        min={1}
                        value={item.quantity === 0 ? '' : item.quantity}
                        placeholder="1"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const updated = [...formData.items];
                          updated[idx] = { ...item, quantity: e.target.value === '' ? 1 : Math.max(1, Number(e.target.value)) };
                          setFormData({ ...formData, items: updated });
                        }}
                        className="w-16 h-8 text-center text-xs"
                      />

                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1 text-outline hover:text-error"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
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
                  ) : editingPackage ? (
                    'Update Package'
                  ) : (
                    'Create Package'
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
