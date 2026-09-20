'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Download,
  CheckCircle,
  ArrowRight,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Layers,
  Sparkles,
  DollarSign,
  CreditCard,
  Trash2,
  Edit3,
  HardDrive,
  Camera,
  Check,
  ShieldAlert,
  ArrowUpRight,
  Search,
  Lock,
  X,
  Users,
  Sliders,
  CloudUpload,
} from 'lucide-react';
import {
  Quotation,
  Enquiry,
  ShootBooking,
  Invoice,
  LedgerEntry,
  QuotationItem,
  DeliverableItem,
  CrewRequirement,
  DeliveryStage,
  StudioSettings,
  UserAccount,
} from '@/types';
import { defaultCatalog, CatalogTemplate, defaultGearInventory } from '@/lib/catalogDefaults';
import {
  generateQuotationPDF,
  getQuotationPDFBase64,
  getQuotationPDFBlob,
  resolvePDFPalette,
  generateClientCallSheetPDF,
  generateCrewCallSheetPDF,
} from '@/lib/pdfGenerator';
import { formatCurrencyINR, maskClientName, maskPhone, maskEmail, maskAmount } from '@/lib/formatters';

interface QuotationViewProps {
  quotations: Quotation[];
  enquiries: Enquiry[];
  bookings: ShootBooking[];
  invoices: Invoice[];
  settings: StudioSettings;
  currentUser: UserAccount;
  onAddQuotation: (quote: Quotation) => void;
  onUpdateQuotation: (quote: Quotation) => void;
  onDeleteQuotation?: (quoteId: string) => void;
  onAddEnquiry: (enquiry: Enquiry) => void;
  onUpdateEnquiry?: (enquiry: Enquiry) => void;
  onUpdateBooking?: (booking: ShootBooking) => void;
  onConvertQuotationToBooking: (quote: Quotation) => void;
  onRecordPayment: (payment: {
    reference: string;
    amount: number;
    paymentMethod: string;
    relatedShootCode?: string;
    clientName: string;
    notes?: string;
  }) => void;
  onUpdateBookingDelivery: (
    bookingId: string,
    updates: {
      deliveryStage?: DeliveryStage;
      hardDriveReceived?: boolean;
      clientSelectionDone?: boolean;
    }
  ) => void;
}

