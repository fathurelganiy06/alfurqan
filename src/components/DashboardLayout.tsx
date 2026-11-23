import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileCheck2,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { useSiakad } from '../context/SiakadContext';
import type { AdminMenuKey, StudentMenuKey } from '../types/siakad';
import { CAMPUS_LOGO_URL, formatDateID, formatRupiah } from '../utils/formatters';

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  badgeCount?: number;
}

interface DashboardLayoutProps {
  activePage: string;
  onNavigate: (page: string) => void;
  pageTitle: string;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  activePage,
  onNavigate,
  pageTitle,
  children,
}) => {
  const { user, data, logout } = useSiakad();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  const pendingProofsCount = useMemo(
    () => data.paymentProofs.filter((p) => p.status_verifikasi === 'Menunggu Verifikasi').length,
    [data.paymentProofs]
  );

  const notifications = useMemo(() => {
    if (isAdmin) {
      return data.paymentProofs
        .filter((p) => p.status_verifikasi === 'Menunggu Verifikasi')
        .slice(0, 6)
        .map((p) => {
          const st = data.students.find((s) => s.id === p.student_id);
          return {
            id: p.id,
            title: `${st?.nama_lengkap || 'Mahasiswa'} mengunggah bukti bayar`,
            detail: `${formatRupiah(p.nominal_transfer)} · ${formatDateID(p.tanggal_transfer)}`,
            tone: 'warning' as const,
            target: 'payment_verification',
          };
        });
    }

    const items: {
      id: string;
      title: string;
      detail: string;
      tone: 'success' | 'warning' | 'danger';
      target: string;
    }[] = [];

    for (const p of data.paymentProofs.slice(0, 5)) {
      if (p.status_verifikasi === 'Ditolak') {
        items.push({
          id: p.id,
          title: 'Bukti pembayaran ditolak Admin',
          detail: p.alasan_penolakan || 'Mohon unggah ulang bukti transfer yang valid.',
          tone: 'danger',
          target: 'student_upload',
        });
      } else if (p.status_verifikasi === 'Menunggu Verifikasi') {
        items.push({
          id: p.id,
          title: 'Bukti bayar sedang diverifikasi',
          detail: `${formatRupiah(p.nominal_transfer)} · ${formatDateID(p.tanggal_transfer)}`,
          tone: 'warning',
          target: 'student_upload',
        });
      } else if (p.status_verifikasi === 'Disetujui') {
        items.push({
          id: p.id,
          title: 'Pembayaran SPP disetujui',
          detail: `${formatRupiah(p.nominal_transfer)} telah tercatat ke tagihan Anda.`,
          tone: 'success',
          target: 'student_billing',
        });
      }
    }
    return items;
  }, [isAdmin, data.paymentProofs, data.students]);

  const adminNav: NavItem[] = [
    { key: 'dashboard' as AdminMenuKey, label: 'Dashboard Analytics', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
    { key: 'students' as AdminMenuKey, label: 'Data Mahasiswa', icon: <Users className="w-[18px] h-[18px]" /> },
    { key: 'faculties_departments' as AdminMenuKey, label: 'Fakultas & Jurusan', icon: <Building2 className="w-[18px] h-[18px]" /> },
    { key: 'courses' as AdminMenuKey, label: 'Mata Kuliah', icon: <BookOpen className="w-[18px] h-[18px]" /> },
    { key: 'bank_accounts' as AdminMenuKey, label: 'Rekening Bank', icon: <Landmark className="w-[18px] h-[18px]" /> },
    { key: 'tuition_bills' as AdminMenuKey, label: 'Pembayaran & Cicilan SPP', icon: <CreditCard className="w-[18px] h-[18px]" /> },
    {
      key: 'payment_verification' as AdminMenuKey,
      label: 'Verifikasi Bukti Bayar',
      icon: <FileCheck2 className="w-[18px] h-[18px]" />,
      badgeCount: pendingProofsCount,
    },
  ];

  const studentNav: NavItem[] = [
    { key: 'student_dashboard' as StudentMenuKey, label: 'Dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { key: 'student_krs' as StudentMenuKey, label: 'Mata Kuliah & KRS', icon: <BookOpen className="w-[18px] h-[18px]" /> },
    { key: 'student_billing' as StudentMenuKey, label: 'Pembayaran SPP & Rekening', icon: <CreditCard className="w-[18px] h-[18px]" /> },
    { key: 'student_upload' as StudentMenuKey, label: 'Upload Bukti Bayar', icon: <Upload className="w-[18px] h-[18px]" /> },
    { key: 'student_profile' as StudentMenuKey, label: 'Profil Saya', icon: <User className="w-[18px] h-[18px]" /> },
  ];

  const navItems = isAdmin ? adminNav : studentNav;

  const initials = (user?.nama_lengkap || 'AF')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  const handleSelectNav = (key: string) => {
    onNavigate(key);
    setMobileOpen(false);
  };

  const renderSidebarContent = (isMobileDrawer = false) => (
    <div className="flex flex-col h-full bg-[#ECF4ED] border-r border-[#D5E4D7] text-[#122B18]">
      {/* Brand Area */}
      <div
        className={`flex items-center ${
          collapsed && !isMobileDrawer ? 'justify-center px-3' : 'justify-between px-4'
        } h-16 border-b border-[#D5E4D7] shrink-0`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={CAMPUS_LOGO_URL}
            alt="Logo STAI AL FURQAN Makassar"
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full object-contain bg-white p-0.5 border border-[#C8DBC9] shrink-0"
          />
          {(!collapsed || isMobileDrawer) && (
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-[#103A18] truncate leading-tight">
                STAI AL-FURQAN
              </p>
              <p className="text-[11px] font-medium text-[#7B6110] truncate">
                SIAKAD Makassar
              </p>
            </div>
          )}
        </div>
        {isMobileDrawer && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-[#4A6350] hover:bg-[#DFECE0]"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {(!collapsed || isMobileDrawer) && (
          <p className="px-3 pb-2 text-[11px] font-semibold text-[#4A6350]">
            {isAdmin ? 'Menu Administrasi' : 'Portal Mahasiswa'}
          </p>
        )}
        {navItems.map((item) => {
          const isActive =
            activePage === item.key ||
            (activePage === 'student_detail' && item.key === 'students');
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleSelectNav(item.key)}
              title={collapsed && !isMobileDrawer ? item.label : undefined}
              className={`w-full flex items-center ${
                collapsed && !isMobileDrawer ? 'justify-center px-2' : 'justify-between px-3'
              } py-2.5 rounded-xl text-[13px] font-semibold transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#146E22] text-white shadow-xs'
                  : 'text-[#214228] hover:bg-[#DFECE0] hover:text-[#103A18]'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className={isActive ? 'text-[#F3DE8A] shrink-0' : 'text-[#146E22] shrink-0'}>
                  {item.icon}
                </span>
                {(!collapsed || isMobileDrawer) && (
                  <span className="truncate">{item.label}</span>
                )}
              </span>
              {(!collapsed || isMobileDrawer) && item.badgeCount !== undefined && item.badgeCount > 0 && (
                <span
                  className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-md tabular-nums ${
                    isActive
                      ? 'bg-[#C9A227] text-[#122B18]'
                      : 'bg-[#FBF5DF] text-[#7B6110] border border-[#E5CF80]'
                  }`}
                >
                  {item.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Collapse Toggle (Desktop) */}
      <div className="p-3 border-t border-[#D5E4D7] shrink-0">
        {!isMobileDrawer && (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-[#3C5C43] hover:bg-[#DFECE0] transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Ringkas Sidebar</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F7FAF7] text-[#122B18]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 no-print ${
          collapsed ? 'w-[76px]' : 'w-[264px]'
        } sticky top-0 h-screen`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-[#122B18]/45 no-print"
          onClick={() => setMobileOpen(false)}
        >
          <div className="w-72 max-w-[85vw] h-full" onClick={(e) => e.stopPropagation()}>
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-[#D5E4D7] px-4 sm:px-6 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#122B18] hover:bg-[#ECF4ED]"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <img
              src={CAMPUS_LOGO_URL}
              alt="Logo STAI AL FURQAN"
              referrerPolicy="no-referrer"
              className="w-8 h-8 object-contain lg:hidden rounded-full border border-[#D5E4D7]"
            />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[#122B18] truncate">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Functional Payment Status Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2 rounded-lg text-[#3C5C43] hover:bg-[#ECF4ED] hover:text-[#122B18] transition-colors"
                aria-label="Notifikasi status pembayaran"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C9A227] text-[#122B18] font-mono text-[10px] font-bold flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setNotifOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-[#D5E4D7] rounded-xl shadow-xl z-40 overflow-hidden">
                    <div className="px-4 py-3 bg-[#F7FAF7] border-b border-[#D5E4D7] flex items-center justify-between">
                      <span className="text-xs font-bold text-[#122B18]">
                        Notifikasi Pembayaran SPP
                      </span>
                      <span className="text-[11px] font-mono text-[#4A6350] tabular-nums">
                        {notifications.length} item
                      </span>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-[#EDF3EE]">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-xs text-[#4A6350] text-center">
                          Belum ada notifikasi pembayaran terbaru.
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              setNotifOpen(false);
                              onNavigate(n.target);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-[#F7FAF7] transition-colors"
                          >
                            <p
                              className={`text-xs font-semibold ${
                                n.tone === 'danger'
                                  ? 'text-[#B91C1C]'
                                  : n.tone === 'warning'
                                  ? 'text-[#B45309]'
                                  : 'text-[#15803D]'
                              }`}
                            >
                              {n.title}
                            </p>
                            <p className="text-[11px] text-[#4A6350] mt-0.5 line-clamp-2">
                              {n.detail}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="h-6 w-px bg-[#D5E4D7] hidden sm:block" />

            {/* User Profile Display */}
            <div className="flex items-center gap-2.5">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.nama_lengkap}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-[#C8DBC9]"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#146E22] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {initials || <GraduationCap className="w-4 h-4" />}
                </div>
              )}
              <div className="hidden md:block text-left leading-tight max-w-[180px]">
                <p className="text-xs font-bold text-[#122B18] truncate">
                  {user?.nama_lengkap}
                </p>
                <p className="text-[11px] text-[#4A6350]">
                  {isAdmin ? 'Admin Akademik' : 'Mahasiswa'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#4A6350] hover:text-[#B91C1C] hover:bg-red-50 border border-[#D5E4D7] rounded-lg transition-colors whitespace-nowrap shrink-0"
              title="Keluar dari SIAKAD"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto print-container">
          {children}
        </main>
      </div>
    </div>
  );
};
