'use client';

import * as React from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { UserRole } from '@/lib/constants/permissions';
import { logoutAction } from '@/server/actions/auth.actions';
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/server/actions/notification.actions';
import { NotificationEntry } from '@/types/auth';
import {
  Inbox,
  Users,
  FileText,
  CalendarDays,
  Calendar,
  Contact,
  Truck,
  Sparkles,
  Package,
  Image as ImageIcon,
  Receipt,
  CreditCard,
  FileCheck,
  BookOpen,
  DollarSign,
  Star,
  Settings,
  History,
  ShieldAlert,
  Bell,
  Moon,
  Sun,
  LogOut,
  User,
  LayoutDashboard,
  Menu,
  X,
} from 'lucide-react';

interface CrmShellProps {
  userRole: UserRole;
  userEmail: string;
  userName: string;
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Core',
    items: [
      {
        label: 'Dashboard',
        href: '/crm/dashboard',
        icon: LayoutDashboard,
        roles: ['system_admin', 'business_owner', 'manager', 'accountant'],
      },
      {
        label: 'Schedule',
        href: '/crm/schedule',
        icon: Calendar,
        roles: ['system_admin', 'business_owner', 'manager', 'accountant', 'staff', 'crew_member'],
      },
    ],
  },
  {
    title: 'Sales',
    items: [
      {
        label: 'Enquiries',
        href: '/crm/enquiries',
        icon: Inbox,
        roles: ['system_admin', 'business_owner', 'manager', 'accountant', 'staff'],
      },
      {
        label: 'Clients',
        href: '/crm/clients',
        icon: Users,
        roles: ['system_admin', 'business_owner', 'manager', 'accountant', 'staff'],
      },
      {
        label: 'Quotations',
        href: '/crm/quotations',
        icon: FileText,
        roles: ['system_admin', 'business_owner', 'manager', 'accountant'],
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        label: 'Bookings',
        href: '/crm/bookings',
        icon: CalendarDays,
        roles: ['system_admin', 'business_owner', 'manager', 'accountant', 'staff', 'crew_member'],
      },
      {
        label: 'Crew Directory',
        href: '/crm/crew',
        icon: Contact,
        roles: ['system_admin', 'business_owner', 'manager', 'accountant', 'crew_member'],
      },
      {
        label: 'Delivery Pipeline',
        href: '/crm/delivery',
        icon: Truck,
        roles: ['system_admin', 'business_owner', 'manager', 'staff', 'crew_member'],
      },
    ],
  },
  {
    title: 'Studio Tools',
    items: [
      {
        label: 'Services',
        href: '/crm/services',
        icon: Sparkles,
        roles: ['system_admin', 'business_owner', 'manager', 'accountant', 'staff'],
      },
      {
        label: 'Packages',
        href: '/crm/packages',
        icon: Package,
        roles: ['system_admin', 'business_owner', 'manager', 'accountant', 'staff'],
      },
      {
        label: 'Portfolio',
        href: '/crm/portfolio',
        icon: ImageIcon,
        roles: ['system_admin', 'business_owner', 'manager'],
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        label: 'Invoices',
        href: '/crm/invoices',
        icon: Receipt,
        roles: ['system_admin', 'business_owner', 'manager', 'accountant'],
      },
      {
        label: 'Payments',
        href: '/crm/payments',
        icon: CreditCard,
        roles: ['system_admin', 'business_owner', 'accountant'],
      },
      {
        label: 'Receipts',
        href: '/crm/receipts',
        icon: FileCheck,
        roles: ['system_admin', 'business_owner', 'accountant'],
      },
      {
        label: 'Credit Notes',
        href: '/crm/credit-notes',
        icon: FileText,
        roles: ['system_admin', 'business_owner', 'accountant', 'manager'],
      },
      {
        label: 'Expenses',
        href: '/crm/expenses',
        icon: DollarSign,
        roles: ['system_admin', 'business_owner', 'accountant'],
      },
      {
        label: 'Studio Ledger',
        href: '/crm/ledger',
        icon: BookOpen,
        roles: ['system_admin', 'business_owner', 'accountant'],
      },
    ],
  },
  {
    title: 'Studio Governance',
    items: [
      {
        label: 'Client Reviews',
        href: '/crm/reviews',
        icon: Star,
        roles: ['system_admin', 'business_owner', 'manager'],
      },
      {
        label: 'Audit Trail',
        href: '/crm/audit-log',
        icon: History,
        roles: ['system_admin', 'business_owner'],
      },
      {
        label: 'Studio Settings',
        href: '/crm/settings',
        icon: Settings,
        roles: ['system_admin', 'business_owner'],
      },
      {
        label: 'User Management',
        href: '/admin/users',
        icon: Users,
        roles: ['system_admin'],
      },
    ],
  },
];