export const QuotationView: React.FC<QuotationViewProps> = ({
  quotations,
  enquiries,
  bookings,
  invoices,
  settings,
  currentUser,
  onAddQuotation,
  onUpdateQuotation,
  onDeleteQuotation,
  onAddEnquiry,
  onUpdateEnquiry,
  onUpdateBooking,
  onConvertQuotationToBooking,
  onRecordPayment,
  onUpdateBookingDelivery,
}) => {
  const isDemo = currentUser.role === 'PRODUCT_DEMO';
  const [activeTab, setActiveTab] = useState<'enquiries' | 'quotations' | 'orders'>(
    'enquiries'
  );
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(quotations[0] || null);

  useEffect(() => {
    if (quotations.length > 0) {
      if (!selectedQuote || !quotations.some((q) => q.id === selectedQuote.id)) {
        setSelectedQuote(quotations[0]);
      }
    } else {
      setSelectedQuote(null);
    }
  }, [quotations, selectedQuote]);
  const [searchQuery, setSearchQuery] = useState('');

  // Catalog State (editable by Admin)
  const [catalog, setCatalog] = useState<CatalogTemplate>(defaultCatalog);
  const [newReqName, setNewReqName] = useState('');
  const [newDelivItem, setNewDelivItem] = useState('');
  const [newDelivDetail, setNewDelivDetail] = useState('');

  // New Enquiry Modal State
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [enqClientName, setEnqClientName] = useState('');
  const [enqPhone, setEnqPhone] = useState('');
  const [enqEmail, setEnqEmail] = useState('');
  const [enqCity, setEnqCity] = useState('Mangalore');
  const [enqDate, setEnqDate] = useState(new Date().toISOString().split('T')[0]);
  const [enqType, setEnqType] = useState(''); // Empty default as per instruction
  const [enqBudget, setEnqBudget] = useState('38000');
  const [enqNotes, setEnqNotes] = useState('');

  // Edit Enquiry Modal State
  const [showEditEnquiryModal, setShowEditEnquiryModal] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState<Enquiry | null>(null);
  const [editEnqClientName, setEditEnqClientName] = useState('');
  const [editEnqPhone, setEditEnqPhone] = useState('');
  const [editEnqEmail, setEditEnqEmail] = useState('');
  const [editEnqCity, setEditEnqCity] = useState('Mangalore');
  const [editEnqDate, setEditEnqDate] = useState('');
  const [editEnqType, setEditEnqType] = useState('');
  const [editEnqBudget, setEditEnqBudget] = useState('38000');
  const [editEnqNotes, setEditEnqNotes] = useState('');

  // Call Sheet Modal State (For Orders & Deliverables)
  const [showCallSheetModal, setShowCallSheetModal] = useState(false);
  const [callSheetBooking, setCallSheetBooking] = useState<ShootBooking | null>(null);
  const [allocatedGears, setAllocatedGears] = useState<string[]>([]);
  const [callSheetSaveNotice, setCallSheetSaveNotice] = useState<string | null>(null);

  // Create / Edit Quotation Modal State
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [isEditingQuote, setIsEditingQuote] = useState(false);
  const [editQuoteId, setEditQuoteId] = useState<string | null>(null);

  const [qNumber, setQNumber] = useState(`Q NO. 0${quotations.length + 7}`);
  const todayFormattedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const [qDate, setQDate] = useState(todayFormattedDate);
  const [qClientName, setQClientName] = useState('');
  const [qClientCity, setQClientCity] = useState('Mangalore');
  const [qClientPhone, setQClientPhone] = useState('');
  const [qClientEmail, setQClientEmail] = useState('');
  const [qPackageTitle, setQPackageTitle] = useState('PACKAGE');
  const [qTotalPrice, setQTotalPrice] = useState('38000');
  const [qAdvancePct, setQAdvancePct] = useState(50);
  const [qRequirements, setQRequirements] = useState<QuotationItem[]>(catalog.standardRequirements);
  const [qDeliverables, setQDeliverables] = useState<DeliverableItem[]>(catalog.standardDeliverables);
  const [qHideBreakup, setQHideBreakup] = useState(false);

  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('Proposal & Quotation — VOWS');
  const [emailCustomMessage, setEmailCustomMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState<string | null>(null);

  // Drive Upload State
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveSuccessMsg, setDriveSuccessMsg] = useState<string | null>(null);

  // Helper to resolve initial crew allocation from studio settings or default catalog
  const getCrewFromSettings = (): CrewRequirement[] => {
    if (settings.crewRoster && settings.crewRoster.length > 0) {
      return settings.crewRoster.map((c) => ({
        id: c.id,
        role: c.role.replace(/\s*\([^)]*\)/g, '').trim(),
        number: 1, // 1 person per crew item
        assignedTo: undefined, // confidential
      }));
    }
    return catalog.standardCrew.map((c) => ({
      ...c,
      role: c.role.replace(/\s*\([^)]*\)/g, '').trim(),
      number: 1,
    }));
  };

  const [qCrew, setQCrew] = useState<CrewRequirement[]>(getCrewFromSettings);
  const [selectedRosterRoleToAdd, setSelectedRosterRoleToAdd] = useState('');
  const [customCrewRoleInput, setCustomCrewRoleInput] = useState('');

  // Manual Payment Entry Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('19000');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentNotes, setPaymentNotes] = useState('50% Advance booking confirmation');
  const [paymentTargetQuote, setPaymentTargetQuote] = useState<Quotation | null>(null);

  // Global Escape Key listener to immediately close any open modal (Point 18)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowQuoteModal(false);
        setShowEnquiryModal(false);
        setShowEditEnquiryModal(false);
        setShowPaymentModal(false);
        setShowEmailModal(false);
        setShowCallSheetModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatINR = (val: number | string | undefined | null) => {
    if (!currentUser.canViewFinances) return 'Rs. ••••••/-';
    if (isDemo) return maskAmount(val, true);
    return formatCurrencyINR(val);
  };

  const handleCreateEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enqClientName) return;

    const newEnq: Enquiry = {
      id: `enq-${Date.now()}`,
      enquiryNumber: `ENQ-2026-${Math.floor(100 + Math.random() * 900)}`,
      clientName: enqClientName,
      phone: enqPhone || '+91 98450 12849',
      email: enqEmail || `${enqClientName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      city: enqCity,
      eventDate: enqDate,
      eventType: enqType,
      estimatedBudget: Math.min(44000, parseFloat(enqBudget) || 38000),
      status: 'NEW',
      notes: enqNotes,
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddEnquiry(newEnq);
    setShowEnquiryModal(false);
    resetEnquiryForm();
  };

  const resetEnquiryForm = () => {
    setEnqClientName('');
    setEnqPhone('');
    setEnqEmail('');
    setEnqCity('Mangalore');
    setEnqBudget('38000');
    setEnqNotes('');
  };

  const handleOpenEditEnquiry = (enq: Enquiry) => {
    setEditingEnquiry(enq);
    setEditEnqClientName(enq.clientName);
    setEditEnqPhone(enq.phone);
    setEditEnqEmail(enq.email);
    setEditEnqCity(enq.city);
    setEditEnqDate(enq.eventDate);
    setEditEnqType(enq.eventType);
    setEditEnqBudget(enq.estimatedBudget.toString());
    setEditEnqNotes(enq.notes || '');
    setShowEditEnquiryModal(true);
  };

  const handleSaveEditEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEnquiry || !editEnqClientName) return;

    const updatedEnq: Enquiry = {
      ...editingEnquiry,
      clientName: editEnqClientName,
      phone: editEnqPhone,
      email: editEnqEmail,
      city: editEnqCity,
      eventDate: editEnqDate,
      eventType: editEnqType,
      estimatedBudget: parseFloat(editEnqBudget) || 38000,
      notes: editEnqNotes,
    };

    if (onUpdateEnquiry) {
      onUpdateEnquiry(updatedEnq);
    }
    setShowEditEnquiryModal(false);
    setEditingEnquiry(null);
  };

  // Launch pre-filled quote from enquiry
  const handleLaunchQuoteFromEnquiry = (enquiry: Enquiry) => {
    setIsEditingQuote(false);
    setEditQuoteId(null);
    setQNumber(`Q NO. 0${quotations.length + 8}`);
    setQClientName(enquiry.clientName);
    setQClientCity(enquiry.city);
    setQClientPhone(enquiry.phone);
    setQClientEmail(enquiry.email);
    setQTotalPrice(Math.min(44000, enquiry.estimatedBudget).toString());
    setQPackageTitle(enquiry.eventType.toUpperCase().includes('WEDDING') ? 'WEDDING PACKAGE' : 'PACKAGE');
    setQRequirements(catalog.standardRequirements);
    setQDeliverables(catalog.standardDeliverables);
    setQCrew(getCrewFromSettings());
    setShowQuoteModal(true);
  };

  const handleOpenCreateQuote = () => {
    setIsEditingQuote(false);
    setEditQuoteId(null);
    setQNumber(`Q NO. 0${quotations.length + 8}`);
    setQClientName('');
    setQClientCity('Mangalore');
    setQClientPhone('');
    setQTotalPrice('38000');
    setQRequirements(catalog.standardRequirements);
    setQDeliverables(catalog.standardDeliverables);
    setQCrew(getCrewFromSettings());
    setShowQuoteModal(true);
  };

  // Launch editor for existing quote
  const handleOpenEditQuote = (quote: Quotation) => {
    setIsEditingQuote(true);
    setEditQuoteId(quote.id);
    setQNumber(quote.quotationNumber);
    setQDate(quote.date);
    setQClientName(quote.clientName);
    setQClientCity(quote.clientCity);
    setQClientPhone(quote.clientPhone || '');
    setQClientEmail(quote.clientEmail || '');
    setQPackageTitle(quote.packageTitle);
    setQTotalPrice(quote.totalPrice.toString());
    setQAdvancePct(quote.advancePercentage || 50);
    setQRequirements(quote.requirements);
    setQDeliverables(quote.deliverables);
    setQCrew(quote.crewAllocation);
    setQHideBreakup(!!quote.hideBreakup);
    setShowQuoteModal(true);
  };

  // Save quotation (either new or updated existing)
  const handleSaveQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qClientName) return;

    const parsedPrice = Math.max(1000, parseFloat(qTotalPrice) || 38000);

    if (isEditingQuote && editQuoteId) {
      const existing = quotations.find((q) => q.id === editQuoteId);
      const updatedQuote: Quotation = {
        ...existing!,
        quotationNumber: qNumber,
        date: qDate,
        clientName: qClientName,
        clientCity: qClientCity,
        clientPhone: qClientPhone,
        clientEmail: qClientEmail,
        packageTitle: qPackageTitle,
        requirements: qRequirements,
        deliverables: qDeliverables,
        crewAllocation: qCrew,
        totalPrice: parsedPrice,
        advancePercentage: qAdvancePct,
        hideBreakup: qHideBreakup,
      };

      onUpdateQuotation(updatedQuote);
      setSelectedQuote(updatedQuote);
    } else {
      const createdQuote: Quotation = {
        id: `q-${Date.now()}`,
        quotationNumber: qNumber,
        date: qDate,
        clientName: qClientName,
        clientCity: qClientCity,
        clientPhone: qClientPhone,
        clientEmail: qClientEmail,
        packageTitle: qPackageTitle,
        requirements: qRequirements,
        deliverables: qDeliverables,
        crewAllocation: qCrew,
        termsAndConditions: settings.termsAndConditions || catalog.standardTerms,
        totalPrice: parsedPrice,
        advancePercentage: qAdvancePct,
        hideBreakup: qHideBreakup,
        status: 'SENT',
        contactPerson: settings.contactPerson,
        contactPhone: settings.contactPhone,
      };

      onAddQuotation(createdQuote);
      setSelectedQuote(createdQuote);
    }

    setShowQuoteModal(false);
  };

  // Open Email Quotation Modal
  const handleOpenEmailModal = (quote: Quotation) => {
    setEmailRecipient(quote.clientEmail || '');
    setEmailSubject('Proposal & Quotation — VOWS');
    setEmailCustomMessage(
      `Thank you for reaching out to VOWS. Attached is our bespoke quotation and coverage plan for your upcoming event.\n\nPackage: ${quote.packageTitle}\nInvestment: Rs. ${Number(quote.totalPrice).toLocaleString('en-IN')}/-\nAdvance: ${quote.advancePercentage}% secures your dates on our production schedule.\n\nLooking forward to capturing timeless frames with you.\n\nWarm regards,\nReuben Serrao\nVOWS // Wedding Cinematics & Stills\n+91 93800 57445`
    );
    setEmailStatusMsg(null);
    setShowEmailModal(true);
  };

  // Dispatch Quotation Email
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRecipient || !selectedQuote) return;

    setIsSendingEmail(true);
    setEmailStatusMsg(null);

    try {
      const pdfBase64 = getQuotationPDFBase64(selectedQuote, settings);
      const res = await fetch('/api/quotation/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailRecipient,
          clientName: selectedQuote.clientName,
          quotationNumber: selectedQuote.quotationNumber,
          packageTitle: selectedQuote.packageTitle,
          totalPrice: selectedQuote.totalPrice,
          customMessage: emailCustomMessage,
          pdfBase64,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEmailStatusMsg(data.message || 'Quotation email sent successfully!');
        setTimeout(() => {
          setShowEmailModal(false);
          setEmailStatusMsg(null);
        }, 2200);
      } else {
        setEmailStatusMsg(`Error: ${data.error || 'Failed to dispatch email'}`);
      }
    } catch (err: any) {
      setEmailStatusMsg(`Network error: ${err?.message || 'Check connection'}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Save Quotation to Google Drive (Segregated in Client ID folder)
  const handleSaveQuotationToDrive = async (quote: Quotation) => {
    setIsUploadingToDrive(true);
    setDriveSuccessMsg(null);

    try {
      const pdfBase64 = getQuotationPDFBase64(quote, settings);
      const clientId = quote.enquiryId || quote.bookingId || `CLI-${quote.quotationNumber.replace(/[^0-9]/g, '') || '01'}`;
      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientName: quote.clientName,
          docType: 'QUOTATION',
          fileName: `Proposal for ${quote.clientName}.pdf`,
          pdfBase64,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const updated = { ...quote, driveFileUrl: data.fileUrl };
        onUpdateQuotation(updated);
        setSelectedQuote(updated);
        setDriveSuccessMsg(data.message || `Archived to Drive under folder "${data.folderName}"`);
        setTimeout(() => setDriveSuccessMsg(null), 5000);
      } else {
        alert(`Google Drive Upload Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Network error saving to Google Drive: ${err?.message}`);
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetQuote || !paymentAmount) return;

    const amt = parseFloat(paymentAmount);
    onRecordPayment({
      reference: `REC-${Date.now().toString().slice(-4)}`,
      amount: amt,
      paymentMethod,
      relatedShootCode: paymentTargetQuote.quotationNumber,
      clientName: paymentTargetQuote.clientName,
      notes: paymentNotes,
    });

    // Update quote status if 50% or more received
    if (amt >= (paymentTargetQuote.totalPrice * paymentTargetQuote.advancePercentage) / 100) {
      onUpdateQuotation({
        ...paymentTargetQuote,
        status: 'ACCEPTED',
      });
    }

    setShowPaymentModal(false);
  };

  const filteredQuotes = quotations.filter((q) => {
    if (!searchQuery.trim()) return true;
    const s = searchQuery.toLowerCase();
    return (
      q.clientName.toLowerCase().includes(s) ||
      q.quotationNumber.toLowerCase().includes(s) ||
      q.clientCity.toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-3 sm:p-5 lg:p-7 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Top Header - Compact editorial layout */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-3 sm:pb-4 border-b border-bone-border dark:border-obsidian-border">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[9.5px] sm:text-[10px] font-mono uppercase tracking-[0.2em] text-bone-muted dark:text-obsidian-muted mb-0.5">
            <span>Commercial Operations</span>
            <span>//</span>
            <span className="text-vermillion font-bold">VOWS Quotation Engine</span>
            <span className="hidden xs:inline">//</span>
            <span className="hidden xs:inline">Mangalore Atelier</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-black tracking-tight text-carbon dark:text-white uppercase">
            Quotations & Order Lifecycle
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <button
            onClick={() => setShowEnquiryModal(true)}
            className="px-3.5 py-1.5 border border-bone-border dark:border-obsidian-border hover:border-carbon dark:hover:border-white transition-all flex items-center gap-1.5 uppercase font-bold"
          >
            <Plus size={12} />
            <span>New Enquiry</span>
          </button>
        </div>
      </div>

      {/* Primary Module Tabs - Reordered: 1. Enquiries, 2. Quotations, 3. Orders & Deliveries */}
      <div className="flex items-center border-b border-bone-border dark:border-obsidian-border text-[11px] font-mono overflow-x-auto">
        <button
          onClick={() => setActiveTab('enquiries')}
          className={`pb-2.5 px-3.5 uppercase tracking-wider font-bold transition-all relative whitespace-nowrap ${
            activeTab === 'enquiries'
              ? 'text-carbon dark:text-white border-b-2 border-vermillion'
              : 'text-bone-muted dark:text-obsidian-muted hover:text-carbon dark:hover:text-white'
          }`}
        >
          Enquiries ({enquiries.length})
        </button>
        <button
          onClick={() => setActiveTab('quotations')}
          className={`pb-2.5 px-3.5 uppercase tracking-wider font-bold transition-all relative whitespace-nowrap ${
            activeTab === 'quotations'
              ? 'text-carbon dark:text-white border-b-2 border-vermillion'
              : 'text-bone-muted dark:text-obsidian-muted hover:text-carbon dark:hover:text-white'
          }`}
        >
          Quotations ({quotations.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-2.5 px-3.5 uppercase tracking-wider font-bold transition-all relative whitespace-nowrap ${
            activeTab === 'orders'
              ? 'text-carbon dark:text-white border-b-2 border-vermillion'
              : 'text-bone-muted dark:text-obsidian-muted hover:text-carbon dark:hover:text-white'
          }`}
        >
          Orders & Deliveries ({bookings.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ACTIVE QUOTATIONS & EDITABLE INSPECTOR                              */}
      {/* ========================================================================= */}
      {activeTab === 'quotations' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* Left Column: Compact Quotation List with Independent Scroll (5 cols) */}
          <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-2 max-h-none lg:max-h-[calc(100vh-140px)] flex flex-col">
            <div className="flex items-center justify-between text-[11px] font-mono shrink-0 pb-1">
              <span className="uppercase tracking-widest text-bone-muted dark:text-obsidian-muted">
                Issued Packages ({filteredQuotes.length})
              </span>
              <div className="flex items-center gap-1.5 border border-bone-border dark:border-obsidian-border px-2 py-0.5">
                <Search size={11} className="text-bone-muted" />
                <input
                  type="text"
                  placeholder="Filter name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent outline-none w-24 text-carbon dark:text-white text-[11px]"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[380px] lg:max-h-none overflow-y-auto pr-1 flex-1">
              {filteredQuotes.length === 0 && (
                <div className="p-6 border border-dashed border-bone-border dark:border-obsidian-border text-center text-xs font-mono text-bone-muted dark:text-obsidian-muted space-y-2">
                  <p>No quotations found.</p>
                  {currentUser.canEditQuotesAndOrders && (
                    <button
                      onClick={handleOpenCreateQuote}
                      className="text-vermillion hover:underline font-bold text-[11px]"
                    >
                      + Draft First Quotation
                    </button>
                  )}
                </div>
              )}
              {filteredQuotes.map((q) => {
                const isSelected = selectedQuote?.id === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuote(q)}
                    className={`p-3 sm:p-3.5 border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-2 border-carbon dark:border-white bg-bone-card dark:bg-obsidian-card shadow-sm'
                        : 'border-bone-border dark:border-obsidian-border bg-bone-card/60 dark:bg-obsidian-card/40 hover:border-carbon dark:hover:border-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                      <span className="font-bold text-vermillion">{q.quotationNumber}</span>
                      <span
                        className={`text-[8.5px] px-1.5 py-0.2 uppercase tracking-widest font-bold border ${
                          q.status === 'ACCEPTED' || q.status === 'CONVERTED'
                            ? 'border-green-600/30 text-green-700 dark:text-green-400 bg-green-500/10'
                            : 'border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10'
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>

                    <h3 className="font-serif text-base font-bold text-carbon dark:text-white">
                      {q.clientName}
                    </h3>
                    <p className="text-[10px] font-mono text-bone-muted dark:text-obsidian-muted">
                      {q.clientCity} // {q.date}
                    </p>

                    <div className="mt-2 pt-2 border-t border-bone-border dark:border-obsidian-border flex items-center justify-between text-[11px] font-mono">
                      <div>
                        <span className="text-bone-muted dark:text-obsidian-muted mr-1.5">Total</span>
                        <span className="font-bold text-carbon dark:text-white">{formatINR(q.totalPrice)}</span>
                      </div>
                      {currentUser.canDeleteQuotes !== false && onDeleteQuotation && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                `Are you sure you want to permanently delete quotation "${q.quotationNumber}" for ${q.clientName}?`
                              )
                            ) {
                              onDeleteQuotation(q.id);
                            }
                          }}
                          className="text-bone-muted hover:text-rose-600 p-1 transition-colors"
                          title="Delete quotation"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Visual Preview Deck with Independent Scroll (Strictly VOWS Branding with Active Theme Palette) */}
          {(() => {
            if (!selectedQuote) {
              return (
                <div className="lg:col-span-7 p-10 border-2 border-dashed border-bone-border dark:border-obsidian-border text-center space-y-3 bg-bone-card/40 dark:bg-obsidian-card/40">
                  <FileText size={36} className="mx-auto text-bone-muted dark:text-obsidian-muted opacity-40" />
                  <h3 className="font-serif text-lg font-bold uppercase text-carbon dark:text-white">
                    No Quotation Selected
                  </h3>
                  <p className="text-xs font-mono text-bone-muted dark:text-obsidian-muted max-w-sm mx-auto">
                    Select a quotation from the list on the left or click "+ New Proposal" to issue a bespoke wedding quotation.
                  </p>
                  {currentUser.canEditQuotesAndOrders && (
                    <button
                      onClick={handleOpenCreateQuote}
                      className="mt-2 px-4 py-2 bg-carbon text-bone dark:bg-white dark:text-carbon font-mono text-xs uppercase font-bold tracking-wider hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all inline-flex items-center gap-1.5"
                    >
                      <Plus size={13} />
                      <span>Draft First Quotation</span>
                    </button>
                  )}
                </div>
              );
            }

            const previewPalette = resolvePDFPalette(settings);
            const previewBg = `rgb(${previewPalette.bg.join(',')})`;
            const previewText = `rgb(${previewPalette.text.join(',')})`;
            const previewStrip = `rgb(${previewPalette.strip.join(',')})`;
            const previewMuted = `rgb(${previewPalette.muted.join(',')})`;
            const previewAccent = `rgb(${previewPalette.accent.join(',')})`;

            return (
              <div
                className="lg:col-span-7 border-2 border-carbon dark:border-white p-3.5 sm:p-5 lg:p-7 shadow-xl space-y-4 max-h-none lg:max-h-[calc(100vh-140px)] overflow-visible lg:overflow-y-auto"
                style={{ backgroundColor: previewBg, color: previewText }}
              >
                {/* Header: Pure VOWS Branding */}
                <div
                  className="flex items-start justify-between pb-3 border-b"
                  style={{ borderColor: previewStrip }}
                >
              <div>
                <span className="font-serif font-black text-lg sm:text-xl tracking-widest uppercase block">
                  {settings.studioName}
                </span>
                <span className="text-[8px] sm:text-[8.5px] font-mono text-[#6e7d76] uppercase tracking-wider block">
                  {settings.tagline}
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold block">{selectedQuote.quotationNumber}</span>
                <span className="text-[9px] font-mono text-[#6e7d76]">Official Quotation</span>
              </div>
            </div>

            {/* Title & Date */}
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight">
                {selectedQuote.packageTitle}
              </h2>
              <p className="text-[11px] font-mono font-bold mt-0.5">Date: {selectedQuote.date}</p>
            </div>

            {/* Quoted to */}
            <div className="font-mono text-[11px] space-y-0.5">
              <span className="font-bold uppercase text-[9.5px] text-[#6e7d76] block mb-0.5">
                Quoted to:
              </span>
              <p className="font-bold text-xs text-[#0f1714]">{selectedQuote.clientName}</p>
              <p className="text-[#3b4741]">{selectedQuote.clientCity}</p>
            </div>

            {/* Requirements Table */}
            <div className="border border-[#d8e2dc] rounded-sm overflow-hidden bg-white/70">
              <div className="bg-[#e4ede7] px-3.5 py-1.5 flex justify-between font-mono text-[11px] font-bold text-[#19231e]">
                <span>Requirement</span>
                <span>{selectedQuote.hideBreakup ? 'Status' : 'Price'}</span>
              </div>
              <div className="divide-y divide-[#e4ede7] text-[11px] font-mono">
                {selectedQuote.requirements
                  .filter((r) => r.included)
                  .map((req) => (
                    <div key={req.id} className="px-3.5 py-1.5 flex justify-between items-center">
                      <span>{req.name}</span>
                      <span className="text-right">
                        {selectedQuote.hideBreakup ? (
                          <span className="text-[9.5px] text-[#5a6962] font-mono uppercase bg-[#e4ede7] px-2 py-0.5 rounded-xs font-semibold">
                            Included in Package
                          </span>
                        ) : (
                          req.price || '-'
                        )}
                      </span>
                    </div>
                  ))}
              </div>
              <div className="bg-[#e4ede7] px-3.5 py-2 flex justify-between font-mono text-[11px] font-black text-[#0f1714] border-t border-[#d8e2dc]">
                <span>Total Package Price</span>
                <span className="text-sm">{formatINR(selectedQuote.totalPrice)}</span>
              </div>
            </div>

            {/* Deliverables Table */}
            <div>
              <h4 className="text-center font-serif font-bold text-xs uppercase tracking-wider mb-1.5">
                Deliverables
              </h4>
              <div className="border border-[#d8e2dc] rounded-sm overflow-hidden bg-white/70">
                <div className="bg-[#e4ede7] px-3.5 py-1.5 flex justify-between font-mono text-[11px] font-bold text-[#19231e]">
                  <span>Items</span>
                  <span>Details</span>
                </div>
                <div className="divide-y divide-[#e4ede7] text-[11px] font-mono">
                  {selectedQuote.deliverables
                    .filter((d) => d.included)
                    .map((del) => (
                      <div key={del.id} className="px-3.5 py-1.5 flex flex-col sm:flex-row sm:justify-between gap-0.5">
                        <span className="font-bold">{del.item}</span>
                        <span className="text-[#5a6962] text-[10px] italic">{del.details}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Crew Members */}
            <div>
              <div className="bg-[#e4ede7] px-3.5 py-1.5 flex justify-between font-mono text-[11px] font-bold text-[#19231e] border border-[#d8e2dc]">
                <span>Crew Members</span>
                <span>Number</span>
              </div>
              <div className="border-x border-b border-[#d8e2dc] divide-y divide-[#e4ede7] text-[11px] font-mono bg-white/70">
                {selectedQuote.crewAllocation.map((crew) => (
                  <div key={crew.id} className="px-3.5 py-1.5 flex justify-between items-center">
                    <div>
                      <span>{crew.role}</span>
                      {crew.assignedTo && (
                        <span className="text-[9.5px] text-[#5a6962] ml-2 italic">
                          ({crew.assignedTo})
                        </span>
                      )}
                    </div>
                    <span className="font-bold">{crew.number}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Terms Summary */}
            <div className="p-2.5 bg-white/80 border border-[#d8e2dc] text-[9.5px] font-mono text-[#5a6962] space-y-0.5">
              <span className="font-bold uppercase text-[#0f1714] block">
                Terms & Conditions Summary ({selectedQuote.termsAndConditions.length} Points Verified)
              </span>
              <p>• 50% advance confirms booking. Balance due on/before event date.</p>
              <p>• Hard drive required for RAW data collection (6-month retention liability).</p>
            </div>

            {/* Signoff Footer */}
            <div className="pt-2 border-t border-[#d8e2dc] flex items-center justify-between text-[11px] font-mono font-bold">
              <span>{selectedQuote.contactPerson || settings.contactPerson}</span>
              <span>{selectedQuote.contactPhone || settings.contactPhone}</span>
            </div>

            {/* Drive Notification Banner */}
            {driveSuccessMsg && (
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-[10px] font-mono flex items-center gap-2">
                <Check size={12} className="text-emerald-600" />
                <span>{driveSuccessMsg}</span>
              </div>
            )}

            {/* Action Bar with Edit, PDF Export, Breakup Toggle, Email, Drive & Conversion */}
            <div className="pt-3 border-t border-[#d8e2dc] space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* 1. Edit Quote Button */}
                <button
                  disabled={!currentUser.canEditQuotesAndOrders}
                  onClick={() => handleOpenEditQuote(selectedQuote)}
                  className={`py-2 px-2 text-[10px] font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 border border-[#0f1714] transition-all ${
                    currentUser.canEditQuotesAndOrders ? 'hover:bg-[#0f1714] hover:text-white' : 'opacity-40 cursor-not-allowed'
                  }`}
                  title={!currentUser.canEditQuotesAndOrders ? 'Restricted by Admin' : 'Edit quote items & prices'}
                >
                  <Edit3 size={11} />
                  <span>Edit Quote</span>
                </button>

                {/* 2. Download PDF Button */}
                <button
                  onClick={() => generateQuotationPDF(selectedQuote, settings)}
                  className="py-2 px-2 bg-[#0f1714] text-white hover:bg-vermillion transition-all text-[10px] font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5"
                >
                  <Download size={11} />
                  <span>2-Page PDF</span>
                </button>

                {/* 3. Breakup Hide / Show Toggle */}
                <button
                  onClick={() => {
                    const updated = { ...selectedQuote, hideBreakup: !selectedQuote.hideBreakup };
                    onUpdateQuotation(updated);
                    setSelectedQuote(updated);
                  }}
                  className={`py-2 px-2 text-[10px] font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 border transition-all ${
                    selectedQuote.hideBreakup
                      ? 'border-vermillion text-vermillion bg-vermillion/10 font-bold'
                      : 'border-[#0f1714] hover:bg-[#0f1714] hover:text-white'
                  }`}
                  title="Toggle whether item rate breakup is shown or hidden"
                >
                  <Sliders size={11} />
                  <span>{selectedQuote.hideBreakup ? 'Breakup: Hidden' : 'Breakup: Shown'}</span>
                </button>

                {/* 4. Send Email Button */}
                <button
                  onClick={() => handleOpenEmailModal(selectedQuote)}
                  className="py-2 px-2 border border-[#0f1714] hover:bg-[#0f1714] hover:text-white transition-all text-[10px] font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5"
                  title="Send quotation PDF directly via email"
                >
                  <Mail size={11} />
                  <span>Email Quote</span>
                </button>

                {/* 5. Save to Google Drive Button */}
                <button
                  disabled={isUploadingToDrive}
                  onClick={() => handleSaveQuotationToDrive(selectedQuote)}
                  className="py-2 px-2 border border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white transition-all text-[10px] font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5"
                  title="Save quotation PDF into segregated Google Drive folder for this client"
                >
                  <CloudUpload size={11} />
                  <span>{isUploadingToDrive ? 'Saving...' : 'Save to Drive'}</span>
                </button>

                {/* 6. Convert to Order Button */}
                <button
                  onClick={() => onConvertQuotationToBooking(selectedQuote)}
                  disabled={selectedQuote.status === 'CONVERTED' || !currentUser.canEditQuotesAndOrders}
                  className={`py-2 px-2 text-[10px] font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                    selectedQuote.status === 'CONVERTED'
                      ? 'bg-green-700/20 text-green-900 border border-green-700/40 cursor-not-allowed'
                      : 'border border-[#0f1714] hover:bg-[#0f1714] hover:text-white'
                  }`}
                >
                  <CheckCircle size={11} />
                  <span>{selectedQuote.status === 'CONVERTED' ? 'Order Active' : 'Convert Order'}</span>
                </button>

                {/* 7. Delete Quote Button (Point 3) */}
                {currentUser.canDeleteQuotes !== false && onDeleteQuotation && (
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Are you sure you want to permanently delete quotation "${selectedQuote.quotationNumber}" for ${selectedQuote.clientName}? This cannot be undone.`
                        )
                      ) {
                        onDeleteQuotation(selectedQuote.id);
                      }
                    }}
                    className="py-2 px-2 border border-rose-600/50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all text-[10px] font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5"
                    title="Permanently remove quotation"
                  >
                    <Trash2 size={11} />
                    <span>Delete Quote</span>
                  </button>
                )}
              </div>

              {/* Record Payment Button (Full Width) */}
              <button
                disabled={!currentUser.canViewFinances}
                onClick={() => {
                  setPaymentTargetQuote(selectedQuote);
                  setPaymentAmount(
                    Math.round(
                      (selectedQuote.totalPrice * selectedQuote.advancePercentage) / 100
                    ).toString()
                  );
                  setShowPaymentModal(true);
                }}
                className={`w-full py-2 px-2.5 bg-vermillion text-white hover:bg-vermillion-glow transition-all text-[10px] font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 ${
                  !currentUser.canViewFinances ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <CreditCard size={11} />
                <span>Add Payment / Record Retainer</span>
              </button>
            </div>
          </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ENQUIRIES CRM PIPELINE                                             */}
      {/* ========================================================================= */}
      {activeTab === 'enquiries' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="uppercase tracking-widest text-bone-muted dark:text-obsidian-muted">
              Incoming Coastal Enquiries ({enquiries.length})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {enquiries.map((enq) => (
              <div
                key={enq.id}
                className="p-4 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border space-y-3 hover:border-carbon dark:hover:border-white transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                    <span className="font-bold text-carbon dark:text-white">{enq.enquiryNumber}</span>
                    <span
                      className={`text-[8.5px] px-1.5 py-0.2 uppercase tracking-widest font-bold border ${
                        enq.status === 'CONVERTED'
                          ? 'border-green-600/30 text-green-700 dark:text-green-400 bg-green-500/10'
                          : enq.status === 'QUOTED'
                          ? 'border-blue-600/30 text-blue-700 dark:text-blue-400 bg-blue-500/10'
                          : 'border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10'
                      }`}
                    >
                      {enq.status}
                    </span>
                  </div>

                  <h3 className="font-serif text-base font-bold text-carbon dark:text-white">
                    {isDemo ? maskClientName(enq.clientName) : enq.clientName}
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-300">
                    {enq.eventType || 'Bespoke Coverage'}
                  </p>

                  <div className="mt-3 space-y-1.5 text-[11px] font-mono text-zinc-700 dark:text-zinc-200">
                    <div className="flex items-center gap-2">
                      <Calendar size={11} className="text-vermillion shrink-0" />
                      <span>{enq.eventDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={11} className="text-vermillion shrink-0" />
                      <span>{enq.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={11} className="text-zinc-500 dark:text-zinc-400 shrink-0" />
                      <span>{isDemo ? maskPhone(enq.phone) : enq.phone}</span>
                    </div>
                    {enq.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={11} className="text-zinc-500 dark:text-zinc-400 shrink-0" />
                        <span className="truncate">{isDemo ? maskEmail(enq.email) : enq.email}</span>
                      </div>
                    )}
                    {enq.notes && (
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 italic pt-1 border-t border-bone-border dark:border-obsidian-border">
                        &quot;{enq.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-bone-border dark:border-obsidian-border flex items-center justify-between text-[11px] font-mono gap-2">
                  <div>
                    <span className="text-[9px] uppercase text-zinc-500 dark:text-zinc-400 block">
                      Target Budget
                    </span>
                    <span className="font-bold text-carbon dark:text-white">
                      {formatINR(enq.estimatedBudget)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditEnquiry(enq)}
                      className="px-2.5 py-1 border border-bone-border dark:border-obsidian-border hover:border-carbon dark:hover:border-white text-carbon dark:text-white text-[10px] font-mono uppercase tracking-wider transition-all flex items-center gap-1"
                      title="Edit enquiry details"
                    >
                      <Edit3 size={10} />
                      <span>Edit</span>
                    </button>
                    <button
                      disabled={!currentUser.canEditQuotesAndOrders}
                      onClick={() => handleLaunchQuoteFromEnquiry(enq)}
                      className="px-2.5 py-1 bg-carbon text-bone dark:bg-white dark:text-carbon text-[10px] font-mono uppercase tracking-wider hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all flex items-center gap-1 font-bold"
                    >
                      <span>Create Quote</span>
                      <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ORDERS & DELIVERY PIPELINE                                         */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <span className="text-xs font-mono uppercase tracking-widest text-bone-muted dark:text-obsidian-muted block">
            Active Production Orders & Post-Delivery Stages ({bookings.length})
          </span>

          <div className="space-y-3">
            {bookings.map((booking) => {
              const currentStage: DeliveryStage = booking.deliveryStage || 'EDITING_IN_PROGRESS';
              return (
                <div
                  key={booking.id}
                  className="p-5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border shadow-sm space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-bone-border dark:border-obsidian-border pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-vermillion">
                          ORDER: {booking.shootCode}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 bg-carbon/5 dark:bg-white/10 uppercase">
                          {booking.type}
                        </span>
                      </div>
                      <h3 className="font-serif text-lg font-bold text-carbon dark:text-white mt-0.5">
                        {booking.title}
                      </h3>
                      <p className="text-[11px] font-mono text-bone-muted dark:text-obsidian-muted">
                        Client: {booking.client.name} ({booking.location.city})
                      </p>
                    </div>

                    <div className="text-right font-mono flex flex-col items-end gap-1.5">
                      <div>
                        <span className="text-[9px] uppercase text-bone-muted dark:text-obsidian-muted block">
                          Order Financials
                        </span>
                        <span className="text-xs text-green-600 dark:text-green-400 font-bold">
                          Paid: {formatINR(booking.financialSummary.retainerPaid)}
                        </span>
                        <span className="text-xs text-vermillion font-bold block">
                          Due: {formatINR(booking.financialSummary.balanceDue)}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setCallSheetBooking(booking);
                          setAllocatedGears(booking.gearChecklist || []);
                          setCallSheetSaveNotice(null);
                          setShowCallSheetModal(true);
                        }}
                        className="px-2.5 py-1 bg-carbon text-bone dark:bg-white dark:text-carbon hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white text-[10px] font-mono uppercase font-bold tracking-wider transition-all flex items-center gap-1.5"
                      >
                        <Camera size={11} />
                        <span>Call Sheet & Gear</span>
                      </button>
                    </div>
                  </div>

                  {/* Delivery Pipeline Stepper */}
                  <div>
                    <span className="text-[9.5px] font-mono uppercase tracking-widest text-bone-muted dark:text-obsidian-muted block mb-2">
                      Delivery Milestones
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 text-[9.5px] font-mono text-center">
                      {[
                        { id: 'RAW_INGESTED', label: '1. RAW Ingest' },
                        { id: 'SELECTION_PENDING', label: '2. Selection' },
                        { id: 'EDITING_IN_PROGRESS', label: '3. Retouch' },
                        { id: 'ALBUM_DESIGN', label: '4. Album Print' },
                        { id: 'DELIVERED', label: '5. Dispatched' },
                        { id: 'COMPLETED', label: '6. Archival Done' },
                      ].map((stage) => {
                        const isCurrent = currentStage === stage.id;
                        return (
                          <button
                            key={stage.id}
                            onClick={() =>
                              onUpdateBookingDelivery(booking.id, {
                                deliveryStage: stage.id as DeliveryStage,
                              })
                            }
                            className={`p-1.5 border transition-all ${
                              isCurrent
                                ? 'bg-carbon text-bone dark:bg-white dark:text-carbon font-bold border-carbon dark:border-white'
                                : 'border-bone-border dark:border-obsidian-border text-bone-muted hover:text-carbon dark:hover:text-white'
                            }`}
                          >
                            {stage.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Checklist (Hard Drive & Selection Done) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-[11px] font-mono">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={booking.hardDriveReceived || false}
                        onChange={(e) =>
                          onUpdateBookingDelivery(booking.id, {
                            hardDriveReceived: e.target.checked,
                          })
                        }
                        className="w-3.5 h-3.5 accent-vermillion"
                      />
                      <span className="text-carbon dark:text-white">
                        Hard Drive Received for RAW data (Term #12)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={booking.clientSelectionDone || false}
                        onChange={(e) =>
                          onUpdateBookingDelivery(booking.id, {
                            clientSelectionDone: e.target.checked,
                          })
                        }
                        className="w-3.5 h-3.5 accent-vermillion"
                      />
                      <span className="text-carbon dark:text-white">
                        Photo Selection Completed by Client (Term #11)
                      </span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* MODAL 1: NEW ENQUIRY MODAL                                                */}
      {/* ========================================================================= */}
      {showEnquiryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-carbon/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-bone-card dark:bg-obsidian-card border-2 border-carbon dark:border-white p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-bone-border dark:border-obsidian-border">
              <h3 className="font-serif text-lg font-bold uppercase text-carbon dark:text-white">
                Log New Client Lead
              </h3>
              <button
                onClick={() => setShowEnquiryModal(false)}
                className="text-xs font-mono text-bone-muted hover:text-carbon dark:hover:text-white font-bold"
              >
                ✕ [Esc]
              </button>
            </div>

            <form onSubmit={handleCreateEnquiry} className="space-y-2.5 text-[11px] font-mono">
              <div>
                <label className="block text-[9.5px] uppercase text-bone-muted mb-0.5">
                  Client / Couple Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Alveera D’souza"
                  value={enqClientName}
                  onChange={(e) => setEnqClientName(e.target.value)}
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9.5px] uppercase text-bone-muted mb-0.5">
                    Phone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98450 12849"
                    value={enqPhone}
                    onChange={(e) => setEnqPhone(e.target.value)}
                    className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] uppercase text-bone-muted mb-0.5">
                    City / Venue
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Mangalore"
                    value={enqCity}
                    onChange={(e) => setEnqCity(e.target.value)}
                    className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Client Email for Quotations & Remittance */}
              <div>
                <label className="block text-[9.5px] uppercase text-bone-muted mb-0.5">
                  Client Email Address (For Quotation & Invoice Dispatch) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="client.name@gmail.com"
                  value={enqEmail}
                  onChange={(e) => setEnqEmail(e.target.value)}
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9.5px] uppercase text-bone-muted mb-0.5">
                    Event Date
                  </label>
                  <input
                    type="date"
                    required
                    value={enqDate}
                    onChange={(e) => setEnqDate(e.target.value)}
                    className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] uppercase text-bone-muted mb-0.5">
                    Estimated Budget (INR)
                  </label>
                  <input
                    type="number"
                    required
                    value={enqBudget}
                    onChange={(e) => setEnqBudget(e.target.value)}
                    className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9.5px] uppercase text-bone-muted mb-0.5">
                  Event Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Catholic Wedding Ceremony & Reception"
                  value={enqType}
                  onChange={(e) => setEnqType(e.target.value)}
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-carbon text-bone dark:bg-white dark:text-carbon font-bold uppercase tracking-widest hover:bg-vermillion transition-all"
                >
                  Save Lead
                </button>
                <button
                  type="button"
                  onClick={() => setShowEnquiryModal(false)}
                  className="px-3 py-2 border border-bone-border dark:border-obsidian-border uppercase text-xs"
                >
                  ✕ [Esc] Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1B: EDIT ENQUIRY MODAL (Point 1)                                     */}
      {/* ========================================================================= */}
      {showEditEnquiryModal && editingEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-carbon/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-bone-card dark:bg-obsidian-card border-2 border-carbon dark:border-white p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-bone-border dark:border-obsidian-border">
              <h3 className="font-serif text-lg font-bold uppercase text-carbon dark:text-white">
                Edit Enquiry: {editingEnquiry.enquiryNumber}
              </h3>
              <button
                onClick={() => setShowEditEnquiryModal(false)}
                className="text-xs font-mono text-bone-muted hover:text-carbon dark:hover:text-white font-bold"
              >
                ✕ [Esc]
              </button>
            </div>

            <form onSubmit={handleSaveEditEnquiry} className="space-y-2.5 text-[11px] font-mono">
              <div>
                <label className="block text-[9.5px] uppercase text-bone-muted mb-0.5">
                  Client / Couple Name
                </label>
                <input
                  type="text"
                  required
                  value={editEnqClientName}
                  onChange={(e) => setEditEnqClientName(e.target.value)}
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9.5px] uppercase text-bone-muted mb-0.5">
                    Phone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={editEnqPhone}
                    onChange={(e) => setEditEnqPhone(e.target.value)}
                    className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] uppercase text-bone-muted mb-0.5">
                    City / Venue
                  </label>
                  <input
                    type="text"
                    required
                    value={editEnqCity}
                    onChange={(e) => setEditEnqCity(e.target.value)}
                    className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9.5px] uppercase text-bone-muted mb-0.5">
                  Client Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={editEnqEmail}
                  onChange={(e) => setEditEnqEmail(e.target.value)}
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9.5px] uppercase text-bone-muted mb-0.5">
                    Event Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editEnqDate}
                    onChange={(e) => setEditEnqDate(e.target.value)}
                    className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] uppercase text-bone-muted mb-0.5">
                    Estimated Budget (INR)
                  </label>
                  <input
                    type="number"
                    required
                    value={editEnqBudget}
                    onChange={(e) => setEditEnqBudget(e.target.value)}
                    className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9.5px] uppercase text-bone-muted mb-0.5">
                  Event Description
                </label>
                <input
                  type="text"
                  value={editEnqType}
                  onChange={(e) => setEditEnqType(e.target.value)}
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[9.5px] uppercase text-bone-muted mb-0.5">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  value={editEnqNotes}
                  onChange={(e) => setEditEnqNotes(e.target.value)}
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-carbon text-bone dark:bg-white dark:text-carbon font-bold uppercase tracking-widest hover:bg-vermillion transition-all"
                >
                  Update Enquiry
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditEnquiryModal(false)}
                  className="px-3 py-2 border border-bone-border dark:border-obsidian-border uppercase text-xs"
                >
                  ✕ [Esc] Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE / EDIT QUOTATION MODAL (CASCADES TO ORDERS!)               */}
      {/* ========================================================================= */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-carbon/70 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-bone-card dark:bg-obsidian-card border-2 border-carbon dark:border-white p-4 sm:p-6 shadow-2xl space-y-4 my-2 sm:my-6 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-bone-border dark:border-obsidian-border">
              <div>
                <span className="text-[9.5px] font-mono text-vermillion uppercase font-bold block">
                  {isEditingQuote ? 'Live Modification Engine' : 'Studio Dispatch'}
                </span>
                <h3 className="font-serif text-xl font-bold uppercase text-carbon dark:text-white">
                  {isEditingQuote ? 'Edit Quotation (Syncs with Order & Invoice)' : 'Package Quotation Builder'}
                </h3>
              </div>
              <button
                onClick={() => setShowQuoteModal(false)}
                className="text-xs font-mono text-bone-muted hover:text-carbon dark:hover:text-white font-bold"
              >
                ✕ [Esc]
              </button>
            </div>

            {isEditingQuote && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-400 text-[10px] font-mono">
                <strong>Auto-Cascading Sync:</strong> Saving changes here will automatically update the matching confirmed Booking, the Schedule, and the Tax Invoice!
              </div>
            )}

            <form onSubmit={handleSaveQuotation} className="space-y-4 text-[11px] font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] uppercase text-bone-muted mb-0.5">
                    Quotation No.
                  </label>
                  <input
                    type="text"
                    required
                    value={qNumber}
                    onChange={(e) => setQNumber(e.target.value)}
                    className="w-full p-1.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-bone-muted mb-0.5">Date</label>
                  <input
                    type="text"
                    required
                    value={qDate}
                    onChange={(e) => setQDate(e.target.value)}
                    className="w-full p-1.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-bone-muted mb-0.5">Package Title</label>
                  <input
                    type="text"
                    required
                    value={qPackageTitle}
                    onChange={(e) => setQPackageTitle(e.target.value)}
                    className="w-full p-1.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border">
                <div>
                  <label className="block text-[9px] uppercase text-bone-muted mb-0.5">Quoted To (Client)</label>
                  <input
                    type="text"
                    required
                    placeholder="Alveera D’souza"
                    value={qClientName}
                    onChange={(e) => setQClientName(e.target.value)}
                    className="w-full p-1.5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-bone-muted mb-0.5">City</label>
                  <input
                    type="text"
                    required
                    value={qClientCity}
                    onChange={(e) => setQClientCity(e.target.value)}
                    className="w-full p-1.5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border text-carbon dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-bone-muted mb-0.5">Phone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+91 98450 12849"
                    value={qClientPhone}
                    onChange={(e) => setQClientPhone(e.target.value)}
                    className="w-full p-1.5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border text-carbon dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-bone-muted mb-0.5">Client Email (For Quotation Dispatch)</label>
                  <input
                    type="email"
                    placeholder="client@gmail.com"
                    value={qClientEmail}
                    onChange={(e) => setQClientEmail(e.target.value)}
                    className="w-full p-1.5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border text-carbon dark:text-white"
                  />
                </div>
              </div>

              {/* Requirements Checklist */}
              <div className="space-y-1.5">
                <span className="font-bold uppercase text-[10px] block text-carbon dark:text-white">
                  Requirements Included in Package:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-2 border border-bone-border dark:border-obsidian-border">
                  {qRequirements.map((req) => (
                    <div
                      key={req.id}
                      className={`p-2 border flex items-center justify-between gap-2 transition-all ${
                        req.included
                          ? 'bg-carbon/5 dark:bg-white/10 border-carbon dark:border-white font-bold'
                          : 'border-bone-border dark:border-obsidian-border text-bone-muted'
                      }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={req.included}
                          onChange={(e) => {
                            setQRequirements(
                              qRequirements.map((r) =>
                                r.id === req.id ? { ...r, included: e.target.checked } : r
                              )
                            );
                          }}
                          className="accent-vermillion shrink-0"
                        />
                        <span className="text-[11px] truncate text-carbon dark:text-white">{req.name}</span>
                      </label>
                      <input
                        type="text"
                        value={req.price}
                        placeholder="Rs. 8,000/-"
                        onChange={(e) => {
                          const val = e.target.value;
                          setQRequirements(
                            qRequirements.map((r) =>
                              r.id === req.id ? { ...r, price: val } : r
                            )
                          );
                        }}
                        className="w-24 px-1.5 py-0.5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border text-right text-[10px] font-mono outline-none text-carbon dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Breakup Hide/Show Switch */}
              <div className="p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border flex items-center justify-between">
                <div>
                  <span className="font-bold uppercase text-[9.5px] block text-carbon dark:text-white">
                    Hide Item Price Breakup
                  </span>
                  <span className="text-[8.5px] text-bone-muted">
                    When checked, requirement prices are hidden and marked "Included in Package", showing only the total package amount.
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold">
                  <input
                    type="checkbox"
                    checked={qHideBreakup}
                    onChange={(e) => setQHideBreakup(e.target.checked)}
                    className="w-4 h-4 accent-vermillion cursor-pointer"
                  />
                  <span>{qHideBreakup ? 'Breakup Hidden' : 'Show Breakup'}</span>
                </label>
              </div>

              {/* Deliverables Checklist */}
              <div className="space-y-1.5">
                <span className="font-bold uppercase text-[10px] block">
                  Deliverables & Footnotes:
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto p-2 border border-bone-border dark:border-obsidian-border">
                  {qDeliverables.map((del) => (
                    <label
                      key={del.id}
                      className={`p-1.5 border flex items-center justify-between cursor-pointer transition-all ${
                        del.included
                          ? 'bg-carbon/5 dark:bg-white/10 border-carbon dark:border-white font-bold'
                          : 'border-bone-border dark:border-obsidian-border text-bone-muted'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={del.included}
                          onChange={(e) => {
                            setQDeliverables(
                              qDeliverables.map((d) =>
                                d.id === del.id ? { ...d, included: e.target.checked } : d
                              )
                            );
                          }}
                          className="accent-vermillion"
                        />
                        <span>{del.item}</span>
                      </div>
                      <span className="text-[9px] text-bone-muted italic">{del.details}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Dynamic Crew Allocation Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase text-[10px] block text-carbon dark:text-white">
                    Crew Allocation ({qCrew.length} Assigned):
                  </span>
                  <span className="text-[9px] text-bone-muted italic">
                    1 person per role (confidential crew roster)
                  </span>
                </div>

                {/* Current Quote Crew Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {qCrew.map((crew) => {
                    const cleanRole = crew.role.replace(/\s*\([^)]*\)/g, '').trim();
                    return (
                      <div
                        key={crew.id}
                        className="p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-[9.5px] font-bold text-carbon dark:text-white uppercase block truncate">
                            {cleanRole}
                          </span>
                          <span className="text-[8.5px] text-bone-muted block">
                            Assigned: 1 Crew Member
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setQCrew(qCrew.filter((c) => c.id !== crew.id))}
                          className="p-1 text-bone-muted hover:text-vermillion transition-colors rounded hover:bg-carbon/5 dark:hover:bg-white/5"
                          title="Remove crew role from quotation"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}

                  {qCrew.length === 0 && (
                    <div className="col-span-full p-3 border border-dashed border-bone-border dark:border-obsidian-border text-center text-[10px] text-bone-muted">
                      No crew allocated to this quotation yet. Select a role below to add.
                    </div>
                  )}
                </div>

                {/* Add Crew Role Selector */}
                <div className="p-2 bg-bone-surface/60 dark:bg-obsidian-surface/60 border border-dashed border-bone-border dark:border-obsidian-border flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <div className="flex-1 flex gap-2">
                    <select
                      value={selectedRosterRoleToAdd}
                      onChange={(e) => setSelectedRosterRoleToAdd(e.target.value)}
                      className="flex-1 p-1.5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border text-carbon dark:text-white text-[11px] font-mono outline-none"
                    >
                      <option value="">-- Select Crew Role from Settings Roster --</option>
                      {(settings.crewRoster || []).map((r) => {
                        const cleanRoleName = r.role.replace(/\s*\([^)]*\)/g, '').trim();
                        return (
                          <option key={r.id} value={r.id}>
                            {cleanRoleName}
                          </option>
                        );
                      })}
                      <option value="__custom__">+ Custom Crew Role...</option>
                    </select>

                    {selectedRosterRoleToAdd === '__custom__' && (
                      <input
                        type="text"
                        placeholder="Enter custom role title..."
                        value={customCrewRoleInput}
                        onChange={(e) => setCustomCrewRoleInput(e.target.value)}
                        className="flex-1 p-1.5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border text-carbon dark:text-white text-[11px] font-mono outline-none"
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={
                      !selectedRosterRoleToAdd ||
                      (selectedRosterRoleToAdd === '__custom__' && !customCrewRoleInput.trim())
                    }
                    onClick={() => {
                      let roleName = '';

                      if (selectedRosterRoleToAdd === '__custom__') {
                        roleName = customCrewRoleInput.replace(/\s*\([^)]*\)/g, '').trim();
                      } else {
                        const matched = (settings.crewRoster || []).find(
                          (r) => r.id === selectedRosterRoleToAdd
                        );
                        if (matched) {
                          roleName = matched.role.replace(/\s*\([^)]*\)/g, '').trim();
                        } else {
                          roleName = selectedRosterRoleToAdd.replace(/\s*\([^)]*\)/g, '').trim();
                        }
                      }

                      if (!roleName) return;

                      // Check if already in qCrew
                      const existingIndex = qCrew.findIndex(
                        (c) => c.role.toLowerCase() === roleName.toLowerCase()
                      );
                      if (existingIndex < 0) {
                        setQCrew([
                          ...qCrew,
                          {
                            id: `qcrew-${Date.now()}`,
                            role: roleName,
                            number: 1, // Locked to 1
                            assignedTo: undefined, // Confidential
                          },
                        ]);
                      }

                      setSelectedRosterRoleToAdd('');
                      setCustomCrewRoleInput('');
                    }}
                    className="px-3 py-1.5 bg-carbon text-bone dark:bg-white dark:text-carbon hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all text-[10px] uppercase font-bold tracking-wider disabled:opacity-40 flex items-center justify-center gap-1 shrink-0"
                  >
                    <Plus size={12} />
                    <span>Add Role</span>
                  </button>
                </div>
              </div>

              {/* Total Package Investment */}
              <div className="p-3 bg-bone-surface dark:bg-obsidian-surface border border-carbon dark:border-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[9.5px] uppercase font-bold text-vermillion block">
                    Total Package Price (INR)
                  </span>
                  <p className="text-[9px] text-bone-muted">
                    Advance: {qAdvancePct}% ({formatINR((parseFloat(qTotalPrice || '0') * qAdvancePct) / 100)})
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-bold text-sm">Rs.</span>
                  <input
                    type="number"
                    required
                    min="1000"
                    value={qTotalPrice}
                    onChange={(e) => setQTotalPrice(e.target.value)}
                    className="w-32 p-1.5 bg-bone-card dark:bg-obsidian-card border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-serif font-black text-base outline-none text-right"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-carbon text-bone dark:bg-white dark:text-carbon font-bold uppercase tracking-widest hover:bg-vermillion transition-all"
                >
                  {isEditingQuote ? 'Update Quote Everywhere' : 'Save & Commit Quotation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(false)}
                  className="px-4 py-2.5 border border-bone-border dark:border-obsidian-border uppercase text-xs"
                >
                  ✕ [Esc] Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2B: CALL SHEET & GEAR ALLOCATION MODAL (Point 23)                    */}
      {/* ========================================================================= */}
      {showCallSheetModal && callSheetBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-carbon/70 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-bone-card dark:bg-obsidian-card border-2 border-carbon dark:border-white p-5 sm:p-6 shadow-2xl space-y-4 my-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-bone-border dark:border-obsidian-border">
              <div>
                <span className="text-[9.5px] font-mono text-vermillion uppercase font-bold block">
                  Production Operations // Order {callSheetBooking.shootCode}
                </span>
                <h3 className="font-serif text-xl font-bold uppercase text-carbon dark:text-white">
                  Call Sheet & Gear Allocation
                </h3>
              </div>
              <button
                onClick={() => setShowCallSheetModal(false)}
                className="text-xs font-mono text-bone-muted hover:text-carbon dark:hover:text-white font-bold"
              >
                ✕ [Esc]
              </button>
            </div>

            {/* Shoot Overview */}
            <div className="p-3 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
              <div>
                <span className="text-[9px] uppercase text-bone-muted block">Client</span>
                <span className="font-bold text-carbon dark:text-white">{callSheetBooking.client.name}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-bone-muted block">Event Date</span>
                <span className="font-bold text-carbon dark:text-white">{callSheetBooking.date}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-bone-muted block">Location / City</span>
                <span className="font-bold text-carbon dark:text-white">{callSheetBooking.location.venue}, {callSheetBooking.location.city}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-bone-muted block">Call Time</span>
                <span className="font-bold text-vermillion">{callSheetBooking.callTime || '06:30 AM'}</span>
              </div>
            </div>

            {/* Allocated Studio & Rental Gear Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase text-[10px] font-mono text-carbon dark:text-white">
                  Allocated Studio & Rental Gear Checklist:
                </span>
                <span className="text-[9px] font-mono text-bone-muted italic">
                  Select kit items loaded into production bags
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-2 border border-bone-border dark:border-obsidian-border bg-bone-surface/50 dark:bg-obsidian-surface/50 text-[11px] font-mono">
                {(settings.gearInventory && settings.gearInventory.length > 0
                  ? settings.gearInventory
                  : defaultGearInventory
                ).map((item) => {
                  const isChecked = allocatedGears.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`p-2 border flex items-center justify-between cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-carbon/10 dark:bg-white/10 border-carbon dark:border-white font-bold'
                          : 'border-bone-border dark:border-obsidian-border text-bone-muted hover:border-carbon dark:hover:border-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAllocatedGears([...allocatedGears, item.id]);
                            } else {
                              setAllocatedGears(allocatedGears.filter((id) => id !== item.id));
                            }
                          }}
                          className="accent-vermillion"
                        />
                        <span className="text-carbon dark:text-white">{item.name}</span>
                      </div>
                      <span className="text-[9px] px-1 py-0.2 uppercase border border-bone-border dark:border-obsidian-border text-bone-muted">
                        {item.category}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateBooking && callSheetBooking) {
                      onUpdateBooking({
                        ...callSheetBooking,
                        gearChecklist: allocatedGears,
                      });
                      setCallSheetSaveNotice('Gear checklist updated successfully!');
                      setTimeout(() => setCallSheetSaveNotice(null), 3000);
                    }
                  }}
                  className="px-3 py-1.5 bg-carbon text-bone dark:bg-white dark:text-carbon hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white text-[10px] font-mono uppercase font-bold tracking-wider transition-all"
                >
                  Save Gear Allocation
                </button>
              </div>
              {callSheetSaveNotice && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono">
                  {callSheetSaveNotice}
                </div>
              )}
            </div>

            {/* Call Sheet PDF Exports: Client Call Sheet vs Crew Call Sheet */}
            <div className="p-3 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border space-y-2">
              <span className="font-bold uppercase text-[10px] font-mono text-carbon dark:text-white block">
                Export Call Sheets (PDF):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <button
                  onClick={() => generateClientCallSheetPDF(callSheetBooking, settings)}
                  className="p-2.5 border border-carbon dark:border-white hover:bg-carbon hover:text-bone dark:hover:bg-white dark:hover:text-carbon transition-all font-bold uppercase flex items-center justify-center gap-2"
                >
                  <Download size={12} />
                  <span>Client Call Sheet (Financials Hidden)</span>
                </button>
                <button
                  onClick={() => generateCrewCallSheetPDF(callSheetBooking, settings)}
                  className="p-2.5 bg-vermillion text-white hover:bg-vermillion-glow transition-all font-bold uppercase flex items-center justify-center gap-2"
                >
                  <Download size={12} />
                  <span>Crew Call Sheet (Full Tech & Gear)</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCallSheetModal(false)}
                className="px-4 py-2 border border-bone-border dark:border-obsidian-border font-mono text-xs uppercase"
              >
                ✕ [Esc] Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MANUAL PAYMENT ENTRY                                             */}
      {/* ========================================================================= */}
      {showPaymentModal && paymentTargetQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-carbon/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-bone-card dark:bg-obsidian-card border-2 border-carbon dark:border-white p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-bone-border dark:border-obsidian-border">
              <h3 className="font-serif text-lg font-bold uppercase text-carbon dark:text-white">
                Record Payment
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-xs font-mono text-bone-muted hover:text-carbon dark:hover:text-white font-bold"
              >
                ✕ [Esc]
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-2.5 text-[11px] font-mono">
              <div>
                <label className="block text-[9px] uppercase text-bone-muted mb-0.5">Client Reference</label>
                <input
                  type="text"
                  readOnly
                  value={`${paymentTargetQuote.clientName} (${paymentTargetQuote.quotationNumber})`}
                  className="w-full p-1.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase text-bone-muted mb-0.5">Amount (INR)</label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white font-serif font-black text-base outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase text-bone-muted mb-0.5">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-1.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                >
                  <option value="UPI / GPay">UPI / GPay</option>
                  <option value="NEFT / RTGS HDFC">NEFT / RTGS HDFC Bank</option>
                  <option value="Cash Receipt">Cash Receipt</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-carbon text-bone dark:bg-white dark:text-carbon font-bold uppercase tracking-widest hover:bg-vermillion transition-all"
                >
                  Commit & Sync
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-2.5 border border-bone-border dark:border-obsidian-border uppercase text-xs"
                >
                  ✕ [Esc] Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: SEND QUOTATION EMAIL MODAL                                        */}
      {/* ========================================================================= */}
      {showEmailModal && selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-carbon/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-bone-card dark:bg-obsidian-card border-2 border-carbon dark:border-white p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-bone-border dark:border-obsidian-border">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-vermillion" />
                <h3 className="font-serif text-lg font-bold uppercase text-carbon dark:text-white">
                  Send Quotation via Email
                </h3>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-xs font-mono text-bone-muted hover:text-carbon dark:hover:text-white font-bold"
              >
                ✕ [Esc]
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-3 text-[11px] font-mono">
              <div>
                <label className="block text-[9.5px] uppercase text-bone-muted mb-0.5 font-bold">
                  Client Email Recipient *
                </label>
                <input
                  type="email"
                  required
                  placeholder="client@gmail.com"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[9.5px] uppercase text-bone-muted mb-0.5 font-bold">
                  Email Subject
                </label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full p-2 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[9.5px] uppercase text-bone-muted mb-0.5 font-bold">
                  Proposal Message
                </label>
                <textarea
                  rows={6}
                  value={emailCustomMessage}
                  onChange={(e) => setEmailCustomMessage(e.target.value)}
                  className="w-full p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border text-carbon dark:text-white outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="p-2.5 bg-bone-surface dark:bg-obsidian-surface border border-bone-border dark:border-obsidian-border flex items-center justify-between text-[10px]">
                <span className="text-bone-muted">Attachment:</span>
                <span className="font-bold text-carbon dark:text-white">
                  Proposal for {selectedQuote.clientName}.pdf (2 Pages)
                </span>
              </div>

              {emailStatusMsg && (
                <div
                  className={`p-2.5 border text-xs font-mono ${
                    emailStatusMsg.includes('Error')
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {emailStatusMsg}
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="flex-1 py-2.5 bg-carbon text-bone dark:bg-white dark:text-carbon font-bold uppercase tracking-widest hover:bg-vermillion dark:hover:bg-vermillion dark:hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  {isSendingEmail ? (
                    <span>Dispatching Email...</span>
                  ) : (
                    <>
                      <Mail size={13} />
                      <span>Send Quotation to Client</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2.5 border border-bone-border dark:border-obsidian-border uppercase text-xs"
                >
                  ✕ [Esc] Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
