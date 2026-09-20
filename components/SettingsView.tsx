'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Shield,
  KeyRound,
  Lock,
  User,
  Users,
  Plus,
  Trash2,
  Edit3,
  Check,
  Palette,
  Landmark,
  FileCheck2,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Eye,
  EyeOff,
  Phone,
  RotateCcw,
  CheckCircle,
  Copy,
  ExternalLink,
  Database,
  Sparkles,
  Cloud,
  Code2,
  Unlock,
  Camera,
} from 'lucide-react';
import {
  StudioSettings,
  UserAccount,
  PDFThemeColor,
  CustomThemePalette,
  UserRole,
  SiteColorTheme,
  GearItem,
} from '@/types';
import { defaultGearInventory } from '@/lib/catalogDefaults';

interface SettingsViewProps {
  settings: StudioSettings;
  onUpdateSettings: (newSettings: StudioSettings) => void;
  users: UserAccount[];
  currentUser: UserAccount;
  onUpdateUsers: (newUsers: UserAccount[]) => void;
  onOpenLoginModal: () => void;
  onResetSampleData?: () => void;
  onClearAllData?: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  users,
  currentUser,
  onUpdateUsers,
  onOpenLoginModal,
  onResetSampleData,
  onClearAllData,
}) => {
  const [activeTab, setActiveTab] = useState<'pdf' | 'banking' | 'terms' | 'users' | 'gear' | 'access' | 'integrations'>('pdf');

  // Viewer vs Admin edit rights
  const canEdit = currentUser.canAccessSettings;

  // PDF Theme & Studio Info State
  const [studioForm, setStudioForm] = useState<StudioSettings>(settings);
  const [isSavedBanner, setIsSavedBanner] = useState(false);

  // Custom Color Palette Creator State (Admin only)
  const [showAddColorModal, setShowAddColorModal] = useState(false);
  const [customPaletteName, setCustomPaletteName] = useState('');
  const [customPrimaryColor, setCustomPrimaryColor] = useState('#2e4a62');
  const [customBgColor, setCustomBgColor] = useState('#f4f7f9');
  const [customTextColor, setCustomTextColor] = useState('#111a24');
  const [customDesc, setCustomDesc] = useState('Bespoke client editorial tone.');

  // Terms State
  const [terms, setTerms] = useState<string[]>(settings.termsAndConditions);
  const [newTermText, setNewTermText] = useState('');
  const [editingTermIndex, setEditingTermIndex] = useState<number | null>(null);
  const [editingTermText, setEditingTermText] = useState('');

  // Custom Ledger Category State
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Gear Inventory Modal & Add State
  const [showAddGearModal, setShowAddGearModal] = useState(false);
  const [newGearName, setNewGearName] = useState('');
  const [newGearCategory, setNewGearCategory] = useState<'BODY' | 'LENS' | 'LIGHTING' | 'DRONE' | 'AUDIO' | 'SUPPORT'>('BODY');
  const [newGearNotes, setNewGearNotes] = useState('');

  // User Management State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [userFormData, setUserFormData] = useState<{
    fullName: string;
    username: string;
    password: string;
    role: UserRole;
    canViewFinances: boolean;
    canAccessSettings: boolean;
    canEditQuotesAndOrders: boolean;
    canEditLedger: boolean;
    canDeleteQuotes: boolean;
    canSendEmails: boolean;
    canViewCallSheets: boolean;
    canExportPDFs: boolean;
  }>({
    fullName: '',
    username: '',
    password: '',
    role: 'CREW',
    canViewFinances: false,
    canAccessSettings: false,
    canEditQuotesAndOrders: false,
    canEditLedger: false,
    canDeleteQuotes: false,
    canSendEmails: false,
    canViewCallSheets: true,
    canExportPDFs: true,
  });

  // Sample Data Reset Confirmation Modal
  const [showResetModal, setShowResetModal] = useState(false);

  // Change Password State (for logged-in user)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPasswordEye, setShowPasswordEye] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Operational Data Wipe Modal State
  const [showClearAllDataModal, setShowClearAllDataModal] = useState(false);
  const [clearDataInput, setClearDataInput] = useState('');
  const [isWipingData, setIsWipingData] = useState(false);
  const [wipeSuccessNotice, setWipeSuccessNotice] = useState<string | null>(null);

  // Automations & Integrations Copy Feedback
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);

  // Escape key listener for SettingsView modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddColorModal) {
          setShowAddColorModal(false);
        } else if (isUserModalOpen) {
          setIsUserModalOpen(false);
        } else if (showResetModal) {
          setShowResetModal(false);
        } else if (showChangePasswordModal) {
          setShowChangePasswordModal(false);
        } else if (showClearAllDataModal) {
          setShowClearAllDataModal(false);
        } else if (showAddGearModal) {
          setShowAddGearModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddColorModal, isUserModalOpen, showResetModal, showChangePasswordModal, showClearAllDataModal, showAddGearModal]);

  // Sync internal form when settings update from cloud realtime
  useEffect(() => {
    setStudioForm(settings);
    setTerms(settings.termsAndConditions);
  }, [settings]);

  const showSuccessFeedback = () => {
    setIsSavedBanner(true);
    setTimeout(() => setIsSavedBanner(false), 3000);
  };

  const handleSaveStudioInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    onUpdateSettings({
      ...studioForm,
      termsAndConditions: terms,
    });
    showSuccessFeedback();
  };

  const handleSelectPDFTheme = (color: PDFThemeColor) => {
    if (!canEdit) return;
    const updated = { ...studioForm, pdfThemeColor: color };
    setStudioForm(updated);
    onUpdateSettings({ ...updated, termsAndConditions: terms });
    showSuccessFeedback();
  };

  // Add custom color palette (Admin)
  const handleAddCustomPalette = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !customPaletteName.trim()) return;

    const newPaletteId = `custom-${Date.now()}`;
    const newPalette: CustomThemePalette = {
      id: newPaletteId,
      name: customPaletteName.trim(),
      primaryColor: customPrimaryColor,
      backgroundColor: customBgColor,
      textColor: customTextColor,
      desc: customDesc.trim() || 'Custom bespoke studio palette.',
    };

    const existingPalettes = studioForm.customPalettes || [];
    const updatedPalettes = [...existingPalettes, newPalette];
    const updatedSettings = {
      ...studioForm,
      pdfThemeColor: newPaletteId,
      customPalettes: updatedPalettes,
      termsAndConditions: terms,
    };

    setStudioForm(updatedSettings);
    onUpdateSettings(updatedSettings);
    setShowAddColorModal(false);
    setCustomPaletteName('');
    showSuccessFeedback();
  };

  // Delete custom color palette (Admin)
  const handleDeleteCustomPalette = (paletteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;

    const existingPalettes = studioForm.customPalettes || [];
    const updatedPalettes = existingPalettes.filter((p) => p.id !== paletteId);
    const updatedSettings = {
      ...studioForm,
      pdfThemeColor: studioForm.pdfThemeColor === paletteId ? 'sage' : studioForm.pdfThemeColor,
      customPalettes: updatedPalettes,
      termsAndConditions: terms,
    };

    setStudioForm(updatedSettings);
    onUpdateSettings(updatedSettings);
    showSuccessFeedback();
  };

  // Terms management
  const handleAddTerm = () => {
    if (!canEdit || !newTermText.trim()) return;
    const updated = [...terms, newTermText.trim()];
    setTerms(updated);
    setNewTermText('');
    onUpdateSettings({ ...studioForm, termsAndConditions: updated });
    showSuccessFeedback();
  };

  const handleDeleteTerm = (index: number) => {
    if (!canEdit) return;
    const updated = terms.filter((_, i) => i !== index);
    setTerms(updated);
    onUpdateSettings({ ...studioForm, termsAndConditions: updated });
    showSuccessFeedback();
  };

  const handleStartEditTerm = (index: number) => {
    if (!canEdit) return;
    setEditingTermIndex(index);
    setEditingTermText(terms[index]);
  };

  const handleSaveEditTerm = () => {
    if (!canEdit || editingTermIndex === null || !editingTermText.trim()) return;
    const updated = [...terms];
    updated[editingTermIndex] = editingTermText.trim();
    setTerms(updated);
    setEditingTermIndex(null);
    setEditingTermText('');
    onUpdateSettings({ ...studioForm, termsAndConditions: updated });
    showSuccessFeedback();
  };

  // User management
  const handleOpenAddUser = () => {
    if (!canEdit) return;
    setEditingUser(null);
    setUserFormData({
      fullName: '',
      username: '',
      password: '',
      role: 'CREW',
      canViewFinances: false,
      canAccessSettings: false,
      canEditQuotesAndOrders: false,
      canEditLedger: false,
      canDeleteQuotes: false,
      canSendEmails: false,
      canViewCallSheets: true,
      canExportPDFs: true,
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: UserAccount) => {
    if (!canEdit) return;
    setEditingUser(u);
    setUserFormData({
      fullName: u.fullName,
      username: u.username,
      password: u.password,
      role: u.role,
      canViewFinances: u.canViewFinances,
      canAccessSettings: u.canAccessSettings,
      canEditQuotesAndOrders: u.canEditQuotesAndOrders,
      canEditLedger: !!u.canEditLedger,
      canDeleteQuotes: u.canDeleteQuotes ?? true,
      canSendEmails: u.canSendEmails ?? true,
      canViewCallSheets: u.canViewCallSheets ?? true,
      canExportPDFs: u.canExportPDFs ?? true,
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !userFormData.username || !userFormData.password) return;

    if (editingUser) {
      const updatedUsers = users.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              fullName: userFormData.fullName,
              username: userFormData.username.trim().toLowerCase(),
              password: userFormData.password,
              role: userFormData.role,
              canViewFinances: userFormData.canViewFinances,
              canAccessSettings: userFormData.canAccessSettings,
              canEditQuotesAndOrders: userFormData.canEditQuotesAndOrders,
              canEditLedger: userFormData.canEditLedger,
              canDeleteQuotes: userFormData.canDeleteQuotes,
              canSendEmails: userFormData.canSendEmails,
              canViewCallSheets: userFormData.canViewCallSheets,
              canExportPDFs: userFormData.canExportPDFs,
            }
          : u
      );
      onUpdateUsers(updatedUsers);
    } else {
      if (users.some((u) => u.username.toLowerCase() === userFormData.username.trim().toLowerCase())) {
        alert('Username already exists. Please choose a unique username.');
        return;
      }
      const newUser: UserAccount = {
        id: `usr-${Date.now()}`,
        fullName: userFormData.fullName || userFormData.username,
        username: userFormData.username.trim().toLowerCase(),
        password: userFormData.password,
        role: userFormData.role,
        canViewFinances: userFormData.canViewFinances,
        canAccessSettings: userFormData.canAccessSettings,
        canEditQuotesAndOrders: userFormData.canEditQuotesAndOrders,
        canEditLedger: userFormData.canEditLedger,
        canDeleteQuotes: userFormData.canDeleteQuotes,
        canSendEmails: userFormData.canSendEmails,
        canViewCallSheets: userFormData.canViewCallSheets,
        canExportPDFs: userFormData.canExportPDFs,
      };
      onUpdateUsers([...users, newUser]);
    }

    setIsUserModalOpen(false);
    showSuccessFeedback();
  };

  const handleDeleteUser = (userId: string) => {
    if (!canEdit) return;
    const target = users.find((u) => u.id === userId);
    if (target?.username === 'admin' || target?.username === 'root' || target?.username === 'system.admin') {
      alert('The root system account cannot be deleted.');
      return;
    }
    if (confirm(`Are you sure you want to remove user "${target?.username}"?`)) {
      onUpdateUsers(users.filter((u) => u.id !== userId));
      showSuccessFeedback();
    }
  };

  // Change Password for Logged-In User
  const handleChangeMyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (currentPasswordInput !== currentUser.password) {
      setPasswordError('Current password does not match. Please verify your current password.');
      return;
    }
    if (newPasswordInput.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordError('New passwords do not match. Please confirm correctly.');
      return;
    }

    const updatedUsers = users.map((u) =>
      u.id === currentUser.id ? { ...u, password: newPasswordInput } : u
    );
    onUpdateUsers(updatedUsers);
    setPasswordSuccess('Password successfully updated!');
    setTimeout(() => {
      setShowChangePasswordModal(false);
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setPasswordSuccess(null);
      showSuccessFeedback();
    }, 1400);
  };

  // 1-Click User Lock / Unlock Toggle
  const handleToggleUserLock = (targetUser: UserAccount) => {
    if (targetUser.id === currentUser.id) {
      alert('You cannot lock your own active identity.');
      return;
    }
    const isAuthorized =
      currentUser.username === 'root' ||
      currentUser.username === 'admin' ||
      currentUser.username === 'system.admin' ||
      currentUser.username === 'reuben';
    if (!isAuthorized) {
      alert('Unauthorized: Account locking privilege is reserved for System Admin and Reuben.');
      return;
    }
    if (currentUser.username === 'reuben' && (targetUser.username === 'root' || targetUser.username === 'admin' || targetUser.username === 'system.admin')) {
      alert('Access Denied: You cannot lock a higher system authority tier.');
      return;
    }

    const updated = users.map((u) =>
      u.id === targetUser.id ? { ...u, isLocked: !u.isLocked } : u
    );
    onUpdateUsers(updated);
  };

  // Root Admin Dynamic Permission Override
  const handleOverrideUserPermission = (targetUserId: string, field: keyof UserAccount, val: any) => {
    const isRootAuthority = currentUser.username === 'root' || currentUser.username === 'admin' || currentUser.username === 'system.admin';
    if (!isRootAuthority) {
      alert('Security Violation: Only Root Admin / Developer can override user access controls.');
      return;
    }
    const updated = users.map((u) =>
      u.id === targetUserId ? { ...u, [field]: val } : u
    );
    onUpdateUsers(updated);
  };

  // Add Gear Asset Item Handler
  const handleAddGearItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGearName.trim()) return;
    const newItem: GearItem = {
      id: `gear-${Date.now()}`,
      name: newGearName.trim(),
      category: newGearCategory,
      available: true,
      notes: newGearNotes.trim() || undefined,
    };
    const existing = studioForm.gearInventory || defaultGearInventory;
    const nextForm = { ...studioForm, gearInventory: [...existing, newItem] };
    setStudioForm(nextForm);
    onUpdateSettings(nextForm);
    setNewGearName('');
    setNewGearNotes('');
    setShowAddGearModal(false);
    showSuccessFeedback();
  };

  // Operational Data Wipe Execution
  const handleExecuteDataWipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clearDataInput.trim() !== 'CLEAR ALL DATA') {
      alert('Confirmation text mismatch. Please type "CLEAR ALL DATA" exactly to proceed.');
      return;
    }
    if (!onClearAllData) return;

    setIsWipingData(true);
    try {
      await onClearAllData();
      setIsWipingData(false);
      setWipeSuccessNotice('All operational studio records (quotes, enquiries, shoots, invoices, ledger, feedback) wiped clean successfully.');
      setTimeout(() => {
        setShowClearAllDataModal(false);
        setClearDataInput('');
        setWipeSuccessNotice(null);
      }, 1800);
    } catch (err) {
      setIsWipingData(false);
      alert('Failed to clear all operational data.');
    }
  };

  return (
    <div className="p-3.5 sm:p-5 lg:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-6 animate-fadeIn">
      {/* Top Banner Feedback */}
      {isSavedBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-4 right-8 z-50 px-3.5 py-2 bg-green-600 text-white font-mono text-[11px] uppercase tracking-wider shadow-lg flex items-center gap-2 border border-white"
        >
          <Check size={13} />
          <span>Studio Parameters Updated</span>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-3 sm:pb-4 border-b border-bone-border dark:border-obsidian-border">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[9.5px] sm:text-[10px] font-mono uppercase tracking-[0.2em] text-bone-muted dark:text-obsidian-muted mb-0.5">
            <span>Operating Matrix</span>
            <span>//</span>
            <span className="text-vermillion font-bold">Studio Configurations</span>
            <span className="hidden xs:inline">//</span>
            <span className="hidden xs:inline">{canEdit ? 'DIRECTOR ADMIN' : 'VIEWER'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-serif font-black tracking-tight text-carbon dark:text-white uppercase">
            Studio Settings
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && onClearAllData && (
            <button
              onClick={() => setShowClearAllDataModal(true)}
              className="px-3 py-1.5 border border-rose-500/40 text-[10px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500 transition-all flex items-center gap-1.5 font-bold"
              title="Permanently wipe all operational data (quotes, enquiries, bookings, invoices, ledger, feedback)"
            >
              <Trash2 size={12} />
              <span>Clear All Data</span>
            </button>
          )}
          {canEdit && onResetSampleData && (
            <button
              onClick={() => setShowResetModal(true)}
              className="px-3 py-1.5 border border-bone-border dark:border-obsidian-border text-[10px] font-mono uppercase tracking-wider text-bone-muted dark:text-obsidian-muted hover:text-vermillion dark:hover:text-vermillion hover:border-vermillion transition-all flex items-center gap-1.5"
              title="Refresh / Re-seed sample data across studio modules"
            >
              <RotateCcw size={12} />
              <span>Reset Sample Data</span>
            </button>
          )}
          {!canEdit && (
            <span className="text-[10px] font-mono uppercase px-2.5 py-1 bg-carbon/10 dark:bg-white/10 text-bone-muted dark:text-obsidian-muted font-bold">
              Read-Only Viewer
            </span>
          )}
        </div>
      </div>

      {/* Viewer Notice if Read-Only */}
      {!canEdit && (
        <div className="p-3 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border flex items-center gap-2.5 text-xs font-mono text-bone-muted dark:text-obsidian-muted">
          <Lock size={14} className="text-vermillion shrink-0" />
          <span>
            You have <strong>Viewer Access</strong> to studio parameters and banking details. Administrative credentials are required to modify settings or add user accounts.
          </span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center overflow-x-auto gap-1.5 border-b border-bone-border dark:border-obsidian-border pb-2 text-xs font-mono whitespace-nowrap">
        {[
          { id: 'pdf', label: 'Site & PDF Themes', icon: Palette },
          { id: 'banking', label: 'Banking & Remittance', icon: Landmark },
          { id: 'terms', label: `Terms & Conditions (${terms.length})`, icon: FileCheck2 },
          { id: 'users', label: `User Credentials (${users.length})`, icon: KeyRound },
          { id: 'gear', label: `Gear Catalog (${(studioForm.gearInventory || defaultGearInventory).length})`, icon: Camera },
          { id: 'access', label: 'Access Control & Security', icon: ShieldCheck },
          { id: 'integrations', label: 'Automations & Cloud', icon: Cloud },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 uppercase tracking-wider flex items-center gap-1.5 border transition-all shrink-0 ${
                isActive
                  ? 'bg-carbon text-bone dark:bg-white dark:text-carbon font-bold border-carbon dark:border-white'
                  : 'border-transparent text-bone-muted dark:text-obsidian-muted hover:text-carbon dark:hover:text-white'
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Themes & Studio Info */}
      {activeTab === 'pdf' && (
        <form onSubmit={handleSaveStudioInfo} className="space-y-6 text-xs font-mono">
          {/* Site Interface Color Theme Selector */}
          <div className="p-4 sm:p-5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h3 className="font-serif text-base font-bold uppercase">Site Interface Color Theme</h3>
                <p className="text-[11px] text-bone-muted dark:text-obsidian-muted">
                  Operating atmosphere for the entire studio OS. Synced seamlessly across Light and Dark modes.
                </p>
              </div>
              <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 bg-vermillion text-white font-bold self-start sm:self-auto">
                Active: {(studioForm.uiTheme || 'slate').toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              {[
                {
                  id: 'slate' as SiteColorTheme,
                  name: 'Atelier Slate',
                  sub: 'Royal Azure Blue',
                  accentColor: '#2563eb',
                  lightBg: '#f8fafc',
                  darkBg: '#0b0d0e',
                  desc: 'Deep slate navy with crisp alabaster whites & Royal Azure accents.',
                },
                {
                  id: 'obsidian' as SiteColorTheme,
                  name: 'Obsidian Noir',
                  sub: 'Haute Carmine Red',
                  accentColor: '#dc2626',
                  lightBg: '#faf9f5',
                  darkBg: '#0a0a0a',
                  desc: 'Brutalist jet black & bone ivory paired with Carmine Red accents.',
                },
                {
                  id: 'sage' as SiteColorTheme,
                  name: 'Coastal Sage',
                  sub: 'Coastal Emerald',
                  accentColor: '#059669',
                  lightBg: '#f6f8f6',
                  darkBg: '#0a0e0c',
                  desc: 'Mangalore coastal eucalyptus green with luminous Emerald highlights.',
                },
                {
                  id: 'mocha' as SiteColorTheme,
                  name: 'Warm Espresso',
                  sub: 'Burnished Amber',
                  accentColor: '#c2410c',
                  lightBg: '#f8f6f2',
                  darkBg: '#0e0c0b',
                  desc: 'Rich roasted espresso & cashmere cream with Burnished Amber accents.',
                },
                {
                  id: 'cobalt' as SiteColorTheme,
                  name: 'Deep Cobalt',
                  sub: 'Arctic Ice Cyan',
                  accentColor: '#06b6d4',
                  lightBg: '#f5f7fa',
                  darkBg: '#080b11',
                  desc: 'Oceanic midnight indigo with high-tech Electric Cyan accents.',
                },
              ].map((themeOpt) => {
                const isSelected = (studioForm.uiTheme || 'slate') === themeOpt.id;
                return (
                  <button
                    key={themeOpt.id}
                    type="button"
                    onClick={() => {
                      const updated = { ...studioForm, uiTheme: themeOpt.id };
                      setStudioForm(updated);
                      onUpdateSettings(updated);
                      if (typeof document !== 'undefined') {
                        document.documentElement.setAttribute('data-theme', themeOpt.id);
                      }
                      showSuccessFeedback();
                    }}
                    className={`p-3 border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-vermillion bg-bone-surface dark:bg-obsidian-surface ring-1 ring-vermillion'
                        : 'border-bone-border dark:border-obsidian-border bg-bone-card dark:bg-obsidian-card hover:border-carbon dark:hover:border-white'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2 text-vermillion">
                        <Check size={14} />
                      </span>
                    )}

                    <div className="space-y-1.5">
                      {/* Split Light & Dark preview swatch with accent dot */}
                      <div className="h-6 w-full flex rounded-xs overflow-hidden border border-bone-border dark:border-obsidian-border relative">
                        <div
                          className="flex-1 flex items-center justify-center text-[8px] font-bold text-slate-800"
                          style={{ backgroundColor: themeOpt.lightBg }}
                        >
                          LIGHT
                        </div>
                        <div
                          className="flex-1 flex items-center justify-center text-[8px] font-bold text-white"
                          style={{ backgroundColor: themeOpt.darkBg }}
                        >
                          DARK
                        </div>
                        <div
                          className="w-3.5 h-3.5 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-white shadow-xs"
                          style={{ backgroundColor: themeOpt.accentColor }}
                          title={`Theme Accent: ${themeOpt.sub}`}
                        />
                      </div>

                      <div>
                        <p className="font-serif font-bold text-xs uppercase text-carbon dark:text-white">
                          {themeOpt.name}
                        </p>
                        <p className="text-[9px] font-mono text-vermillion uppercase font-bold">
                          {themeOpt.sub}
                        </p>
                      </div>
                      <p className="text-[10px] text-bone-muted dark:text-obsidian-muted line-clamp-2">
                        {themeOpt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PDF Theme Palette Selector */}
          <div className="p-4 sm:p-5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h3 className="font-serif text-base font-bold uppercase">PDF Document Theme Palette</h3>
                <p className="text-[11px] text-bone-muted dark:text-obsidian-muted">
                  Palette applied to generated Quotation and Invoice PDFs.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 bg-vermillion text-white font-bold">
                  Active: {studioForm.pdfThemeColor.toUpperCase()}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setShowAddColorModal(true)}
                    className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider bg-carbon text-bone dark:bg-white dark:text-carbon font-bold hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all flex items-center gap-1"
                  >
                    <Plus size={12} />
                    <span>Add Custom Color</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {/* 1. Presets */}
              {[
                {
                  id: 'sage' as PDFThemeColor,
                  name: 'Coastal Sage',
                  bgChip: '#f8faf9',
                  accentChip: '#284638',
                  desc: 'Mangalore botanical green and forest slate.',
                  isCustom: false,
                },
                {
                  id: 'monochrome' as PDFThemeColor,
                  name: 'Obsidian Mono',
                  bgChip: '#fafafa',
                  accentChip: '#111111',
                  desc: 'Editorial brutalist black and bone silver.',
                  isCustom: false,
                },
                {
                  id: 'sand_gold' as PDFThemeColor,
                  name: 'Malpe Sand Gold',
                  bgChip: '#fbf9f4',
                  accentChip: '#7d6124',
                  desc: 'Sun-bleached coastal sands and archival sepia.',
                  isCustom: false,
                },
                {
                  id: 'terracotta' as PDFThemeColor,
                  name: 'Heritage Terracotta',
                  bgChip: '#fdf9f8',
                  accentChip: '#a33325',
                  desc: 'Coastal tile red and raw earth tones.',
                  isCustom: false,
                },
              ].map((themeOpt) => {
                const isSelected = studioForm.pdfThemeColor === themeOpt.id;
                return (
                  <div
                    key={themeOpt.id}
                    onClick={() => canEdit && handleSelectPDFTheme(themeOpt.id)}
                    className={`p-3 border transition-all space-y-2 ${
                      canEdit ? 'cursor-pointer' : 'cursor-default'
                    } ${
                      isSelected
                        ? 'border-2 border-carbon dark:border-white bg-bone-surface dark:bg-obsidian-surface'
                        : 'border-bone-border dark:border-obsidian-border hover:border-carbon dark:hover:border-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: themeOpt.bgChip }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: themeOpt.accentChip }}
                        />
                      </div>
                      {isSelected && <Check size={13} className="text-vermillion" />}
                    </div>
                    <div>
                      <div className="font-bold text-carbon dark:text-white uppercase text-[11px]">{themeOpt.name}</div>
                      <p className="text-[10px] text-bone-muted dark:text-obsidian-muted mt-0.5">
                        {themeOpt.desc}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* 2. Customer Added Palettes */}
              {(studioForm.customPalettes || []).map((cp) => {
                const isSelected = studioForm.pdfThemeColor === cp.id;
                return (
                  <div
                    key={cp.id}
                    onClick={() => canEdit && handleSelectPDFTheme(cp.id)}
                    className={`p-3 border transition-all space-y-2 relative group ${
                      canEdit ? 'cursor-pointer' : 'cursor-default'
                    } ${
                      isSelected
                        ? 'border-2 border-carbon dark:border-white bg-bone-surface dark:bg-obsidian-surface'
                        : 'border-bone-border dark:border-obsidian-border hover:border-carbon dark:hover:border-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: cp.backgroundColor }}
                          title={`Background: ${cp.backgroundColor}`}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: cp.primaryColor }}
                          title={`Accent: ${cp.primaryColor}`}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        {isSelected && <Check size={13} className="text-vermillion" />}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomPalette(cp.id, e)}
                            className="p-0.5 text-bone-muted hover:text-vermillion transition-colors"
                            title="Delete custom color palette"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-carbon dark:text-white uppercase text-[11px] truncate">
                          {cp.name}
                        </span>
                        <span className="text-[8px] font-mono px-1 py-0.2 bg-carbon/10 dark:bg-white/10 text-bone-muted uppercase font-bold shrink-0">
                          Custom
                        </span>
                      </div>
                      <p className="text-[10px] text-bone-muted dark:text-obsidian-muted mt-0.5 truncate">
                        {cp.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Custom Color Palette Modal */}
          {showAddColorModal && canEdit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-carbon/80 dark:bg-black/80 backdrop-blur-sm animate-fadeIn">
              <div className="relative w-full max-w-md bg-bone-card dark:bg-obsidian-card border-2 border-carbon dark:border-white shadow-2xl p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-bone-border dark:border-obsidian-border">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-vermillion font-bold block">
                      Bespoke Brand Styling
                    </span>
                    <h2 className="text-xl font-serif font-black uppercase tracking-tight text-carbon dark:text-white">
                      Add Custom Theme Color
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddColorModal(false)}
                    className="px-2.5 py-1 text-xs font-mono border border-bone-border dark:border-obsidian-border hover:border-carbon dark:hover:border-white text-carbon dark:text-white transition-colors"
                  >
                    ✕ [Esc]
                  </button>
                </div>

                <form onSubmit={handleAddCustomPalette} className="space-y-3.5 text-xs font-mono">
                  <div>
                    <label className="block text-[10px] uppercase text-bone-muted mb-1">
                      Palette Name / Client Label
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Royal Emerald & Ivory, Panambur Indigo"
                      value={customPaletteName}
                      onChange={(e) => setCustomPaletteName(e.target.value)}
                      className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9.5px] uppercase text-bone-muted mb-1">
                        Accent / Brand
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customPrimaryColor}
                          onChange={(e) => setCustomPrimaryColor(e.target.value)}
                          className="w-8 h-8 rounded border border-bone-border cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          value={customPrimaryColor}
                          onChange={(e) => setCustomPrimaryColor(e.target.value)}
                          className="w-full p-1.5 text-[10px] bg-bone-surface dark:bg-obsidian-surface border border-bone-border uppercase font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9.5px] uppercase text-bone-muted mb-1">
                        Page Tint (Light)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customBgColor}
                          onChange={(e) => setCustomBgColor(e.target.value)}
                          className="w-8 h-8 rounded border border-bone-border cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          value={customBgColor}
                          onChange={(e) => setCustomBgColor(e.target.value)}
                          className="w-full p-1.5 text-[10px] bg-bone-surface dark:bg-obsidian-surface border border-bone-border uppercase font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9.5px] uppercase text-bone-muted mb-1">
                        Body Text
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customTextColor}
                          onChange={(e) => setCustomTextColor(e.target.value)}
                          className="w-8 h-8 rounded border border-bone-border cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          value={customTextColor}
                          onChange={(e) => setCustomTextColor(e.target.value)}
                          className="w-full p-1.5 text-[10px] bg-bone-surface dark:bg-obsidian-surface border border-bone-border uppercase font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-bone-muted mb-1">
                      Palette Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Crafted for high-contrast beach nuptials"
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white"
                    />
                  </div>

                  {/* Live Palette Card Preview */}
                  <div
                    className="p-3 border rounded-sm space-y-1.5"
                    style={{ backgroundColor: customBgColor, color: customTextColor }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-black uppercase text-xs" style={{ color: customPrimaryColor }}>
                        VOWS // Preview
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold" style={{ backgroundColor: customPrimaryColor, color: '#ffffff' }}>
                        SAMPLE
                      </span>
                    </div>
                    <p className="text-[10px] opacity-80 leading-tight">
                      This bespoke color combination will format all generated PDF invoices and quotations.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddColorModal(false)}
                      className="px-3.5 py-1.5 border border-bone-border dark:border-obsidian-border text-xs uppercase"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-1.5 bg-carbon text-bone dark:bg-white dark:text-carbon font-bold text-xs uppercase hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all"
                    >
                      Save & Activate Palette
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Studio Brand Info */}
          <div className="p-5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border space-y-4">
            <h3 className="font-serif text-base font-bold uppercase">Studio Profile & Contact Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1">
                  Studio Name
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={studioForm.studioName}
                  onChange={(e) => setStudioForm({ ...studioForm, studioName: e.target.value })}
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-bold disabled:opacity-75"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={studioForm.tagline}
                  onChange={(e) => setStudioForm({ ...studioForm, tagline: e.target.value })}
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white disabled:opacity-75"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1">
                  Studio City / Region
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={studioForm.city}
                  onChange={(e) => setStudioForm({ ...studioForm, city: e.target.value })}
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white disabled:opacity-75"
                />
              </div>

              {/* GSTIN: Optional with Checkbox */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase text-bone-muted dark:text-obsidian-muted">
                    GST Registration (Optional)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-mono">
                    <input
                      type="checkbox"
                      checked={studioForm.hasGst || false}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setStudioForm({
                          ...studioForm,
                          hasGst: e.target.checked,
                          gstin: e.target.checked ? studioForm.gstin || '29AABCL1984M1Z8' : '',
                        })
                      }
                      className="w-3.5 h-3.5 accent-vermillion rounded"
                    />
                    <span className="text-carbon dark:text-white font-bold">Enable GST</span>
                  </label>
                </div>

                {studioForm.hasGst ? (
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={studioForm.gstin || ''}
                    onChange={(e) => setStudioForm({ ...studioForm, gstin: e.target.value })}
                    placeholder="e.g. 29AABCL1984M1Z8"
                    className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white uppercase disabled:opacity-75"
                  />
                ) : (
                  <div className="p-2 bg-bone-surface dark:bg-obsidian-surface border border-dashed border-bone-border dark:border-obsidian-border text-[11px] text-bone-muted dark:text-obsidian-muted">
                    Small Enterprise / Micro-Business (GST Not Applicable)
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1">
                  Lead Contact Person
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={studioForm.contactPerson}
                  onChange={(e) => setStudioForm({ ...studioForm, contactPerson: e.target.value })}
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white uppercase font-bold disabled:opacity-75"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1">
                  Contact Phone / WhatsApp
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={studioForm.contactPhone}
                  onChange={(e) => setStudioForm({ ...studioForm, contactPhone: e.target.value })}
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white disabled:opacity-75"
                />
              </div>
            </div>

            {canEdit && (
              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-mono uppercase tracking-wider bg-carbon text-bone dark:bg-white dark:text-carbon hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all font-bold"
                >
                  Save Studio Information
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      {/* Tab 2: Banking Details */}
      {activeTab === 'banking' && (
        <form onSubmit={handleSaveStudioInfo} className="space-y-6 text-xs font-mono">
          <div className="p-5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border space-y-4">
            <div>
              <h3 className="font-serif text-base font-bold uppercase">Banking Remittance & Settlement Details</h3>
              <p className="text-[11px] text-bone-muted dark:text-obsidian-muted">
                These banking and UPI details print on Page 2 of generated Quotations and Invoices.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1">
                  Beneficiary Account Name
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={studioForm.bankingDetails.accountName}
                  onChange={(e) =>
                    setStudioForm({
                      ...studioForm,
                      bankingDetails: { ...studioForm.bankingDetails, accountName: e.target.value },
                    })
                  }
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-bold disabled:opacity-75"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={studioForm.bankingDetails.bankName}
                  onChange={(e) =>
                    setStudioForm({
                      ...studioForm,
                      bankingDetails: { ...studioForm.bankingDetails, bankName: e.target.value },
                    })
                  }
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white disabled:opacity-75"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1">
                  Branch Name / City
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={studioForm.bankingDetails.branch}
                  onChange={(e) =>
                    setStudioForm({
                      ...studioForm,
                      bankingDetails: { ...studioForm.bankingDetails, branch: e.target.value },
                    })
                  }
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white disabled:opacity-75"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={studioForm.bankingDetails.accountNumber}
                  onChange={(e) =>
                    setStudioForm({
                      ...studioForm,
                      bankingDetails: { ...studioForm.bankingDetails, accountNumber: e.target.value },
                    })
                  }
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-mono font-bold disabled:opacity-75"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={studioForm.bankingDetails.ifscCode}
                  onChange={(e) =>
                    setStudioForm({
                      ...studioForm,
                      bankingDetails: { ...studioForm.bankingDetails, ifscCode: e.target.value.toUpperCase() },
                    })
                  }
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-mono uppercase font-bold disabled:opacity-75"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1">
                  UPI VPA / QR Handle
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={studioForm.bankingDetails.upiId || ''}
                  onChange={(e) =>
                    setStudioForm({
                      ...studioForm,
                      bankingDetails: { ...studioForm.bankingDetails, upiId: e.target.value },
                    })
                  }
                  placeholder="e.g. vowsbyreuben@okaxis"
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white disabled:opacity-75"
                />
              </div>
            </div>

            {/* Advance Payment Policy */}
            <div className="p-4 sm:p-5 border-t border-bone-border dark:border-obsidian-border bg-bone-surface/40 dark:bg-obsidian-surface/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-vermillion uppercase font-bold block">
                    Financial Policies & Terms
                  </span>
                  <h4 className="font-serif text-base font-bold uppercase text-carbon dark:text-white">
                    Advance Payment / Retainer Policy
                  </h4>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={studioForm.advancePaymentEnabled ?? true}
                    onChange={(e) =>
                      setStudioForm({
                        ...studioForm,
                        advancePaymentEnabled: e.target.checked,
                        advancePaymentSettings: {
                          enabled: e.target.checked,
                          mode: studioForm.advancePaymentType || 'PERCENTAGE',
                          value: studioForm.advancePaymentPercentage || 50,
                        },
                      })
                    }
                    className="w-4 h-4 accent-vermillion rounded"
                  />
                  <span className="text-xs font-bold uppercase">
                    {(studioForm.advancePaymentEnabled ?? true) ? 'Policy Enabled' : 'Policy Disabled'}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1 font-bold">
                    Calculation Standard
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() =>
                        setStudioForm({
                          ...studioForm,
                          advancePaymentType: 'PERCENTAGE',
                          advancePaymentSettings: {
                            enabled: studioForm.advancePaymentEnabled ?? true,
                            mode: 'PERCENTAGE',
                            value: studioForm.advancePaymentPercentage || 50,
                          },
                        })
                      }
                      className={`py-2 text-center uppercase font-bold border transition-colors ${
                        (studioForm.advancePaymentType || 'PERCENTAGE') === 'PERCENTAGE'
                          ? 'bg-carbon text-bone dark:bg-white dark:text-carbon font-bold border-carbon dark:border-white'
                          : 'border-bone-border dark:border-obsidian-border text-bone-muted'
                      }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() =>
                        setStudioForm({
                          ...studioForm,
                          advancePaymentType: 'FIXED',
                          advancePaymentSettings: {
                            enabled: studioForm.advancePaymentEnabled ?? true,
                            mode: 'FIXED',
                            value: studioForm.advancePaymentFixedAmount || 25000,
                          },
                        })
                      }
                      className={`py-2 text-center uppercase font-bold border transition-colors ${
                        studioForm.advancePaymentType === 'FIXED'
                          ? 'bg-carbon text-bone dark:bg-white dark:text-carbon font-bold border-carbon dark:border-white'
                          : 'border-bone-border dark:border-obsidian-border text-bone-muted'
                      }`}
                    >
                      Fixed Amount (₹)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1 font-bold">
                    {(studioForm.advancePaymentType || 'PERCENTAGE') === 'PERCENTAGE'
                      ? 'Advance Percentage Required (%)'
                      : 'Fixed Retainer Amount (INR / ₹)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    disabled={!canEdit}
                    value={
                      (studioForm.advancePaymentType || 'PERCENTAGE') === 'PERCENTAGE'
                        ? studioForm.advancePaymentPercentage ?? 50
                        : studioForm.advancePaymentFixedAmount ?? 25000
                    }
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if ((studioForm.advancePaymentType || 'PERCENTAGE') === 'PERCENTAGE') {
                        setStudioForm({
                          ...studioForm,
                          advancePaymentPercentage: val,
                          advancePaymentSettings: {
                            enabled: studioForm.advancePaymentEnabled ?? true,
                            mode: 'PERCENTAGE',
                            value: val,
                          },
                        });
                      } else {
                        setStudioForm({
                          ...studioForm,
                          advancePaymentFixedAmount: val,
                          advancePaymentSettings: {
                            enabled: studioForm.advancePaymentEnabled ?? true,
                            mode: 'FIXED',
                            value: val,
                          },
                        });
                      }
                    }}
                    className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-mono font-bold disabled:opacity-75"
                  />
                  <span className="text-[10px] text-bone-muted dark:text-obsidian-muted mt-1 block">
                    Applied automatically to quotation proposals and milestone invoices.
                  </span>
                </div>
              </div>
            </div>

            {/* Custom Ledger Categories */}
            <div className="p-4 sm:p-5 border-t border-bone-border dark:border-obsidian-border bg-bone-surface/40 dark:bg-obsidian-surface/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-vermillion uppercase font-bold block">
                    Studio Accounting & General Ledger
                  </span>
                  <h4 className="font-serif text-base font-bold uppercase text-carbon dark:text-white">
                    Custom Ledger Categories
                  </h4>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {['CLIENT_RECEIVABLE', 'PRODUCTION_EXPENSE', 'GEAR_RENTAL', 'STUDIO_OVERHEAD', 'TALENT_PAYOUT', 'LOCATION_PERMIT', 'POST_COLOR_GRADE'].map((c) => (
                  <span key={c} className="px-2.5 py-1 text-[10px] uppercase font-mono bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border text-bone-muted">
                    {c.replace(/_/g, ' ')} <span className="text-[8px] text-vermillion">(built-in)</span>
                  </span>
                ))}
                {(studioForm.customLedgerCategories || []).map((cat) => (
                  <span key={cat} className="px-2.5 py-1 text-[10px] uppercase font-mono bg-bone-surface dark:bg-obsidian-surface border border-carbon dark:border-white text-carbon dark:text-white flex items-center gap-1.5 font-bold">
                    <span>{cat}</span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (studioForm.customLedgerCategories || []).filter((c) => c !== cat);
                          const nextForm = { ...studioForm, customLedgerCategories: updated };
                          setStudioForm(nextForm);
                          onUpdateSettings(nextForm);
                        }}
                        className="hover:text-vermillion transition-colors ml-1"
                        title="Delete custom category"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {canEdit && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Travel & Fuel, Drone Pilot Fee, Marketing..."
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    className="flex-1 p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = newCategoryInput.trim();
                      if (!trimmed) return;
                      const existing = studioForm.customLedgerCategories || [];
                      if (existing.includes(trimmed)) return;
                      const nextForm = { ...studioForm, customLedgerCategories: [...existing, trimmed] };
                      setStudioForm(nextForm);
                      onUpdateSettings(nextForm);
                      setNewCategoryInput('');
                    }}
                    className="px-4 py-2 bg-carbon text-bone dark:bg-white dark:text-carbon uppercase font-bold text-xs hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all"
                  >
                    Add Category
                  </button>
                </div>
              )}
            </div>

            {canEdit && (
              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-mono uppercase tracking-wider bg-carbon text-bone dark:bg-white dark:text-carbon hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all font-bold"
                >
                  Update Banking & Policies
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      {/* Tab 3: Terms & Conditions Management */}
      {activeTab === 'terms' && (
        <div className="space-y-5 text-xs font-mono">
          <div className="p-5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-serif text-base font-bold uppercase">Master Terms & Conditions</h3>
                <p className="text-[11px] text-bone-muted dark:text-obsidian-muted">
                  Clauses automatically embedded into all quotations and legal engagement documents.
                </p>
              </div>
              <span className="text-[11px] font-mono text-vermillion font-bold uppercase">
                {terms.length} Active Clauses
              </span>
            </div>

            {/* Add New Term Clause Input (Admin only) */}
            {canEdit && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTermText}
                  onChange={(e) => setNewTermText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTerm()}
                  placeholder="Type new contractual clause..."
                  className="flex-1 p-2 text-xs font-mono bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white focus:outline-none focus:border-carbon dark:focus:border-white"
                />
                <button
                  onClick={handleAddTerm}
                  disabled={!newTermText.trim()}
                  className="px-3 py-2 bg-carbon text-bone dark:bg-white dark:text-carbon font-mono text-xs uppercase tracking-wider hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all disabled:opacity-40 flex items-center gap-1 shrink-0"
                >
                  <Plus size={13} />
                  <span>Add Clause</span>
                </button>
              </div>
            )}

            {/* Terms List */}
            <div className="space-y-1.5 pt-1">
              {terms.map((term, index) => {
                const isEditing = editingTermIndex === index;
                return (
                  <div
                    key={index}
                    className="p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border flex items-start gap-2.5 group"
                  >
                    <span className="text-[10px] text-bone-muted dark:text-obsidian-muted font-bold pt-0.5 w-5 shrink-0">
                      {index + 1}.
                    </span>

                    {isEditing && canEdit ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editingTermText}
                          onChange={(e) => setEditingTermText(e.target.value)}
                          className="flex-1 p-1 bg-bone-card dark:bg-obsidian-card border border-carbon dark:border-white text-carbon dark:text-white text-xs font-mono focus:outline-none"
                        />
                        <button
                          onClick={handleSaveEditTerm}
                          className="px-2.5 py-1 bg-green-600 text-white text-[10px] uppercase font-bold flex items-center gap-1"
                        >
                          <Check size={11} />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => setEditingTermIndex(null)}
                          className="px-2 py-1 text-bone-muted hover:text-carbon dark:hover:text-white text-[10px] uppercase"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="flex-1 text-carbon dark:text-white leading-relaxed text-[11px]">{term}</p>
                        {canEdit && (
                          <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => handleStartEditTerm(index)}
                              className="p-1 hover:text-vermillion transition-colors"
                              title="Edit clause"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteTerm(index)}
                              className="p-1 text-bone-muted hover:text-vermillion transition-colors"
                              title="Delete clause"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: User Accounts & Granular Access Control */}
      {activeTab === 'users' && (
        <div className="space-y-5 text-xs font-mono">
          <div className="p-5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-base font-bold uppercase">Credential Management & Access Control</h3>
                <p className="text-[11px] text-bone-muted dark:text-obsidian-muted">
                  {canEdit
                    ? 'Administer staff accounts and assign selective access to finances, settings, and orders.'
                    : 'Inspection of active studio roster. Administrative credentials required to add or modify accounts.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPasswordInput('');
                    setNewPasswordInput('');
                    setConfirmPasswordInput('');
                    setPasswordError(null);
                    setPasswordSuccess(null);
                    setShowChangePasswordModal(true);
                  }}
                  className="px-3 py-1.5 border border-carbon dark:border-white text-carbon dark:text-white font-mono text-xs uppercase tracking-wider hover:bg-carbon hover:text-white dark:hover:bg-white dark:hover:text-carbon transition-all flex items-center gap-1.5 shrink-0 font-bold"
                >
                  <KeyRound size={13} className="text-vermillion" />
                  <span>Change My Password</span>
                </button>

                {canEdit && (
                  <button
                    onClick={handleOpenAddUser}
                    className="px-3.5 py-1.5 bg-carbon text-bone dark:bg-white dark:text-carbon font-mono text-xs uppercase tracking-wider hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all flex items-center gap-1.5 shrink-0 font-bold"
                  >
                    <Plus size={13} />
                    <span>Add User Account</span>
                  </button>
                )}
              </div>
            </div>

            {/* User Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {users.map((u) => {
                const isRoot = u.username === 'root' || u.id === 'usr-root' || u.username === 'admin' || u.username === 'system.admin';
                const isReuben = u.username === 'reuben' || u.fullName.toLowerCase().includes('reuben');
                const isCurrent = currentUser.id === u.id;
                const isViewerRoot = currentUser.username === 'root' || currentUser.username === 'admin' || currentUser.username === 'system.admin';
                const isViewerReuben = currentUser.username === 'reuben';
                const canManageLock = isViewerRoot || isViewerReuben;
                
                // Root password strictly hidden from Reuben and other crew
                // Reuben's password hidden from other crew (visible only to Root and Reuben himself)
                let displayedPassword = '••••••••••••';
                if (isRoot) {
                  displayedPassword = isViewerRoot ? u.password : '••••••••••••';
                } else if (isReuben) {
                  displayedPassword = (isViewerRoot || isViewerReuben) ? u.password : '••••••••••••';
                } else if (canEdit) {
                  displayedPassword = u.password;
                }

                return (
                  <div
                    key={u.id}
                    className={`p-4 bg-bone-surface dark:bg-obsidian-surface border ${
                      isCurrent
                        ? 'border-2 border-vermillion'
                        : u.isLocked
                        ? 'border-rose-500/50'
                        : 'border-bone-border dark:border-obsidian-border'
                    } flex flex-col justify-between space-y-3 relative`}
                  >
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      {u.isLocked && (
                        <span className="text-[8px] font-mono uppercase bg-rose-500/20 text-rose-500 px-1.5 py-0.5 font-bold border border-rose-500/30 flex items-center gap-1">
                          <Lock size={9} />
                          <span>Locked (503)</span>
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[8px] font-mono uppercase bg-vermillion text-white px-1.5 py-0.5 font-bold">
                          Logged In
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <User size={13} className="text-vermillion" />
                        <span className="font-bold text-xs text-carbon dark:text-white truncate">
                          {u.fullName}
                        </span>
                      </div>
                      <div className="text-bone-muted dark:text-obsidian-muted text-[10px]">
                        Username: <code className="text-carbon dark:text-white font-bold">@{u.username}</code>
                      </div>
                      <div className="text-bone-muted dark:text-obsidian-muted text-[10px]">
                        Role: <span className="font-bold uppercase text-carbon dark:text-white">{u.role.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="text-bone-muted dark:text-obsidian-muted text-[10px]">
                        Password:{' '}
                        <code className="text-carbon dark:text-white font-mono">
                          {displayedPassword}
                        </code>
                      </div>
                    </div>

                    {/* Permissions Matrix Pills */}
                    <div className="space-y-1 pt-2 border-t border-bone-border dark:border-obsidian-border text-[9px]">
                      <div className="flex items-center justify-between">
                        <span className="text-bone-muted">Financial Ledger:</span>
                        <span className={u.canViewFinances ? 'text-green-600 dark:text-green-400 font-bold' : 'text-vermillion'}>
                          {u.canViewFinances ? 'FULL' : 'HIDDEN'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-bone-muted">Studio Settings:</span>
                        <span className={u.canAccessSettings ? 'text-green-600 dark:text-green-400 font-bold' : 'text-vermillion'}>
                          {u.canAccessSettings ? 'EDIT' : 'VIEW ONLY'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-bone-muted">Quotes & Orders:</span>
                        <span className={u.canEditQuotesAndOrders ? 'text-green-600 dark:text-green-400 font-bold' : 'text-vermillion'}>
                          {u.canEditQuotesAndOrders ? 'EDIT' : 'VIEW ONLY'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-bone-muted">Edit Ledger:</span>
                        <span className={u.canEditLedger || u.role === 'ADMIN_ACCESS' || u.role === 'ADMIN_DIRECTOR' ? 'text-green-600 dark:text-green-400 font-bold' : 'text-vermillion'}>
                          {u.canEditLedger || u.role === 'ADMIN_ACCESS' || u.role === 'ADMIN_DIRECTOR' ? 'ALLOWED' : 'LOCKED'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-bone-muted">Delete Quotes:</span>
                        <span className={u.canDeleteQuotes ? 'text-green-600 dark:text-green-400 font-bold' : 'text-vermillion'}>
                          {u.canDeleteQuotes ? 'ALLOWED' : 'LOCKED'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-bone-muted">Dispatch Emails:</span>
                        <span className={u.canSendEmails ? 'text-green-600 dark:text-green-400 font-bold' : 'text-vermillion'}>
                          {u.canSendEmails ? 'ALLOWED' : 'LOCKED'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-bone-muted">Call Sheets & Gear:</span>
                        <span className={u.canViewCallSheets ? 'text-green-600 dark:text-green-400 font-bold' : 'text-vermillion'}>
                          {u.canViewCallSheets ? 'ALLOWED' : 'LOCKED'}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {canEdit && (
                      <div className="pt-2 border-t border-bone-border dark:border-obsidian-border flex items-center justify-end gap-1.5">
                        {canManageLock && (
                          <button
                            type="button"
                            onClick={() => handleToggleUserLock(u)}
                            disabled={isCurrent || (currentUser.username === 'reuben' && isRoot)}
                            className={`px-2 py-0.5 text-[10px] border font-mono font-bold transition-all flex items-center gap-1 ${
                              u.isLocked
                                ? 'border-rose-500/50 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20'
                                : 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                            title={
                              isCurrent
                                ? 'You cannot lock your own account'
                                : u.isLocked
                                ? 'Unlock account (permit login)'
                                : 'Lock account (stealth 503 rejection)'
                            }
                          >
                            {u.isLocked ? <Lock size={10} className="text-rose-500" /> : <Unlock size={10} className="text-emerald-500" />}
                            <span>{u.isLocked ? 'Unlock' : 'Lock (503)'}</span>
                          </button>
                        )}

                        {(!isRoot || isViewerRoot) && (
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="px-2 py-0.5 text-[10px] border border-bone-border dark:border-obsidian-border hover:border-carbon dark:hover:border-white transition-all flex items-center gap-1"
                          >
                            <Edit3 size={10} />
                            <span>Edit</span>
                          </button>
                        )}

                        {!isRoot && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="px-2 py-0.5 text-[10px] text-vermillion hover:bg-vermillion/10 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Gear Catalog Management */}
      {activeTab === 'gear' && (
        <div className="space-y-6 text-xs font-mono animate-fadeIn">
          {/* Header */}
          <div className="p-5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-vermillion font-bold">
              <Camera size={14} />
              <span>Technical Production & Cinematography Kit</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-serif font-black uppercase text-carbon dark:text-white">
                  Studio Gear & Rental Inventory
                </h2>
                <p className="text-xs text-bone-muted dark:text-obsidian-muted mt-1">
                  Manage cinema bodies, primes, zooms, lighting, and aerial drone kits available for shoot allocation and crew call sheets.
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setShowAddGearModal(true)}
                  className="px-4 py-2 bg-carbon text-bone dark:bg-white dark:text-carbon uppercase tracking-wider font-bold hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Plus size={13} />
                  <span>Add Gear Asset</span>
                </button>
              )}
            </div>
          </div>

          {/* Gear Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(studioForm.gearInventory || defaultGearInventory).map((item) => (
              <div
                key={item.id}
                className="p-4 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[9px] uppercase px-2 py-0.5 font-bold font-mono border border-bone-border dark:border-obsidian-border text-vermillion">
                    {item.category}
                  </span>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      const existing = studioForm.gearInventory || defaultGearInventory;
                      const updated = existing.map((g) =>
                        g.id === item.id ? { ...g, available: !g.available } : g
                      );
                      const nextForm = { ...studioForm, gearInventory: updated };
                      setStudioForm(nextForm);
                      onUpdateSettings(nextForm);
                    }}
                    className={`text-[9px] uppercase px-2 py-0.5 font-bold border transition-colors ${
                      item.available
                        ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                        : 'border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10'
                    }`}
                  >
                    {item.available ? 'Ready / In Studio' : 'Deployed / In Field'}
                  </button>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-carbon dark:text-white">{item.name}</h4>
                  {item.notes && (
                    <p className="text-[10px] text-bone-muted dark:text-obsidian-muted mt-1">{item.notes}</p>
                  )}
                </div>
                {canEdit && (
                  <div className="pt-2 border-t border-bone-border dark:border-obsidian-border flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Remove "${item.name}" from gear inventory?`)) {
                          const existing = studioForm.gearInventory || defaultGearInventory;
                          const updated = existing.filter((g) => g.id !== item.id);
                          const nextForm = { ...studioForm, gearInventory: updated };
                          setStudioForm(nextForm);
                          onUpdateSettings(nextForm);
                        }
                      }}
                      className="p-1 text-bone-muted hover:text-vermillion transition-colors"
                      title="Delete gear asset"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Access Control & Security Matrix */}
      {activeTab === 'access' && (
        <div className="space-y-6 text-xs font-mono animate-fadeIn">
          {/* Active Identity Card */}
          <div className="p-5 sm:p-6 bg-bone-card dark:bg-obsidian-card border-2 border-carbon dark:border-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-vermillion font-bold">
                Currently Authenticated Identity
              </span>
              <h3 className="text-2xl font-serif font-bold uppercase text-carbon dark:text-white">
                {currentUser.fullName}
              </h3>
              <p className="text-xs font-mono text-bone-muted dark:text-obsidian-muted">
                Username: <code className="text-carbon dark:text-white font-bold">@{currentUser.username}</code> | Assigned Role:{' '}
                <span className="font-bold uppercase text-carbon dark:text-white">{currentUser.role}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setCurrentPasswordInput('');
                  setNewPasswordInput('');
                  setConfirmPasswordInput('');
                  setPasswordError(null);
                  setPasswordSuccess(null);
                  setShowChangePasswordModal(true);
                }}
                className="px-3.5 py-1.5 bg-carbon text-bone dark:bg-white dark:text-carbon font-mono text-xs uppercase tracking-wider hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all flex items-center gap-1.5 font-bold"
              >
                <KeyRound size={13} className="text-vermillion" />
                <span>Change Password</span>
              </button>
              <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 font-mono text-xs uppercase font-bold">
                Engine Session Active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 sm:p-6 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold uppercase text-carbon dark:text-white">
                  Director (Root Principal)
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-vermillion text-white font-bold">
                  Full Read / Write
                </span>
              </div>
              <p className="text-xs font-mono text-bone-muted dark:text-obsidian-muted">
                Full cryptographic control over dual general ledger, client billing, shoot pricing, catalog templates, and master call sheets.
              </p>
              <ul className="space-y-2 text-xs font-mono">
                <li className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle size={14} /> <span>General Ledger RLS bypass</span>
                </li>
                <li className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle size={14} /> <span>Create / Modify / Void Invoices & Quotes</span>
                </li>
                <li className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle size={14} /> <span>Add / Edit User Credentials & Permissions</span>
                </li>
                <li className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle size={14} /> <span>Studio Catalog, Deliverables & Requirements Admin</span>
                </li>
              </ul>
              <div className="pt-2">
                <div className="w-full py-2 text-center text-xs font-mono uppercase tracking-widest border border-bone-border dark:border-obsidian-border bg-bone-surface dark:bg-obsidian-surface text-bone-muted dark:text-obsidian-muted font-bold">
                  {currentUser.role === 'ADMIN_DIRECTOR' ? 'Active Authenticated Role' : 'Admin Credentials Required'}
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold uppercase text-carbon dark:text-white">
                  Second Unit / Crew
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-carbon/10 dark:bg-white/10 font-bold">
                  Restricted Call Sheets
                </span>
              </div>
              <p className="text-xs font-mono text-bone-muted dark:text-obsidian-muted">
                Confined strictly to schedule timeline, call times, location coordinates, and equipment allocations. Financial ledgers remain obfuscated.
              </p>
              <ul className="space-y-2 text-xs font-mono">
                <li className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle size={14} /> <span>Read-only access to assigned call sheets</span>
                </li>
                <li className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle size={14} /> <span>Edit call sheet checklist & delivery notes</span>
                </li>
                <li className="flex items-center gap-2 text-vermillion">
                  <Lock size={14} /> <span>Financial retainers & ledger hidden</span>
                </li>
                <li className="flex items-center gap-2 text-vermillion">
                  <Lock size={14} /> <span>Studio settings & credentials locked</span>
                </li>
              </ul>
              <div className="pt-2">
                <div className="w-full py-2 text-center text-xs font-mono uppercase tracking-widest border border-bone-border dark:border-obsidian-border bg-bone-surface dark:bg-obsidian-surface text-bone-muted dark:text-obsidian-muted font-bold">
                  Assigned to Crew Unit
                </div>
              </div>
            </div>
          </div>

          {/* Root & Developer Granular Access Manipulation Matrix */}
          {(currentUser.username === 'root' || currentUser.username === 'admin') && (
            <div className="p-5 sm:p-6 bg-bone-card dark:bg-obsidian-card border-2 border-vermillion space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-bone-border dark:border-obsidian-border pb-3">
                <div>
                  <div className="flex items-center gap-2 text-vermillion font-bold uppercase tracking-widest text-[10px]">
                    <ShieldCheck size={14} />
                    <span>Root Principal Security Command</span>
                  </div>
                  <h3 className="font-serif text-lg font-bold uppercase text-carbon dark:text-white">
                    Master User Access & Permission Overrides
                  </h3>
                  <p className="text-[11px] text-bone-muted dark:text-obsidian-muted">
                    Supreme directorship: Dynamically configure, restrict, or lock any studio user account (including Reuben Serrao) with immediate synchronization.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-vermillion/10 text-vermillion border border-vermillion/30 font-bold self-start sm:self-auto">
                  SUPERUSER LEVEL
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[720px] text-xs font-mono">
                  <thead>
                    <tr className="border-b border-bone-border dark:border-obsidian-border bg-bone-surface/70 dark:bg-obsidian-surface/80 text-[10px] uppercase tracking-wider text-bone-muted dark:text-obsidian-muted">
                      <th className="py-2.5 px-3">Crew Identity</th>
                      <th className="py-2.5 px-3">Role Elevation</th>
                      <th className="py-2.5 px-3 text-center">Finances</th>
                      <th className="py-2.5 px-3 text-center">Settings</th>
                      <th className="py-2.5 px-3 text-center">Quotes & Orders</th>
                      <th className="py-2.5 px-3 text-center">Ledger</th>
                      <th className="py-2.5 px-3 text-center">Account Lock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bone-border dark:divide-obsidian-border">
                    {users.map((u) => {
                      const isTargetRoot = u.username === 'root' || u.id === 'usr-root';
                      const isTargetCurrent = u.id === currentUser.id;
                      return (
                        <tr key={u.id} className="hover:bg-bone-surface/40 dark:hover:bg-obsidian-surface/40 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-carbon dark:text-white flex items-center gap-1.5">
                              <span>{u.fullName}</span>
                              {isTargetRoot && (
                                <span className="text-[9px] px-1 py-0.2 bg-vermillion text-white font-bold">ROOT</span>
                              )}
                              {u.isLocked && (
                                <span className="text-[9px] px-1 py-0.2 bg-rose-500/20 text-rose-500 font-bold border border-rose-500/40">503 LOCK</span>
                              )}
                            </div>
                            <div className="text-[10px] text-bone-muted dark:text-obsidian-muted">
                              @{u.username}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <select
                              value={u.role}
                              disabled={isTargetRoot && !isTargetCurrent}
                              onChange={(e) => handleOverrideUserPermission(u.id, 'role', e.target.value as UserRole)}
                              className="bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white text-[11px] p-1 font-mono uppercase focus:outline-none"
                            >
                              <option value="ADMIN_DIRECTOR">Director (Admin)</option>
                              <option value="PRODUCER">Producer</option>
                              <option value="SECOND_SHOOTER">Second Shooter</option>
                            </select>
                          </td>

                          {/* Finances Toggle */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOverrideUserPermission(u.id, 'canViewFinances', !u.canViewFinances)}
                              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                                u.canViewFinances
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                              }`}
                            >
                              {u.canViewFinances ? 'ALLOWED' : 'REVOKED'}
                            </button>
                          </td>

                          {/* Settings Toggle */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOverrideUserPermission(u.id, 'canAccessSettings', !u.canAccessSettings)}
                              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                                u.canAccessSettings
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                              }`}
                            >
                              {u.canAccessSettings ? 'EDIT' : 'VIEW ONLY'}
                            </button>
                          </td>

                          {/* Quotes & Orders Toggle */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOverrideUserPermission(u.id, 'canEditQuotesAndOrders', !u.canEditQuotesAndOrders)}
                              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                                u.canEditQuotesAndOrders
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                              }`}
                            >
                              {u.canEditQuotesAndOrders ? 'EDIT' : 'VIEW ONLY'}
                            </button>
                          </td>

                          {/* Ledger Toggle */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOverrideUserPermission(u.id, 'canEditLedger', !u.canEditLedger)}
                              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                                u.canEditLedger
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                              }`}
                            >
                              {u.canEditLedger ? 'ALLOWED' : 'LOCKED'}
                            </button>
                          </td>

                          {/* Account Lock Toggle */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleUserLock(u)}
                              disabled={isTargetCurrent}
                              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors flex items-center justify-center gap-1 mx-auto ${
                                u.isLocked
                                  ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40'
                                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              } disabled:opacity-30 disabled:cursor-not-allowed`}
                            >
                              {u.isLocked ? <Lock size={11} /> : <Unlock size={11} />}
                              <span>{u.isLocked ? 'LOCKED' : 'ACTIVE'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="p-4 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-carbon dark:text-white uppercase">User Accounts & Granular Permissions</p>
              <p className="text-[11px] text-bone-muted dark:text-obsidian-muted">
                Configure passwords, roles, and granular toggle flags for staff members in the credentials panel.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className="px-4 py-2 bg-carbon text-bone dark:bg-white dark:text-carbon text-xs font-mono uppercase tracking-wider font-bold hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all flex items-center gap-2 shrink-0"
            >
              <KeyRound size={14} />
              <span>Go to User Credentials Tab</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 7: Studio Automations & Cloud Integrations */}
      {activeTab === 'integrations' && (
        <div className="space-y-6 text-xs font-mono animate-fadeIn">
          {/* Section Header */}
          <div className="p-5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-vermillion font-bold">
              <Cloud size={14} />
              <span>Cloud Architecture & Automated Pipelines</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-black uppercase text-carbon dark:text-white">
              Automations & External Sync
            </h2>
            <p className="text-xs text-bone-muted dark:text-obsidian-muted">
              Connect external client touchpoints directly to VOWS Studio: automatic Google Forms intake, Google Drive client folder synchronization, and cloud PostgreSQL persistence.
            </p>
          </div>

          {/* Email Template Settings */}
          <div className="p-5 sm:p-6 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border space-y-4">
            <div className="border-b border-bone-border dark:border-obsidian-border pb-3 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-vermillion/10 text-vermillion border border-vermillion/30 font-bold inline-block">
                  Automated Correspondence
                </span>
                <h3 className="text-lg font-serif font-bold uppercase text-carbon dark:text-white mt-1">
                  Client Quotation & Email Dispatch Template
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="block text-[10px] uppercase text-bone-muted mb-1 font-bold">
                  Email Header Title
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={studioForm.emailTemplate?.headingTitle || 'VOWS'}
                  onChange={(e) =>
                    setStudioForm({
                      ...studioForm,
                      emailTemplate: {
                        headingTitle: e.target.value,
                        tagline: studioForm.emailTemplate?.tagline || 'Wedding Cinematics & Stills',
                        subjectLine: studioForm.emailTemplate?.subjectLine || 'Proposal & Quotation — VOWS',
                        bodyTemplate: studioForm.emailTemplate?.bodyTemplate || 'Thank you for reaching out to VOWS. Please find attached our bespoke proposal and quotation for your celebration.',
                      },
                    })
                  }
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white disabled:opacity-75 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-bone-muted mb-1 font-bold">
                  Email Subheader / Tagline
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={studioForm.emailTemplate?.tagline || 'Wedding Cinematics & Stills'}
                  onChange={(e) =>
                    setStudioForm({
                      ...studioForm,
                      emailTemplate: {
                        headingTitle: studioForm.emailTemplate?.headingTitle || 'VOWS',
                        tagline: e.target.value,
                        subjectLine: studioForm.emailTemplate?.subjectLine || 'Proposal & Quotation — VOWS',
                        bodyTemplate: studioForm.emailTemplate?.bodyTemplate || 'Thank you for reaching out to VOWS. Please find attached our bespoke proposal and quotation for your celebration.',
                      },
                    })
                  }
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white disabled:opacity-75"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase text-bone-muted mb-1 font-bold">
                  Default Email Subject
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={studioForm.emailTemplate?.subjectLine || 'Proposal & Quotation — VOWS'}
                  onChange={(e) =>
                    setStudioForm({
                      ...studioForm,
                      emailTemplate: {
                        headingTitle: studioForm.emailTemplate?.headingTitle || 'VOWS',
                        tagline: studioForm.emailTemplate?.tagline || 'Wedding Cinematics & Stills',
                        subjectLine: e.target.value,
                        bodyTemplate: studioForm.emailTemplate?.bodyTemplate || 'Thank you for reaching out to VOWS. Please find attached our bespoke proposal and quotation for your celebration.',
                      },
                    })
                  }
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white disabled:opacity-75"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase text-bone-muted mb-1 font-bold">
                  Email Message Body Template
                </label>
                <textarea
                  rows={3}
                  disabled={!canEdit}
                  value={studioForm.emailTemplate?.bodyTemplate || 'Thank you for reaching out to VOWS. Please find attached our bespoke proposal and quotation for your celebration.'}
                  onChange={(e) =>
                    setStudioForm({
                      ...studioForm,
                      emailTemplate: {
                        headingTitle: studioForm.emailTemplate?.headingTitle || 'VOWS',
                        tagline: studioForm.emailTemplate?.tagline || 'Wedding Cinematics & Stills',
                        subjectLine: studioForm.emailTemplate?.subjectLine || 'Proposal & Quotation — VOWS',
                        bodyTemplate: e.target.value,
                      },
                    })
                  }
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white resize-none disabled:opacity-75 leading-relaxed"
                />
              </div>
            </div>

            {canEdit && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings(studioForm);
                    showSuccessFeedback();
                  }}
                  className="px-4 py-2 bg-carbon text-bone dark:bg-white dark:text-carbon uppercase font-bold text-xs hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all"
                >
                  Save Email Template
                </button>
              </div>
            )}
          </div>

          {/* Integration 1: Google Form Webhook Intake */}
          <div className="p-5 sm:p-6 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-bone-border dark:border-obsidian-border">
              <div className="space-y-1">
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold inline-block">
                  Automated Intake Webhook
                </span>
                <h3 className="text-lg font-serif font-bold uppercase text-carbon dark:text-white">
                  1. Google Form Direct Client Ingest
                </h3>
              </div>
              <span className="text-[10px] font-mono text-bone-muted dark:text-obsidian-muted">
                Endpoint: <code className="text-carbon dark:text-white font-bold">/api/webhooks/google-form</code>
              </span>
            </div>

            <p className="text-xs text-bone-muted dark:text-obsidian-muted leading-relaxed">
              When prospective clients fill out your Google Form enquiry questionnaire, submissions automatically stream into your <strong>Quotations & Enquiries CRM</strong> in real-time. No manual data entry required.
            </p>

            {/* Live Webhook URL Box */}
            <div className="p-3 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-bone-muted dark:text-obsidian-muted block">
                Target Webhook Endpoint URL:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : 'https://vows-studio.vercel.app'}/api/webhooks/google-form`}
                  className="flex-1 p-2 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-mono text-[11px] select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/api/webhooks/google-form`;
                    navigator.clipboard.writeText(url);
                    setCopiedWebhookUrl(true);
                    setTimeout(() => setCopiedWebhookUrl(false), 2000);
                  }}
                  className="px-3.5 py-2 bg-carbon text-bone dark:bg-white dark:text-carbon font-mono text-xs uppercase tracking-wider hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all flex items-center gap-1.5 font-bold shrink-0"
                >
                  {copiedWebhookUrl ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedWebhookUrl ? 'Copied' : 'Copy URL'}</span>
                </button>
              </div>
            </div>

            {/* Google Apps Script Code Block */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-bone-muted dark:text-obsidian-muted flex items-center gap-1.5">
                  <Code2 size={13} className="text-vermillion" />
                  <span>Google Apps Script (Paste into Form Script Editor)</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const scriptCode = `/**
 * VOWS STUDIO // GOOGLE APPS SCRIPT FOR FORM SUBMISSIONS
 * Automatically streams Google Form entries into VOWS Studio CRM.
 */
const WEBHOOK_URL = "${typeof window !== 'undefined' ? window.location.origin : 'https://vows-studio.vercel.app'}/api/webhooks/google-form";
const WEBHOOK_SECRET = "vows_intake_secret_2026";

function onFormSubmit(e) {
  try {
    const itemResponses = e.response.getItemResponses();
    const payload = {
      secret: WEBHOOK_SECRET,
      clientName: "",
      phone: "",
      email: "",
      eventType: "",
      eventDate: "",
      city: "",
      budget: "",
      notes: ""
    };

    for (let i = 0; i < itemResponses.length; i++) {
      const item = itemResponses[i];
      const title = item.getItem().getTitle().toLowerCase();
      const answer = item.getResponse();

      if (title.includes("name")) {
        payload.clientName = answer;
      } else if (title.includes("phone") || title.includes("whatsapp") || title.includes("contact")) {
        payload.phone = answer;
      } else if (title.includes("email")) {
        payload.email = answer;
      } else if (title.includes("event") || title.includes("type") || title.includes("shoot")) {
        payload.eventType = answer;
      } else if (title.includes("date")) {
        payload.eventDate = answer;
      } else if (title.includes("venue") || title.includes("city") || title.includes("location")) {
        payload.city = answer;
      } else if (title.includes("budget") || title.includes("investment")) {
        payload.budget = answer;
      } else {
        payload.notes += (payload.notes ? "\\n" : "") + item.getItem().getTitle() + ": " + answer;
      }
    }

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    Logger.log("VOWS Webhook Dispatched. Response: " + response.getResponseCode());
  } catch (err) {
    Logger.log("Error posting to VOWS: " + err.toString());
  }
}`;
                    navigator.clipboard.writeText(scriptCode);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 2500);
                  }}
                  className="px-3 py-1 bg-carbon text-bone dark:bg-white dark:text-carbon text-[10px] uppercase font-bold hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all flex items-center gap-1"
                >
                  {copiedScript ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedScript ? 'Copied to Clipboard' : 'Copy Entire Script'}</span>
                </button>
              </div>

              <pre className="p-3 bg-carbon text-bone-muted dark:bg-[#070808] dark:text-[#a0aba5] border border-bone-border dark:border-obsidian-border text-[10.5px] font-mono overflow-x-auto max-h-56 select-all leading-relaxed">
{`// 1. Open your Google Form > 3 Dots Menu > Script Editor
// 2. Paste this script, replace URL with your live studio domain
// 3. Click Triggers icon (clock) > Add Trigger > onFormSubmit on "On form submit"`}
              </pre>
            </div>

            {/* Field Mapping Guide */}
            <div className="p-3 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border space-y-2">
              <span className="text-[10px] uppercase font-bold text-carbon dark:text-white block">
                Automatic Field Matching Matrix:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px]">
                <div className="p-2 border border-bone-border dark:border-obsidian-border bg-bone-card dark:bg-obsidian-card">
                  <span className="text-bone-muted block text-[9px]">FORM FIELD</span>
                  <span className="font-bold">Full Name</span>
                  <span className="text-emerald-600 dark:text-emerald-400 block text-[9px] mt-1">➔ Client Name</span>
                </div>
                <div className="p-2 border border-bone-border dark:border-obsidian-border bg-bone-card dark:bg-obsidian-card">
                  <span className="text-bone-muted block text-[9px]">FORM FIELD</span>
                  <span className="font-bold">Phone / WhatsApp</span>
                  <span className="text-emerald-600 dark:text-emerald-400 block text-[9px] mt-1">➔ Mobile (+91)</span>
                </div>
                <div className="p-2 border border-bone-border dark:border-obsidian-border bg-bone-card dark:bg-obsidian-card">
                  <span className="text-bone-muted block text-[9px]">FORM FIELD</span>
                  <span className="font-bold">Email Address</span>
                  <span className="text-emerald-600 dark:text-emerald-400 block text-[9px] mt-1">➔ 1-Click Quotes</span>
                </div>
                <div className="p-2 border border-bone-border dark:border-obsidian-border bg-bone-card dark:bg-obsidian-card">
                  <span className="text-bone-muted block text-[9px]">FORM FIELD</span>
                  <span className="font-bold">Date & Venue</span>
                  <span className="text-emerald-600 dark:text-emerald-400 block text-[9px] mt-1">➔ Event Timeline</span>
                </div>
              </div>
            </div>
          </div>

          {/* Integration 2: Google Drive Auto-Archival by Client ID */}
          <div className="p-5 sm:p-6 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-bone-border dark:border-obsidian-border">
              <div className="space-y-1">
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-bold inline-block">
                  Document Archival Engine
                </span>
                <h3 className="text-lg font-serif font-bold uppercase text-carbon dark:text-white">
                  2. Google Drive Storage Segregation by Client ID
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle size={13} />
                <span>Client ID Folder Routing Active</span>
              </span>
            </div>

            <p className="text-xs text-bone-muted dark:text-obsidian-muted leading-relaxed">
              Every quotation and invoice generated for clients is automatically archived into a structured directory tree organized by each client’s unique code and identity:
            </p>

            <div className="p-3 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border font-mono text-xs text-carbon dark:text-white space-y-1">
              <div className="text-vermillion font-bold">📁 VOWS Studio / Clients /</div>
              <div className="pl-4 text-bone-muted dark:text-obsidian-muted">
                └── 📁 <span className="text-carbon dark:text-white font-bold">[Client ID] - [Client Name]</span> /
              </div>
              <div className="pl-8 text-[11px] text-emerald-600 dark:text-emerald-400">
                ├── 📄 Q-2026-001_Client_Proposal.pdf
              </div>
              <div className="pl-8 text-[11px] text-emerald-600 dark:text-emerald-400">
                └── 📄 INV-2026-0102_Tax_Invoice.pdf
              </div>
            </div>

            <div className="p-3 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border space-y-2">
              <span className="text-[10px] uppercase font-bold text-carbon dark:text-white block">
                Google Cloud Service Account Configuration (.env.local):
              </span>
              <ul className="space-y-1 text-[11px] text-bone-muted dark:text-obsidian-muted">
                <li>• <code className="text-carbon dark:text-white font-bold">GOOGLE_DRIVE_CLIENT_EMAIL</code>: Service Account email from Google Cloud Console</li>
                <li>• <code className="text-carbon dark:text-white font-bold">GOOGLE_DRIVE_PRIVATE_KEY</code>: RSA Private Key from Service Account JSON key</li>
                <li>• <code className="text-carbon dark:text-white font-bold">GOOGLE_DRIVE_ROOT_FOLDER_ID</code>: Target Google Drive folder ID shared with Service Account</li>
              </ul>
              <p className="text-[10px] text-bone-muted italic pt-1">
                Note: If Google Cloud credentials are not yet configured, the system gracefully falls back to local storage and browser downloads without breaking any workflow.
              </p>
            </div>
          </div>

          {/* Integration 3: Supabase Cloud Database */}
          <div className="p-5 sm:p-6 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-bone-border dark:border-obsidian-border">
              <div className="space-y-1">
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-bold inline-block">
                  Relational Cloud DB
                </span>
                <h3 className="text-lg font-serif font-bold uppercase text-carbon dark:text-white">
                  3. Supabase Cloud Database & Schema Setup
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  const schemaSQL = `-- ==============================================================================
-- VOWS STUDIO OS — SUPABASE RELATIONAL SCHEMA
-- Photography & Cinema Operating Engine & CRM // Owned by Reuben Serrao
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & CREW AUTH MATRIX
CREATE TABLE IF NOT EXISTS public.lumina_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'SECOND_SHOOTER',
  can_view_finances BOOLEAN NOT NULL DEFAULT false,
  can_access_settings BOOLEAN NOT NULL DEFAULT false,
  can_edit_quotes_and_orders BOOLEAN NOT NULL DEFAULT false,
  can_edit_ledger BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. STUDIO SETTINGS
CREATE TABLE IF NOT EXISTS public.lumina_settings (
  id TEXT PRIMARY KEY DEFAULT 'studio_settings',
  studio_name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  city TEXT NOT NULL,
  has_gst BOOLEAN DEFAULT false,
  gstin TEXT DEFAULT '',
  banking_details JSONB NOT NULL,
  contact_person TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  terms_and_conditions JSONB NOT NULL,
  pdf_theme_color TEXT DEFAULT 'sage',
  custom_palettes JSONB DEFAULT '[]'::jsonb,
  crew_roster JSONB DEFAULT '[]'::jsonb,
  ui_theme TEXT DEFAULT 'slate',
  package_requirements JSONB DEFAULT '[]'::jsonb,
  package_deliverables JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. QUOTATIONS
CREATE TABLE IF NOT EXISTS public.lumina_quotations (
  id TEXT PRIMARY KEY,
  quotation_number TEXT NOT NULL,
  date TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_city TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  package_title TEXT NOT NULL,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
  crew_allocation JSONB NOT NULL DEFAULT '[]'::jsonb,
  terms_and_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_price NUMERIC NOT NULL,
  advance_percentage NUMERIC DEFAULT 50,
  hide_breakup BOOLEAN DEFAULT false,
  drive_file_url TEXT,
  status TEXT NOT NULL DEFAULT 'SENT',
  enquiry_id TEXT,
  booking_id TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 4. ENQUIRIES CRM
CREATE TABLE IF NOT EXISTS public.lumina_enquiries (
  id TEXT PRIMARY KEY,
  enquiry_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT NOT NULL,
  event_date TEXT NOT NULL,
  event_type TEXT NOT NULL,
  estimated_budget NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW',
  notes TEXT,
  quotation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 5. SHOOT BOOKINGS & CALL SHEETS
CREATE TABLE IF NOT EXISTS public.lumina_bookings (
  id TEXT PRIMARY KEY,
  shoot_code TEXT NOT NULL,
  title TEXT NOT NULL,
  client JSONB NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  call_time TEXT NOT NULL,
  location JSONB NOT NULL,
  production_team JSONB NOT NULL DEFAULT '[]'::jsonb,
  financial_summary JSONB NOT NULL,
  schedule_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  gear_allocated JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_stage TEXT DEFAULT 'RAW_INGESTED',
  hard_drive_received BOOLEAN DEFAULT false,
  client_selection_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 6. GENERAL LEDGER
CREATE TABLE IF NOT EXISTS public.lumina_ledger (
  id TEXT PRIMARY KEY,
  transaction_ref TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  counterparty TEXT NOT NULL,
  related_shoot_code TEXT,
  status TEXT NOT NULL DEFAULT 'CLEARED',
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 7. INVOICES
CREATE TABLE IF NOT EXISTS public.lumina_invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL,
  production_fee_tax NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  balance_due NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNPAID',
  quotation_id TEXT,
  drive_file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 8. CLIENT FEEDBACK REVIEWS
CREATE TABLE IF NOT EXISTS public.lumina_feedback (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  shoot_id TEXT,
  event_date TEXT,
  event_type TEXT,
  rating INTEGER NOT NULL DEFAULT 5,
  service_ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  review TEXT NOT NULL,
  highlights TEXT,
  allow_social_sharing BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Real-time publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.lumina_users, public.lumina_settings, public.lumina_quotations, public.lumina_enquiries, public.lumina_bookings, public.lumina_ledger, public.lumina_invoices, public.lumina_feedback;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- SEED ACCOUNTS
INSERT INTO public.lumina_users (id, username, password, full_name, role, can_view_finances, can_access_settings, can_edit_quotes_and_orders, can_edit_ledger, is_locked)
VALUES 
  ('usr-root', 'root', 'vowsroot2026', 'System Admin', 'ADMIN_ACCESS', true, true, true, true, false),
  ('usr-reuben', 'reuben', 'vowsreuben2026', 'Reuben Serrao (Director)', 'ADMIN_ACCESS', true, true, true, true, false)
ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password;`;
                  navigator.clipboard.writeText(schemaSQL);
                  setCopiedSchema(true);
                  setTimeout(() => setCopiedSchema(false), 2500);
                }}
                className="px-3.5 py-1.5 bg-carbon text-bone dark:bg-white dark:text-carbon font-mono text-xs uppercase tracking-wider hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all flex items-center gap-1.5 font-bold"
              >
                {copiedSchema ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedSchema ? 'SQL Copied to Clipboard' : 'Copy Supabase schema.sql'}</span>
              </button>
            </div>

            <p className="text-xs text-bone-muted dark:text-obsidian-muted leading-relaxed">
              When creating your new Supabase project, paste the copied SQL schema directly into your <strong>Supabase SQL Editor</strong> and hit <em>Run</em>. It creates all production tables, sets up real-time websocket broadcasting, and configures the Director and System Admin accounts.
            </p>

            <div className="p-3 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border space-y-2">
              <span className="text-[10px] uppercase font-bold text-carbon dark:text-white block">
                Supabase Environment Keys (.env.local):
              </span>
              <div className="space-y-1 text-[11px] font-mono text-bone-muted dark:text-obsidian-muted">
                <div><code>NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</code></div>
                <div><code>NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsIn...</code></div>
                <div><code>SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsIn...</code></div>
              </div>
            </div>
          </div>

          {/* Integration 4: Operational Data Cleanse & Purge */}
          <div className="p-5 sm:p-6 bg-bone-card dark:bg-obsidian-card border border-rose-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-500/20">
              <div className="space-y-1">
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold inline-block">
                  Database Cleanse Engine
                </span>
                <h3 className="text-lg font-serif font-bold uppercase text-carbon dark:text-white">
                  4. Operational Data Cleanse & Purge
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClearAllDataModal(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 font-bold shrink-0"
              >
                <Trash2 size={13} />
                <span>Clear All Data</span>
              </button>
            </div>

            <p className="text-xs text-bone-muted dark:text-obsidian-muted leading-relaxed">
              Permanently delete all operational records (quotations, enquiries, bookings/call sheets, invoices, general ledger transactions, and client feedback) across Supabase Cloud and local browser cache. Preserves your studio settings, banking credentials, GST setup, and crew accounts intact.
            </p>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal (Admin only) */}
      {isUserModalOpen && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-carbon/80 dark:bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-bone-card dark:bg-obsidian-card border-2 border-carbon dark:border-white shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-bone-border dark:border-obsidian-border">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-vermillion font-bold mb-1">
                  <ShieldCheck size={12} />
                  <span>Credential & Permissions Authority</span>
                </div>
                <h2 className="text-xl font-serif font-black uppercase tracking-tight text-carbon dark:text-white">
                  {editingUser ? `Edit Account: @${editingUser.username}` : 'Register New Studio User'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="px-2.5 py-1 text-xs font-mono border border-bone-border dark:border-obsidian-border hover:border-carbon dark:hover:border-white text-carbon dark:text-white transition-colors"
              >
                ✕ [Esc]
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="block text-[10px] uppercase text-bone-muted mb-1 font-bold">
                  Full Name / Title
                </label>
                <input
                  type="text"
                  value={userFormData.fullName}
                  onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                  placeholder="e.g. Joyline Sequeira (Second Shooter)"
                  required
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-bone-muted mb-1 font-bold">
                    Username
                  </label>
                  <input
                    type="text"
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                    placeholder="e.g. joyline"
                    required
                    disabled={editingUser?.username === 'admin' || editingUser?.username === 'root' || editingUser?.username === 'system.admin'}
                    className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white disabled:opacity-50 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-bone-muted mb-1 font-bold">
                    Password
                  </label>
                  <input
                    type="text"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    placeholder="Enter password"
                    required
                    className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-bone-muted mb-1 font-bold">
                  Primary Role
                </label>
                <select
                  value={userFormData.role}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    if (newRole === 'PRODUCT_DEMO') {
                      setUserFormData({
                        ...userFormData,
                        role: newRole,
                        canViewFinances: false,
                        canAccessSettings: false,
                      });
                    } else if (newRole === 'ADMIN_ACCESS' || newRole === 'ADMIN_DIRECTOR') {
                      setUserFormData({
                        ...userFormData,
                        role: newRole,
                        canViewFinances: true,
                        canAccessSettings: true,
                        canEditQuotesAndOrders: true,
                        canEditLedger: true,
                        canDeleteQuotes: true,
                        canSendEmails: true,
                        canViewCallSheets: true,
                        canExportPDFs: true,
                      });
                    } else {
                      setUserFormData({ ...userFormData, role: newRole });
                    }
                  }}
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white uppercase font-bold"
                >
                  <option value="ADMIN_ACCESS">Admin Director (Full Access)</option>
                  <option value="CREW">Crew Member (Field Production)</option>
                  <option value="PRODUCT_DEMO">Product Demo (Confidential Masking Mode)</option>
                  <option value="SECOND_SHOOTER">Second Unit / Crew</option>
                  <option value="PRODUCER">Production Producer</option>
                </select>
                {userFormData.role === 'PRODUCT_DEMO' && (
                  <span className="text-[10px] text-amber-500 font-mono mt-1 block">
                    🔒 Demo Mode: Client names, contact info, and financials are masked automatically for safe client pitching.
                  </span>
                )}
              </div>

              {/* Selective Access Control Toggles */}
              <div className="p-3 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border space-y-2.5">
                <span className="text-[10px] uppercase tracking-wider text-vermillion font-bold block">
                  Selective Permission Matrix
                </span>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={userFormData.canViewFinances}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, canViewFinances: e.target.checked })
                    }
                    className="w-3.5 h-3.5 accent-vermillion rounded"
                  />
                  <div>
                    <span className="font-bold text-carbon dark:text-white block text-[11px]">
                      Financial Visibility (Ledger & Revenue)
                    </span>
                    <span className="text-[9px] text-bone-muted block">
                      If unchecked, financial totals, margins, and the General Ledger are hidden.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={userFormData.canAccessSettings}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, canAccessSettings: e.target.checked })
                    }
                    className="w-3.5 h-3.5 accent-vermillion rounded"
                  />
                  <div>
                    <span className="font-bold text-carbon dark:text-white block text-[11px]">
                      Edit Studio Settings & Manage Users
                    </span>
                    <span className="text-[9px] text-bone-muted block">
                      If unchecked, user has read-only view of settings and cannot manage accounts.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={userFormData.canEditQuotesAndOrders}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, canEditQuotesAndOrders: e.target.checked })
                    }
                    className="w-3.5 h-3.5 accent-vermillion rounded"
                  />
                  <div>
                    <span className="font-bold text-carbon dark:text-white block text-[11px]">
                      Edit Quotations & Orders
                    </span>
                    <span className="text-[9px] text-bone-muted block">
                      If unchecked, quotations and orders can only be viewed in read-only mode.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={userFormData.canEditLedger}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, canEditLedger: e.target.checked })
                    }
                    className="w-3.5 h-3.5 accent-vermillion rounded"
                  />
                  <div>
                    <span className="font-bold text-carbon dark:text-white block text-[11px]">
                      Edit & Record Ledger Transactions
                    </span>
                    <span className="text-[9px] text-bone-muted block">
                      Allows staff to modify, create, and delete entries in the General Ledger.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={userFormData.canDeleteQuotes}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, canDeleteQuotes: e.target.checked })
                    }
                    className="w-3.5 h-3.5 accent-vermillion rounded"
                  />
                  <div>
                    <span className="font-bold text-carbon dark:text-white block text-[11px]">
                      Delete Quotations
                    </span>
                    <span className="text-[9px] text-bone-muted block">
                      Allows user to permanently delete previously generated quotations.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={userFormData.canSendEmails}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, canSendEmails: e.target.checked })
                    }
                    className="w-3.5 h-3.5 accent-vermillion rounded"
                  />
                  <div>
                    <span className="font-bold text-carbon dark:text-white block text-[11px]">
                      Dispatch Quotation Emails
                    </span>
                    <span className="text-[9px] text-bone-muted block">
                      Allows sending official proposal emails directly to client inboxes.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={userFormData.canViewCallSheets}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, canViewCallSheets: e.target.checked })
                    }
                    className="w-3.5 h-3.5 accent-vermillion rounded"
                  />
                  <div>
                    <span className="font-bold text-carbon dark:text-white block text-[11px]">
                      View Call Sheets & Gear Allocations
                    </span>
                    <span className="text-[9px] text-bone-muted block">
                      Allows inspection of production timelines and allocated gear kits.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={userFormData.canExportPDFs}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, canExportPDFs: e.target.checked })
                    }
                    className="w-3.5 h-3.5 accent-vermillion rounded"
                  />
                  <div>
                    <span className="font-bold text-carbon dark:text-white block text-[11px]">
                      Export & Download PDFs
                    </span>
                    <span className="text-[9px] text-bone-muted block">
                      Permits exporting Proposal and Invoice PDFs locally or to Google Drive.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-3.5 py-1.5 border border-bone-border dark:border-obsidian-border text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-carbon text-bone dark:bg-white dark:text-carbon font-bold text-xs uppercase hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Gear Asset Modal */}
      {showAddGearModal && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-carbon/80 dark:bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-bone-card dark:bg-obsidian-card border-2 border-carbon dark:border-white shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-bone-border dark:border-obsidian-border">
              <div>
                <span className="text-[10px] font-mono text-vermillion uppercase font-bold block">
                  Studio Kit Inventory
                </span>
                <h3 className="text-lg font-serif font-black uppercase text-carbon dark:text-white">
                  Add Production Gear
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddGearModal(false)}
                className="px-2.5 py-1 text-xs font-mono border border-bone-border dark:border-obsidian-border hover:border-carbon dark:hover:border-white text-carbon dark:text-white transition-colors"
              >
                ✕ [Esc]
              </button>
            </div>

            <form onSubmit={handleAddGearItem} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="block text-[10px] uppercase text-bone-muted mb-1 font-bold">
                  Gear Item Name
                </label>
                <input
                  type="text"
                  required
                  value={newGearName}
                  onChange={(e) => setNewGearName(e.target.value)}
                  placeholder="e.g. Sony FE 24-70mm f/2.8 GM II"
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-bone-muted mb-1 font-bold">
                  Category
                </label>
                <select
                  value={newGearCategory}
                  onChange={(e) => setNewGearCategory(e.target.value as any)}
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white uppercase font-bold"
                >
                  <option value="BODY">BODY (Camera / Cine Line)</option>
                  <option value="LENS">LENS (Prime / Zoom Optics)</option>
                  <option value="LIGHTING">LIGHTING (Strobe / Continuous LED)</option>
                  <option value="DRONE">DRONE (Aerial Cinema)</option>
                  <option value="AUDIO">AUDIO (Wireless Mic / Lav Kit)</option>
                  <option value="SUPPORT">SUPPORT (Gimbal / Tripod / Rig)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-bone-muted mb-1 font-bold">
                  Notes / Serial (Optional)
                </label>
                <input
                  type="text"
                  value={newGearNotes}
                  onChange={(e) => setNewGearNotes(e.target.value)}
                  placeholder="e.g. Primary Wedding Stills Rig / SN: 847291"
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-bone-border dark:border-obsidian-border">
                <button
                  type="button"
                  onClick={() => setShowAddGearModal(false)}
                  className="px-3.5 py-1.5 border border-bone-border dark:border-obsidian-border text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-carbon text-bone dark:bg-white dark:text-carbon font-bold text-xs uppercase hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all"
                >
                  Save Gear Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Reset Sample Data Confirmation Modal */}
      {showResetModal && onResetSampleData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-carbon/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-bone-card dark:bg-obsidian-card border-2 border-vermillion p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-bone-border dark:border-obsidian-border">
              <div className="flex items-center gap-2 text-vermillion">
                <AlertCircle size={18} />
                <h3 className="font-serif text-lg font-bold uppercase">
                  Reset Sample Data
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-2.5 py-1 text-xs font-mono border border-bone-border dark:border-obsidian-border hover:border-carbon dark:hover:border-white text-carbon dark:text-white transition-colors"
              >
                ✕ [Esc]
              </button>
            </div>

            <p className="text-xs font-mono text-carbon dark:text-white leading-relaxed">
              Are you sure you want to reload the updated <strong>2026 Mangalore Studio Presets</strong>?
            </p>
            <p className="text-[11px] font-mono text-bone-muted dark:text-obsidian-muted leading-relaxed">
              This refreshes all sample quotations (strictly below ₹45,000), client enquiries, confirmed shoot production schedules, invoices, and general ledger transactions with realistic coastal Mangalore venues (St. Aloysius Chapel, TMA Pai, Summer Sands, Ocean Pearl).
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-bone-border dark:border-obsidian-border text-xs font-mono uppercase">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-3.5 py-1.5 border border-bone-border dark:border-obsidian-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetSampleData();
                  setShowResetModal(false);
                  showSuccessFeedback();
                }}
                className="px-4 py-1.5 bg-vermillion text-white font-bold hover:bg-vermillion/90 transition-all flex items-center gap-1.5"
              >
                <RotateCcw size={13} />
                <span>Confirm & Reset Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change My Password Modal (Logged-In User) */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-carbon/80 dark:bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-bone-card dark:bg-obsidian-card border-2 border-carbon dark:border-white shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-bone-border dark:border-obsidian-border">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-vermillion font-bold mb-0.5">
                  <KeyRound size={12} />
                  <span>Security Credential Update</span>
                </div>
                <h3 className="font-serif text-lg font-bold uppercase text-carbon dark:text-white">
                  Change My Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(false)}
                className="px-2.5 py-1 text-xs font-mono border border-bone-border dark:border-obsidian-border hover:border-carbon dark:hover:border-white text-carbon dark:text-white transition-colors"
              >
                ✕ [Esc]
              </button>
            </div>

            <div className="text-[11px] font-mono text-bone-muted dark:text-obsidian-muted">
              Authenticated user: <strong className="text-carbon dark:text-white font-bold">{currentUser.fullName}</strong> (<code className="text-vermillion font-bold">@{currentUser.username}</code>)
            </div>

            {passwordError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-mono flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-2.5 bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-xs font-mono flex items-center gap-2">
                <Check size={14} className="shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangeMyPassword} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase text-bone-muted dark:text-obsidian-muted">
                    New Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPasswordEye(!showPasswordEye)}
                    className="text-[10px] text-bone-muted hover:text-carbon dark:hover:text-white flex items-center gap-1"
                  >
                    {showPasswordEye ? <EyeOff size={11} /> : <Eye size={11} />}
                    <span>{showPasswordEye ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  type={showPasswordEye ? 'text' : 'password'}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-bone-muted dark:text-obsidian-muted mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showPasswordEye ? 'text' : 'password'}
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Re-type new password"
                  required
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-bone-border dark:border-obsidian-border">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="px-3.5 py-1.5 border border-bone-border dark:border-obsidian-border uppercase text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-carbon text-bone dark:bg-white dark:text-carbon font-bold uppercase hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all text-xs"
                >
                  Update My Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Operational Data Wipe Confirmation Modal */}
      {showClearAllDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-carbon/80 dark:bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-bone-card dark:bg-obsidian-card border-2 border-rose-500 shadow-2xl p-5 sm:p-6 space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-rose-500/30">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider">
                <AlertCircle size={18} />
                <span className="font-serif text-base">Wipe All Operational Studio Data</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowClearAllDataModal(false);
                  setClearDataInput('');
                }}
                className="px-2.5 py-1 text-xs font-mono border border-bone-border dark:border-obsidian-border hover:border-carbon dark:hover:border-white text-carbon dark:text-white transition-colors"
              >
                ✕ [Esc]
              </button>
            </div>

            <div className="p-3.5 bg-rose-500/10 border-l-4 border-rose-500 text-rose-700 dark:text-rose-300 space-y-1.5 text-xs">
              <p className="font-bold uppercase tracking-wide">⚠️ Permanent Data Purge Notice</p>
              <p className="text-[11px] leading-relaxed">
                This action will permanently delete all operational records from Supabase Cloud and local offline storage:
              </p>
              <ul className="list-disc list-inside text-[10.5px] space-y-0.5 pt-1 text-carbon dark:text-white font-bold">
                <li>All Quotations & Client Proposals</li>
                <li>All Client Enquiries & Google Form Submissions</li>
                <li>All Shoot Bookings, Call Sheets & Production Days</li>
                <li>All Tax Invoices & Retainer Records</li>
                <li>All General Ledger Transactions (Receivables & Expenses)</li>
                <li>All Client Feedback & Reviews</li>
              </ul>
            </div>

            <div className="p-3 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-[11px] text-bone-muted dark:text-obsidian-muted">
              🔒 <strong className="text-carbon dark:text-white">Preserved Safely:</strong> Studio settings, banking credentials, GST terms, and user accounts & passwords will remain intact.
            </div>

            {wipeSuccessNotice && (
              <div className="p-2.5 bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-xs flex items-center gap-2">
                <Check size={14} className="shrink-0" />
                <span>{wipeSuccessNotice}</span>
              </div>
            )}

            <form onSubmit={handleExecuteDataWipe} className="space-y-4 pt-1">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-bone-muted dark:text-obsidian-muted mb-1.5">
                  To confirm purge, type <strong className="text-rose-600 dark:text-rose-400 font-mono">CLEAR ALL DATA</strong> below:
                </label>
                <input
                  type="text"
                  value={clearDataInput}
                  onChange={(e) => setClearDataInput(e.target.value)}
                  placeholder="CLEAR ALL DATA"
                  autoFocus
                  required
                  className="w-full p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-rose-500/50 text-carbon dark:text-white font-mono font-bold tracking-widest text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-bone-border dark:border-obsidian-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowClearAllDataModal(false);
                    setClearDataInput('');
                  }}
                  className="px-3.5 py-1.5 border border-bone-border dark:border-obsidian-border uppercase text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={clearDataInput.trim() !== 'CLEAR ALL DATA' || isWipingData}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase transition-all text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>{isWipingData ? 'Purging Records...' : 'Confirm Operational Purge'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