export function CrmShell({
  userRole,
  userEmail,
  userName,
  children,
}: CrmShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isDark, setIsDark] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notifications, setNotifications] = React.useState<NotificationEntry[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const notificationsRef = React.useRef<HTMLDivElement>(null);
  const profileRef = React.useRef<HTMLDivElement>(null);

  // Sync theme with DOM on mount
  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  React.useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Poll notifications every 60 seconds
  React.useEffect(() => {
    async function loadNotifs() {
      try {
        const res = await getNotificationsAction();
        if (res.data) {
          setUnreadCount(res.data.count);
          setNotifications(res.data.notifications);
        }
      } catch {
        // Notification poll failed silently
      }
    }

    loadNotifs();
    const interval = setInterval(loadNotifs, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('vows_theme', 'dark');
        document.cookie = 'vows_theme=dark; path=/; max-age=31536000; SameSite=Lax';
      } catch {}
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('vows_theme', 'light');
        document.cookie = 'vows_theme=light; path=/; max-age=31536000; SameSite=Lax';
      } catch {}
    }
  };

  const handleLogout = async () => {
    await logoutAction();
    router.push('/login');
  };

  const markRead = async (id: string) => {
    await markNotificationReadAction(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await markAllNotificationsReadAction();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = async (n: NotificationEntry) => {
    if (!n.isRead) {
      await markRead(n.id);
    }
    setIsNotificationsOpen(false);
    if (n.link) {
      router.push(n.link);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex text-on-surface">
      {/* Desktop Sidebar (256px) */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-surface-container-low border-r border-outline-variant/30 z-40 flex-col justify-between">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo Header */}
          <div className="h-16 px-5 border-b border-outline-variant/20 flex items-center justify-between shrink-0">
            <Link href="/crm/dashboard" className="flex items-center gap-3 transition-opacity hover:opacity-85 py-1" aria-label="VOWS Dashboard">
              <NextImage
                src="/images/logo-light.png"
                alt="VOWS"
                width={130}
                height={45}
                className="h-8 w-auto object-contain dark:hidden"
                priority
              />
              <NextImage
                src="/images/logo-dark.png"
                alt="VOWS"
                width={130}
                height={45}
                className="h-8 w-auto object-contain hidden dark:block"
                priority
              />
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {userRole === 'system_admin' && (
              <div className="px-2 pb-2">
                <Link
                  href="/admin/dashboard"
                  prefetch={true}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-error-container/40 text-error font-medium text-xs hover:bg-error-container/70 transition-colors"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Admin Console</span>
                </Link>
              </div>
            )}

            {NAV_SECTIONS.map((section) => {
              const visibleItems = section.items.filter((item) =>
                item.roles.includes(userRole)
              );
              if (visibleItems.length === 0) return null;

              return (
                <div key={section.title} className="space-y-1">
                  <div className="px-3 text-[10px] uppercase tracking-wider font-semibold text-outline">
                    {section.title}
                  </div>
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={true}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-xs'
                            : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          {/* User Info footer */}
          <div className="p-3 border-t border-outline-variant/20 bg-surface-container/50 shrink-0">
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-medium text-on-surface truncate">
                  {userName}
                </span>
                <span className="text-[10px] text-outline capitalize truncate">
                  {userRole.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        {/* Topbar */}
        <header className="fixed top-0 left-0 md:left-64 right-0 h-16 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/40 z-30 flex items-center justify-between px-4 sm:px-6 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-medium text-outline">
            {/* Mobile Adaptive Logo */}
            <div className="md:hidden flex items-center mr-2">
              <Link href="/crm/dashboard" prefetch={true} className="flex items-center" aria-label="VOWS Home">
                <NextImage
                  src="/images/logo-light.png"
                  alt="VOWS"
                  width={90}
                  height={32}
                  className="h-6 w-auto object-contain dark:hidden"
                  priority
                />
                <NextImage
                  src="/images/logo-dark.png"
                  alt="VOWS"
                  width={90}
                  height={32}
                  className="h-6 w-auto object-contain hidden dark:block"
                  priority
                />
              </Link>
            </div>
            <span className="hidden sm:inline text-on-surface-variant">VOWS CRM</span>
            <span className="hidden sm:inline">/</span>
            <span className="text-on-surface capitalize font-semibold">
              {pathname.split('/')[2] || 'Portal'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Notification Bell */}
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsNotificationsOpen((prev) => !prev);
                }}
                className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all duration-150 cursor-pointer"
                aria-label="Notifications"
                aria-expanded={isNotificationsOpen}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-error rounded-full ring-2 ring-surface-container-lowest" />
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotificationsOpen && (
                <div className="vows-popover-enter absolute right-0 mt-2 w-80 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-3 z-50 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
                    <span className="text-xs font-semibold text-on-surface">Notifications</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-outline">{unreadCount} unread</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllRead}
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1 divide-y divide-outline-variant/20">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-outline py-4 text-center">No recent notifications.</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`pt-2 pb-1 text-xs space-y-0.5 cursor-pointer rounded px-1.5 transition-colors hover:bg-surface-container-low ${
                            n.isRead ? 'opacity-60' : 'font-medium bg-surface-container-low/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-on-surface truncate font-semibold">{n.title}</span>
                            <span className="text-[10px] text-outline shrink-0 ml-1">
                              {new Date(n.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                          {n.body && <p className="text-[11px] text-on-surface-variant line-clamp-2">{n.body}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* User Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setIsNotificationsOpen(false);
                  setIsProfileOpen((prev) => !prev);
                }}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-container-high transition-all duration-150 cursor-pointer"
                aria-label="Account menu"
                aria-expanded={isProfileOpen}
              >
                <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs shadow-xs">
                  {userName.charAt(0).toUpperCase()}
                </div>
              </button>

              {isProfileOpen && (
                <div className="vows-popover-enter absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-2 z-50 space-y-1">
                  <div className="px-2.5 py-2 border-b border-outline-variant/40">
                    <p className="text-xs font-semibold text-on-surface truncate">{userName}</p>
                    <p className="text-[11px] text-outline truncate">{userEmail}</p>
                  </div>
                  <Link
                    href="/crm/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-on-surface hover:bg-surface-container-high transition-colors"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>My Profile</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-error hover:bg-error-container/60 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 pt-16 pb-20 md:pb-8 px-4 sm:px-6 lg:px-8">
          {process.env.NEXT_PUBLIC_APP_MODE === 'demo' && (
            <div className="mb-4 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>
                  <strong>DEMO MODE:</strong> Synthetic demonstration fixtures active. Live emails and payment gateways disabled.
                </span>
              </div>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20">
                Demo
              </span>
            </div>
          )}
          {children}
        </main>

        {/* Mobile Navigation Drawer Sheet (< 768px) */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs">
            <div className="fixed inset-0" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="relative bg-surface-container-lowest border-t border-outline-variant rounded-t-2xl max-h-[82vh] overflow-y-auto p-4 space-y-4 shadow-2xl z-10">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
                <div className="flex items-center gap-2">
                  <NextImage
                    src="/images/logo-light.png"
                    alt="VOWS"
                    width={90}
                    height={30}
                    className="h-6 w-auto object-contain dark:hidden"
                  />
                  <NextImage
                    src="/images/logo-dark.png"
                    alt="VOWS"
                    width={90}
                    height={30}
                    className="h-6 w-auto object-contain hidden dark:block"
                  />
                  <span className="text-xs font-bold text-on-surface">Menu</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/crm/quotations/new"
                  prefetch={true}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>+ New Quote</span>
                </Link>
                <Link
                  href="/crm/invoices/new"
                  prefetch={true}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary hover:bg-secondary/20 text-xs font-semibold transition-colors"
                >
                  <Receipt className="w-4 h-4 shrink-0" />
                  <span>+ New Invoice</span>
                </Link>
              </div>

              {/* Navigation Sections */}
              <div className="space-y-4 pt-1">
                {NAV_SECTIONS.map((section) => {
                  const visibleItems = section.items.filter((item) =>
                    item.roles.includes(userRole)
                  );
                  if (visibleItems.length === 0) return null;

                  return (
                    <div key={section.title} className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-outline tracking-wider px-2">
                        {section.title}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {visibleItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              prefetch={true}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                                isActive
                                  ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-xs'
                                  : 'text-on-surface-variant bg-surface-container-low hover:bg-surface-container-high hover:text-on-surface'
                              }`}
                            >
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Profile and Signout in drawer */}
              <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-between">
                <Link
                  href="/crm/profile"
                  prefetch={true}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-xs font-medium text-on-surface hover:text-primary transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[10px]">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate max-w-[120px]">{userName}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs font-semibold text-error hover:underline cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation Bar (< 768px) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-container-lowest/95 backdrop-blur-lg border-t border-outline-variant/40 flex items-center justify-around px-1 z-40 shadow-lg">
          <Link
            href="/crm/dashboard"
            prefetch={true}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-[56px] text-[10px] font-medium transition-all active:scale-95 touch-manipulation ${
              pathname === '/crm/dashboard' ? 'text-primary font-bold' : 'text-outline hover:text-on-surface'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="truncate">Dashboard</span>
          </Link>
          <Link
            href="/crm/quotations/new"
            prefetch={true}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-[56px] text-[10px] font-medium transition-all active:scale-95 touch-manipulation ${
              pathname === '/crm/quotations/new' ? 'text-primary font-bold' : 'text-outline hover:text-on-surface'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="truncate">Quotes</span>
          </Link>
          <Link
            href="/crm/invoices/new"
            prefetch={true}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-[56px] text-[10px] font-medium transition-all active:scale-95 touch-manipulation ${
              pathname === '/crm/invoices/new' ? 'text-primary font-bold' : 'text-outline hover:text-on-surface'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="truncate">Invoices</span>
          </Link>
          <Link
            href="/crm/ledger"
            prefetch={true}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-[56px] text-[10px] font-medium transition-all active:scale-95 touch-manipulation ${
              pathname.startsWith('/crm/ledger') ? 'text-primary font-bold' : 'text-outline hover:text-on-surface'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="truncate">Ledger</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-[56px] text-[10px] font-medium transition-all active:scale-95 touch-manipulation cursor-pointer ${
              isMobileMenuOpen ? 'text-primary font-bold' : 'text-outline hover:text-on-surface'
            }`}
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
            <span className="truncate">Menu</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
