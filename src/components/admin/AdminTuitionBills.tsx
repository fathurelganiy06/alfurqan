import React, { useMemo, useState } from 'react';
import { CalendarClock, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useSiakad } from '../../context/SiakadContext';
import type { InstallmentStatus, TuitionBill } from '../../types/siakad';
import { CURRENT_ACADEMIC_YEAR, formatDateID, formatRupiah } from '../../utils/formatters';
import { StatusText } from '../StatusText';

interface TerminDraft {
  termin_ke: number;
  nominal_termin: number;
  tanggal_jatuh_tempo: string;
  status: InstallmentStatus;
}

export const AdminTuitionBills: React.FC = () => {
  const { data, generateBills, configureInstallments, showToast } = useSiakad();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [generating, setGenerating] = useState(false);

  // Installment configuration modal state
  const [editingBill, setEditingBill] = useState<TuitionBill | null>(null);
  const [skema, setSkema] = useState<'Lunas Sekali Bayar' | 'Cicilan'>('Cicilan');
  const [terminCount, setTerminCount] = useState<number>(3);
  const [drafts, setDrafts] = useState<TerminDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const billRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.tuitionBills
      .map((bill) => {
        const student = data.students.find((s) => s.id === bill.student_id);
        const dept = data.departments.find((d) => d.id === student?.department_id);
        const schedules = data.installments
          .filter((i) => i.tuition_bill_id === bill.id)
          .sort((a, b) => a.termin_ke - b.termin_ke);
        return { bill, student, dept, schedules };
      })
      .filter((r) => {
        if (!r.student) return false;
        if (
          q &&
          !r.student.nama_lengkap.toLowerCase().includes(q) &&
          !r.student.nim.toLowerCase().includes(q)
        ) {
          return false;
        }
        if (filterDept !== 'ALL' && r.student.department_id !== filterDept) return false;
        if (filterStatus !== 'ALL' && r.bill.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => b.bill.tahun_akademik.localeCompare(a.bill.tahun_akademik) || a.student!.nim.localeCompare(b.student!.nim));
  }, [data.tuitionBills, data.students, data.departments, data.installments, search, filterDept, filterStatus]);

  const buildEqualDrafts = (total: number, count: number): TerminDraft[] => {
    const base = Math.floor(total / count / 1000) * 1000;
    const remainder = total - base * count;
    const startYear = 2026;
    const startMonth = 9; // Sep
    return Array.from({ length: count }, (_, idx) => {
      const m = startMonth + idx;
      const year = startYear + Math.floor((m - 1) / 12);
      const month = ((m - 1) % 12) + 1;
      const due = `${year}-${String(month).padStart(2, '0')}-20`;
      return {
        termin_ke: idx + 1,
        nominal_termin: idx === 0 ? base + remainder : base,
        tanggal_jatuh_tempo: due,
        status: 'Belum Bayar',
      };
    });
  };

  const openInstallmentModal = (bill: TuitionBill) => {
    setEditingBill(bill);
    const existing = data.installments
      .filter((i) => i.tuition_bill_id === bill.id)
      .sort((a, b) => a.termin_ke - b.termin_ke);

    if (bill.skema_bayar === 'Cicilan' && existing.length >= 2) {
      setSkema('Cicilan');
      setTerminCount(existing.length);
      setDrafts(
        existing.map((e) => ({
          termin_ke: e.termin_ke,
          nominal_termin: e.nominal_termin,
          tanggal_jatuh_tempo: e.tanggal_jatuh_tempo,
          status: e.status,
        }))
      );
    } else {
      setSkema('Cicilan');
      setTerminCount(3);
      setDrafts(buildEqualDrafts(bill.total_tagihan, 3));
    }
  };

  const handleChangeTerminCount = (count: number) => {
    setTerminCount(count);
    if (editingBill) {
      setDrafts(buildEqualDrafts(editingBill.total_tagihan, count));
    }
  };

  const handleSplitEvenly = () => {
    if (!editingBill) return;
    setDrafts(buildEqualDrafts(editingBill.total_tagihan, terminCount));
  };

  const draftSum = drafts.reduce((sum, d) => sum + (Number(d.nominal_termin) || 0), 0);
  const diffAmount = editingBill ? editingBill.total_tagihan - draftSum : 0;

  const handleSaveScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill) return;
    if (skema === 'Cicilan' && Math.abs(diffAmount) > 0) {
      showToast(
        `Total nominal termin harus persis sama dengan tagihan (${formatRupiah(editingBill.total_tagihan)}). Selisih saat ini ${formatRupiah(diffAmount)}.`,
        'error'
      );
      return;
    }

    setSaving(true);
    try {
      await configureInstallments(editingBill.id, skema, skema === 'Cicilan' ? drafts : []);
      setEditingBill(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan skema pembayaran.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateBills = async () => {
    setGenerating(true);
    try {
      await generateBills(CURRENT_ACADEMIC_YEAR, filterDept === 'ALL' ? undefined : filterDept);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menerbitkan tagihan SPP.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#D5E4D7] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#D5E4D7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#122B18]">Manajemen Tagihan & Cicilan SPP</h2>
            <p className="text-xs text-[#4A6350] mt-0.5">
              Terbitkan tagihan otomatis dari tarif SPP default jurusan dan atur skema bayar berkala (2x–4x cicilan)
            </p>
          </div>
          <button
            type="button"
            disabled={generating}
            onClick={() => void handleGenerateBills()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Menerbitkan...' : `Generate Tagihan TA ${CURRENT_ACADEMIC_YEAR}`}
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3.5 bg-[#F7FAF7] border-b border-[#D5E4D7] flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-[#4A6350] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama mahasiswa atau NIM..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#C8DBC9] rounded-lg focus:outline-none focus:border-[#146E22]"
            />
          </div>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="text-xs bg-white border border-[#C8DBC9] rounded-lg px-3 py-1.5"
          >
            <option value="ALL">Semua Jurusan</option>
            {data.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nama_jurusan}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-white border border-[#C8DBC9] rounded-lg px-3 py-1.5"
          >
            <option value="ALL">Semua Status</option>
            <option value="Belum Bayar">Belum Bayar</option>
            <option value="Cicilan Berjalan">Cicilan Berjalan</option>
            <option value="Lunas">Lunas</option>
          </select>
        </div>

        {/* Bills Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D5E4D7] bg-[#F7FAF7] text-[11px] font-bold text-[#4A6350]">
                <th className="py-3 px-4">Mahasiswa</th>
                <th className="py-3 px-4">Sem / TA</th>
                <th className="py-3 px-4">Skema & Jadwal Termin</th>
                <th className="py-3 px-4 text-right">Total Tagihan</th>
                <th className="py-3 px-4 text-right">Terbayar</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Pengaturan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF3EE]">
              {billRows.map(({ bill, student, dept, schedules }) => (
                <tr key={bill.id} className="hover:bg-[#F7FAF7]/70 align-top">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-[#122B18]">{student?.nama_lengkap}</p>
                    <p className="font-mono text-[11px] text-[#4A6350]">
                      {student?.nim} · {dept?.kode_jurusan}
                    </p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-[#122B18]">Semester {bill.semester}</p>
                    <p className="text-[11px] text-[#4A6350] font-mono">{bill.tahun_akademik}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-[#122B18]">{bill.skema_bayar}</p>
                    {schedules.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {schedules.map((sc) => (
                          <div key={sc.id} className="text-[11px] text-[#4A6350] flex items-center gap-2">
                            <span className="font-mono font-semibold text-[#122B18]">T{sc.termin_ke}:</span>
                            <span className="font-mono tabular-nums">{formatRupiah(sc.nominal_termin)}</span>
                            <span>· Tempo {formatDateID(sc.tanggal_jatuh_tempo)}</span>
                            <span>·</span>
                            <StatusText status={sc.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#122B18] tabular-nums">
                    {formatRupiah(bill.total_tagihan)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#146E22] tabular-nums">
                    {formatRupiah(bill.total_terbayar)}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusText status={bill.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      disabled={bill.status === 'Lunas'}
                      onClick={() => openInstallmentModal(bill)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6F560C] bg-[#FBF5DF] hover:bg-[#F5E9BD] border border-[#E5CF80] rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Atur Cicilan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Pengaturan Bayar Berkala (Cicilan) */}
      {editingBill && (
        <div className="fixed inset-0 z-50 bg-[#122B18]/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D5E4D7] rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 bg-[#F7FAF7] border-b border-[#D5E4D7] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-[#146E22]" />
                <h3 className="text-sm font-bold text-[#122B18]">
                  Pengaturan Skema Bayar Berkala (Cicilan)
                </h3>
              </div>
              <button type="button" onClick={() => setEditingBill(null)} className="text-[#4A6350]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveScheme} className="p-6 space-y-5 text-xs">
              <div className="p-4 rounded-xl bg-[#ECF4ED]/70 border border-[#D5E4D7] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-[#122B18]">
                    {data.students.find((s) => s.id === editingBill.student_id)?.nama_lengkap}
                  </p>
                  <p className="text-[#4A6350]">
                    Semester {editingBill.semester} · TA {editingBill.tahun_akademik}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[#4A6350] block">Total Tagihan SPP</span>
                  <span className="font-mono text-base font-extrabold text-[#146E22] tabular-nums">
                    {formatRupiah(editingBill.total_tagihan)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#122B18] mb-2">Skema Pembayaran</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['Lunas Sekali Bayar', 'Cicilan'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSkema(opt)}
                      className={`px-3 py-2.5 rounded-lg border font-semibold transition-colors ${
                        skema === opt
                          ? 'bg-[#146E22] text-white border-[#146E22]'
                          : 'bg-white text-[#214228] border-[#C8DBC9] hover:bg-[#F7FAF7]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {skema === 'Cicilan' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#122B18]">Jumlah Termin:</span>
                      <div className="inline-flex bg-[#ECF4ED] p-1 rounded-lg gap-1">
                        {[2, 3, 4].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleChangeTerminCount(num)}
                            className={`px-3 py-1 rounded-md font-mono font-bold transition-colors ${
                              terminCount === num
                                ? 'bg-white text-[#146E22] shadow-xs'
                                : 'text-[#4A6350] hover:text-[#122B18]'
                            }`}
                          >
                            {num}x
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSplitEvenly}
                      className="text-xs font-semibold text-[#146E22] hover:underline"
                    >
                      Bagi Rata Otomatis
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {drafts.map((d, idx) => (
                      <div
                        key={d.termin_ke}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center p-3 rounded-lg bg-[#F7FAF7] border border-[#E2ECE4]"
                      >
                        <div className="sm:col-span-3 font-bold text-[#122B18]">
                          Termin ke-{d.termin_ke}
                        </div>
                        <div className="sm:col-span-5">
                          <label className="text-[11px] text-[#4A6350] block mb-0.5">Nominal (Rp)</label>
                          <input
                            type="number"
                            min={1000}
                            step={1000}
                            required
                            value={d.nominal_termin}
                            onChange={(e) => {
                              const next = [...drafts];
                              next[idx] = { ...next[idx], nominal_termin: Number(e.target.value) };
                              setDrafts(next);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-[#C8DBC9] rounded-md font-mono"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <label className="text-[11px] text-[#4A6350] block mb-0.5">Jatuh Tempo</label>
                          <input
                            type="date"
                            required
                            value={d.tanggal_jatuh_tempo}
                            onChange={(e) => {
                              const next = [...drafts];
                              next[idx] = { ...next[idx], tanggal_jatuh_tempo: e.target.value };
                              setDrafts(next);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-[#C8DBC9] rounded-md font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className={`p-3 rounded-lg border flex items-center justify-between text-xs font-semibold ${
                      diffAmount === 0
                        ? 'bg-[#ECF4ED] border-[#B6D5BA] text-[#15803D]'
                        : 'bg-red-50 border-red-200 text-[#B91C1C]'
                    }`}
                  >
                    <span>Total Akumulasi Termin:</span>
                    <span className="font-mono tabular-nums">
                      {formatRupiah(draftSum)}
                      {diffAmount !== 0 && ` (Selisih ${formatRupiah(diffAmount)})`}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EDF3EE]">
                <button
                  type="button"
                  onClick={() => setEditingBill(null)}
                  className="px-4 py-2 font-semibold text-[#4A6350] border border-[#D5E4D7] rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || (skema === 'Cicilan' && diffAmount !== 0)}
                  className="px-5 py-2 font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Skema Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
