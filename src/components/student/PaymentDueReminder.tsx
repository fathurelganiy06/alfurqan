import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Upload,
} from 'lucide-react';
import type { InstallmentSchedule, TuitionBill } from '../../types/siakad';
import { formatDateID, formatRupiah } from '../../utils/formatters';
import { StatusText } from '../StatusText';

interface PaymentDueReminderProps {
  bills: TuitionBill[];
  installments: InstallmentSchedule[];
  onPayNow: (preset: { billId: string; installmentId?: string; nominal?: number }) => void;
  onViewBilling: () => void;
}

interface ReminderItem {
  id: string;
  billId: string;
  installmentId?: string;
  title: string;
  subtitle: string;
  nominal: number;
  dueDate: string;
  status: string;
  diffMs: number;
  diffDays: number;
  diffHours: number;
  urgency: 'overdue' | 'critical' | 'upcoming';
}

function parseDueEndOfDay(dateStr: string): number {
  const parts = dateStr.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return Date.now();
  return new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999).getTime();
}

function getStartOfTodayMs(nowMs: number): number {
  const d = new Date(nowMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
}

export const PaymentDueReminder: React.FC<PaymentDueReminderProps> = ({
  bills,
  installments,
  onPayNow,
  onViewBilling,
}) => {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const { urgentItems, nextLaterItem } = useMemo(() => {
    const todayStart = getStartOfTodayMs(nowMs);
    const items: ReminderItem[] = [];

    for (const inst of installments) {
      if (inst.status === 'Lunas') continue;
      const bill = bills.find((b) => b.id === inst.tuition_bill_id);
      if (!bill || bill.status === 'Lunas') continue;

      const dueEnd = parseDueEndOfDay(inst.tanggal_jatuh_tempo);
      const dueDayStart = new Date(
        parseInt(inst.tanggal_jatuh_tempo.slice(0, 4), 10),
        parseInt(inst.tanggal_jatuh_tempo.slice(5, 7), 10) - 1,
        parseInt(inst.tanggal_jatuh_tempo.slice(8, 10), 10)
      ).getTime();

      const diffDays = Math.round((dueDayStart - todayStart) / 86_400_000);
      const diffMs = dueEnd - nowMs;
      const remainingHours = Math.max(0, Math.floor((diffMs % 86_400_000) / 3_600_000));

      const urgency: ReminderItem['urgency'] =
        diffDays < 0 ? 'overdue' : diffDays <= 2 ? 'critical' : 'upcoming';

      items.push({
        id: inst.id,
        billId: bill.id,
        installmentId: inst.id,
        title: `Cicilan SPP Termin ke-${inst.termin_ke}`,
        subtitle: `Semester ${bill.semester} · TA ${bill.tahun_akademik}`,
        nominal: inst.nominal_termin,
        dueDate: inst.tanggal_jatuh_tempo,
        status: inst.status,
        diffMs,
        diffDays,
        diffHours: remainingHours,
        urgency,
      });
    }

    items.sort((a, b) => a.diffDays - b.diffDays);

    const withinSevenDays = items.filter((item) => item.diffDays <= 7);
    const laterItem = items.find((item) => item.diffDays > 7) || null;

    return { urgentItems: withinSevenDays, nextLaterItem: laterItem };
  }, [bills, installments, nowMs]);

  if (urgentItems.length === 0) {
    return (
      <section className="bg-white border border-[#D5E4D7] rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#ECF4ED] text-[#146E22] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <h3 className="font-bold text-[#122B18]">Pengingat Jatuh Tempo SPP (7 Hari ke Depan)</h3>
            <p className="text-[#4A6350] mt-0.5">
              {nextLaterItem
                ? `Tidak ada tagihan jatuh tempo dalam 7 hari ke depan. Jadwal berikutnya: ${nextLaterItem.title} pada ${formatDateID(nextLaterItem.dueDate)} (${nextLaterItem.diffDays} hari lagi).`
                : 'Tidak ada tagihan SPP yang mendekati jatuh tempo dalam 7 hari ke depan.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onViewBilling}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#146E22] hover:underline whitespace-nowrap shrink-0"
        >
          Lihat Jadwal SPP
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </section>
    );
  }

  const hasOverdueOrCritical = urgentItems.some(
    (item) => item.urgency === 'overdue' || item.urgency === 'critical'
  );

  return (
    <section
      className={`rounded-xl border overflow-hidden ${
        hasOverdueOrCritical
          ? 'bg-red-50/70 border-red-200'
          : 'bg-[#FBF5DF]/75 border-[#E5CF80]'
      }`}
    >
      {/* Header */}
      <div
        className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-2 ${
          hasOverdueOrCritical
            ? 'border-red-200/80 bg-red-50'
            : 'border-[#E5CF80]/80 bg-[#FBF5DF]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {hasOverdueOrCritical ? (
            <AlertTriangle className="w-4 h-4 text-[#B91C1C] shrink-0" />
          ) : (
            <CalendarClock className="w-4 h-4 text-[#8F6F12] shrink-0" />
          )}
          <div>
            <h3
              className={`text-sm font-bold ${
                hasOverdueOrCritical ? 'text-[#991B1B]' : 'text-[#5C4507]'
              }`}
            >
              Pengingat Jatuh Tempo SPP (7 Hari ke Depan)
            </h3>
            <p
              className={`text-xs ${
                hasOverdueOrCritical ? 'text-[#B91C1C]/90' : 'text-[#7B6110]'
              }`}
            >
              {urgentItems.length} jadwal pembayaran SPP memerlukan perhatian segera sebelum batas waktu berakhir
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewBilling}
          className={`text-xs font-semibold hover:underline whitespace-nowrap ${
            hasOverdueOrCritical ? 'text-[#991B1B]' : 'text-[#6F560C]'
          }`}
        >
          Lihat Semua Tagihan →
        </button>
      </div>

      {/* Reminder Items */}
      <div className="divide-y divide-[#E5CF80]/50">
        {urgentItems.map((item) => {
          const isOverdue = item.urgency === 'overdue';
          const isCritical = item.urgency === 'critical';

          const countdownText = isOverdue
            ? `Terlambat ${Math.abs(item.diffDays)} Hari`
            : item.diffDays === 0
            ? `Hari Ini (${item.diffHours} jam lagi)`
            : `${item.diffDays} Hari ${item.diffHours} Jam Lagi`;

          const badgeCode = isOverdue
            ? `H+${Math.abs(item.diffDays)}`
            : `H-${item.diffDays}`;

          return (
            <div
              key={item.id}
              className="px-5 py-4 bg-white/85 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                {/* Countdown Tile */}
                <div
                  className={`w-16 h-14 rounded-xl border flex flex-col items-center justify-center shrink-0 ${
                    isOverdue || isCritical
                      ? 'bg-red-50 border-red-200 text-[#B91C1C]'
                      : 'bg-[#FBF5DF] border-[#DFC772] text-[#7B6110]'
                  }`}
                >
                  <span className="font-mono text-base font-extrabold leading-none tabular-nums">
                    {badgeCode}
                  </span>
                  <span className="text-[10px] font-semibold mt-1">
                    {isOverdue ? 'Lewat' : 'Tempo'}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p className="text-sm font-bold text-[#122B18]">{item.title}</p>
                    <span className="text-xs text-[#4A6350]">· {item.subtitle}</span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 font-mono font-bold tabular-nums ${
                        isOverdue || isCritical ? 'text-[#B91C1C]' : 'text-[#B45309]'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      {countdownText}
                    </span>
                    <span className="text-[#4A6350]">
                      Jatuh tempo: <strong className="font-mono text-[#122B18]">{formatDateID(item.dueDate)}</strong>
                    </span>
                    <StatusText status={item.status} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pl-20 md:pl-0">
                <div className="text-left md:text-right">
                  <span className="text-[11px] text-[#4A6350] block">Nominal Termin</span>
                  <span className="font-mono text-base font-extrabold text-[#122B18] tabular-nums">
                    {formatRupiah(item.nominal)}
                  </span>
                </div>

                {item.status === 'Belum Bayar' ? (
                  <button
                    type="button"
                    onClick={() =>
                      onPayNow({
                        billId: item.billId,
                        installmentId: item.installmentId,
                        nominal: item.nominal,
                      })
                    }
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white rounded-lg transition-colors whitespace-nowrap ${
                      isOverdue || isCritical
                        ? 'bg-[#B91C1C] hover:bg-red-800'
                        : 'bg-[#146E22] hover:bg-[#0F561A]'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Bayar Sekarang
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onViewBilling}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-[#5C4507] bg-[#FBF5DF] hover:bg-[#F5E9BD] border border-[#DFC772] rounded-lg whitespace-nowrap"
                  >
                    Cek Status
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
