import {
  QuotationItem,
  DeliverableItem,
  CrewRequirement,
  StudioSettings,
  UserAccount,
  GearItem,
} from '@/types';

export interface CatalogTemplate {
  standardRequirements: QuotationItem[];
  standardDeliverables: DeliverableItem[];
  standardCrew: CrewRequirement[];
  standardTerms: string[];
  defaultContactPerson: string;
  defaultContactPhone: string;
}

export const defaultGearInventory: GearItem[] = [
  { id: 'gear-01', name: 'Sony FX3 Cinema Line Full-Frame Camera', category: 'BODY' as const, available: true },
  { id: 'gear-02', name: 'Sony A7R V 61MP Stills & Cinema Body', category: 'BODY' as const, available: true },
  { id: 'gear-03', name: 'Sony FE 24-70mm f/2.8 GM II Zoom Lens', category: 'LENS' as const, available: true },
  { id: 'gear-04', name: 'Sony FE 70-200mm f/2.8 GM OSS II Telephoto', category: 'LENS' as const, available: true },
  { id: 'gear-05', name: 'Sony FE 50mm f/1.2 GM Prime Lens', category: 'LENS' as const, available: true },
  { id: 'gear-06', name: 'Sony FE 85mm f/1.4 GM Portrait Prime', category: 'LENS' as const, available: true },
  { id: 'gear-07', name: 'DJI Mavic 3 Pro Cine 4K/60fps Drone Rig', category: 'DRONE' as const, available: true },
  { id: 'gear-08', name: 'DJI RS 3 Pro 3-Axis Motorized Gimbal Stabilizer', category: 'SUPPORT' as const, available: true },
  { id: 'gear-09', name: 'Godox AD400 Pro Wireless High-Speed Strobes (Dual)', category: 'LIGHTING' as const, available: true },
  { id: 'gear-10', name: 'Aputure Light Storm 300d II Daylight LED & Octa Softbox', category: 'LIGHTING' as const, available: true },
  { id: 'gear-11', name: 'Sennheiser AVX Wireless Lavalier Microphone Kit', category: 'AUDIO' as const, available: true },
  { id: 'gear-12', name: 'Dual 98Wh V-Mount Battery Rig with D-Tap Distribution', category: 'SUPPORT' as const, available: true },
];

export const defaultCatalog: CatalogTemplate = {
  standardRequirements: [
    { id: 'req-01', name: 'Traditional Photography', price: 'Rs. 15,000/-', included: true },
    { id: 'req-02', name: 'Candid Photography', price: 'Rs. 20,000/-', included: true },
    { id: 'req-03', name: 'Cinematic Highlights', price: 'Rs. 18,000/-', included: true },
    { id: 'req-04', name: 'Traditional Videography', price: 'Rs. 14,000/-', included: true },
    { id: 'req-05', name: 'Drone Aerial Cinema Coverage', price: 'Rs. 8,000/-', included: false },
    { id: 'req-06', name: 'Pre-Wedding Coastal Beach Session', price: 'Rs. 12,000/-', included: false },
    { id: 'req-07', name: 'Roce / Haldi Evening Ritual Coverage', price: 'Rs. 10,000/-', included: false },
  ],

  standardDeliverables: [
    {
      id: 'del-01',
      item: 'Edited High-Resolution Photos',
      details: '*varies per event generally 500 - 800',
      included: true,
    },
    {
      id: 'del-02',
      item: 'Cinematic Highlight Video',
      details: '*duration 2-8 minutes',
      included: true,
    },
    {
      id: 'del-03',
      item: 'Full-Length Edited Video',
      details: '*covers the whole event',
      included: true,
    },
    {
      id: 'del-04',
      item: 'Premium Glossy & MATT Photo Album',
      details: '*35-40 pages',
      included: true,
    },
    {
      id: 'del-05',
      item: 'Complimentary : Couple photo frame',
      details: '*archival gallery frame included',
      included: true,
    },
    {
      id: 'del-06',
      item: 'Teaser Reel for Instagram (4K 9:16)',
      details: '*delivered within 48 hours of event',
      included: false,
    },
    {
      id: 'del-07',
      item: 'Mini Pocket Books for Parents (2 Copies)',
      details: '*20 pages soft-touch matte',
      included: false,
    },
  ],

  standardCrew: [
    { id: 'crew-01', role: 'Lead Cinematographer', number: 1 },
    { id: 'crew-02', role: 'Candid Photographer', number: 1 },
    { id: 'crew-03', role: 'Traditional Photographer', number: 1 },
    { id: 'crew-04', role: 'Traditional Videographer', number: 1 },
    { id: 'crew-05', role: 'Drone Pilot', number: 1 },
    { id: 'crew-06', role: 'Grip & Lighting Assistant', number: 1 },
  ],

  standardTerms: [
    'A 50% advance is required to confirm the booking. Dates are secured only after payment.',
    'Remaining balance must be cleared on or before the event date.',
    'Advance is non-refundable. Date changes are subject to availability.',
    'Final photos/videos will be delivered within 2-6 weeks.',
    'Travel And Accommodation Need To be Provided If Requested.',
    'Accommodation is not included in the above quotation and has to be provided by the client.',
    'We reserve the right to use content for portfolio and promotional purposes.',
    'In case of unforeseen issues, liability is limited to the amount paid.',
    'Delays from the client side may impact coverage. We are not responsible for reduced deliverables due to time loss.',
    'Additional Photos For Album Or Sheets Will Be Charged Additional.',
    'Photo Selection for the album done by the Client.',
    'Couple needs to provide a Hard Drive for the collection of RAW data, agency will not be liable for anykind of DATA LOSS after 6 months from the shoot date.',
  ],

  defaultContactPerson: 'REUBEN SERRAO',
  defaultContactPhone: '+91 93800 57445',
};

export const defaultCrewRoster = [
  { id: 'crw-01', role: 'Owner & Lead Cinematographer', defaultCount: 1, defaultName: 'Reuben Serrao', phone: '+91 93800 57445' },
  { id: 'crw-02', role: 'Candid Photographer', defaultCount: 1, defaultName: 'Lead Photographer', phone: '+91 93800 57445' },
  { id: 'crw-03', role: 'Traditional Photographer', defaultCount: 1, defaultName: 'Roshan D’Silva', phone: '+91 98450 11234' },
  { id: 'crw-04', role: 'Traditional Videographer', defaultCount: 1, defaultName: 'Karthik Rao', phone: '+91 99001 44520' },
  { id: 'crw-05', role: 'Drone Pilot', defaultCount: 1, defaultName: 'Farooq Mansoor', phone: '+91 96110 33912' },
  { id: 'crw-06', role: 'Editor & Colorist', defaultCount: 1, defaultName: 'Reuben Serrao', phone: '+91 93800 57445' },
  { id: 'crw-07', role: 'Grip & Lighting Assistant', defaultCount: 1, defaultName: 'Santhosh Bhandary', phone: '+91 98440 77123' },
];

export const defaultCustomLedgerCategories: string[] = [
  'CLIENT_RECEIVABLE',
  'PRODUCTION_EXPENSE',
  'GEAR_RENTAL',
  'STUDIO_OVERHEAD',
  'TALENT_PAYOUT',
  'LOCATION_PERMIT',
  'POST_COLOR_GRADE',
];

export const defaultStudioSettings: StudioSettings = {
  studioName: 'VOWS',
  tagline: 'Wedding Cinematics & Stills',
  city: 'Mangalore, Karnataka',
  hasGst: false,
  gstin: '',
  bankingDetails: {
    accountName: 'VOWS // REUBEN SERRAO',
    bankName: 'HDFC Bank Ltd',
    branch: 'Hampankatta Branch, Mangalore',
    accountNumber: '50200084920194',
    ifscCode: 'HDFC0000084',
    upiId: 'vowsbyreuben@okaxis',
  },
  contactPerson: 'REUBEN SERRAO',
  contactPhone: '+91 93800 57445',
  termsAndConditions: defaultCatalog.standardTerms,
  pdfThemeColor: 'sage',
  crewRoster: defaultCrewRoster,
  uiTheme: 'slate',
  packageRequirements: defaultCatalog.standardRequirements,
  packageDeliverables: defaultCatalog.standardDeliverables,
  advancePaymentSettings: {
    enabled: true,
    mode: 'PERCENTAGE',
    value: 50,
  },
  emailTemplateSettings: {
    headingTitle: 'VOWS',
    tagline: 'Wedding Cinematics & Stills',
    subjectLine: 'Proposal & Quotation — VOWS',
    bodyTemplate: 'Dear <strong>{clientName}</strong>,\n\nThank you for reaching out to VOWS. Attached is our bespoke quotation and coverage plan for your upcoming event.\n\nLooking forward to capturing amazing frames with you.\n\nWarm regards,\nReuben Serrao\nVOWS - Wedding Cinematics & Stills\n+91 93800 57445',
  },
  customLedgerCategories: defaultCustomLedgerCategories,
  gearInventory: defaultGearInventory,
};

export const defaultUsers: UserAccount[] = [
  {
    id: 'usr-reuben',
    username: 'reuben',
    password: 'vowsreuben2026',
    fullName: 'Reuben Serrao (Director)',
    role: 'ADMIN_ACCESS',
    canViewFinances: true,
    canAccessSettings: true,
    canEditQuotesAndOrders: true,
    canEditLedger: true,
    canDeleteQuotes: true,
    canSendEmails: true,
    canViewCallSheets: true,
    canExportPDFs: true,
    isLocked: false,
  },
  {
    id: 'usr-root',
    username: 'root',
    password: 'vowsroot2026',
    fullName: 'System Admin',
    role: 'ADMIN_ACCESS',
    canViewFinances: true,
    canAccessSettings: true,
    canEditQuotesAndOrders: true,
    canEditLedger: true,
    canDeleteQuotes: true,
    canSendEmails: true,
    canViewCallSheets: true,
    canExportPDFs: true,
    isLocked: false,
  },
];
