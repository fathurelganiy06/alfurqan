import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Download,
  Eye,
  FileCheck2,
  Filter,
  Printer,
} from 'lucide-react';
import { useSiakad } from '../../context/SiakadContext';
import { exportToCsv, formatRupiah } from '../../utils/formatters';
import { OfficialLetterhead, OfficialSignatureFooter } from '../OfficialLetterhead';
import { StatusText } from '../StatusText';

interface AdminDashboardProps {
  onViewStudent: (studentId: string) => void;
  onGoToVerification: () => void;
}

const MONTH_LABELS = ['Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov'];
const MONTH_INDEX_MAP: Record<number, string> = {
  5: 'Jun',
  6: 'Jul',
  7: 'Agu',
  8: 'Sep',
  9: 'Okt',
  10: 'Nov',
};

const DONUT_COLORS = ['#146E22', '#C9A227', '#C94038'];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onViewStudent,
  onGoToVerification,
}) => {
  const { data, showToast } = useSiakad();
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterAngkatan, setFilterAngkatan] = useState('ALL');
  const [filterSemester, setFilterSemester] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // KPI Metrics
  const kpis = useMemo(() => {
    const activeStudents = data.students.filter((s) => s.status === 'Aktif').length;
    const totalFaculties = data.faculties.length;
    const totalDepartments = data.departments.length;

    const totalVerifiedIncome = data.tuitionBills.reduce((acc, b) => acc + b.total_terbayar, 0);
    const totalUnpaidArrears = data.tuitionBills.reduce(
      (acc, b) => acc + Math.max(0, b.total_tagihan - b.total_terbayar),
      0
    );
    const pendingProofs = data.paymentProofs.filter(
      (p) => p.status_verifikasi === 'Menunggu Verifikasi'
    ).length;

    return {
      activeStudents,
      totalFaculties,
      totalDepartments,
      totalVerifiedIncome,
      totalUnpaidArrears,
      pendingProofs,
    };
  }, [data]);

  // Chart 1: Students per Department
  const deptChartData = useMemo(() => {
    return data.departments.map((d) => ({
      kode: d.kode_jurusan,
      nama: d.nama_jurusan,
      jumlah: data.students.filter((s) => s.department_id === d.id).length,
    }));
  }, [data.departments, data.students]);

  // Chart 2: Monthly Approved Revenue Trend
  const monthlyIncomeData = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (const m of MONTH_LABELS) buckets[m] = 0;

    for (const p of data.paymentProofs) {
      if (p.status_verifikasi !== 'Disetujui') continue;
      const d = new Date(`${p.tanggal_transfer}T00:00:00`);
      if (Number.isNaN(d.getTime())) continue;
      const label = MONTH_INDEX_MAP[d.getMonth()];
      if (label) {
        buckets[label] += p.nominal_transfer;
      } else {
        buckets['Nov'] += p.nominal_transfer;
      }
    }

    return MONTH_LABELS.map((bulan) => ({
      bulan,
      pemasukan: buckets[bulan],
    }));
  }, [data.paymentProofs]);

  // Chart 3: Payment Status Distribution (Active Semester Bills)
  const paymentStatusData = useMemo(() => {
    const currentBills = data.tuitionBills.filter((b) => b.tahun_akademik === '2026/2027');
    const source = currentBills.length > 0 ? currentBills : data.tuitionBills;
    const lunas = source.filter((b) => b.status === 'Lunas').length;
    const cicilan = source.filter((b) => b.status === 'Cicilan Berjalan').length;
    const belum = source.filter((b) => b.status === 'Belum Bayar').length;
    return [
      { name: 'Lunas', value: lunas },
      { name: 'Cicilan Berjalan', value: cicilan },
      { name: 'Belum Bayar', value: belum },
    ];
  }, [data.tuitionBills]);

  const angkatanOptions = useMemo(() => {
    const set = new Set(data.students.map((s) => s.angkatan));
    return Array.from(set).sort((a, b) => b - a);
  }, [data.students]);

  const semesterOptions = useMemo(() => {
    const set = new Set(data.tuitionBills.map((b) => b.semester));
    return Array.from(set).sort((a, b) => a - b);
  }, [data.tuitionBills]);

  // Arrears / Billing Report Rows
  const reportRows = useMemo(() => {
    return data.tuitionBills
      .map((bill) => {
        const student = data.students.find((s) => s.id === bill.student_id);
        const dept = data.departments.find((d) => d.id === student?.department_id);
        const sisa = Math.max(0, bill.total_tagihan - bill.total_terbayar);
        return {
          bill,
          student,
          dept,
          sisa,
        };
      })
      .filter((row) => {
        if (!row.student) return false;
        if (filterDept !== 'ALL' && row.student.department_id !== filterDept) return false;
        if (filterAngkatan !== 'ALL' && String(row.student.angkatan) !== filterAngkatan) return false;
        if (filterSemester !== 'ALL' && String(row.bill.semester) !== filterSemester) return false;
        if (filterStatus !== 'ALL' && row.bill.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => b.sisa - a.sisa);
  }, [data.tuitionBills, data.students, data.departments, filterDept, filterAngkatan, filterSemester, filterStatus]);

  const filteredTotals = useMemo(() => {
    return reportRows.reduce(
      (acc, r) => ({
        tagihan: acc.tagihan + r.bill.total_tagihan,
        terbayar: acc.terbayar + r.bill.total_terbayar,
        sisa: acc.sisa + r.sisa,
      }),
      { tagihan: 0, terbayar: 0, sisa: 0 }
    );
  }, [reportRows]);

  const handleExportCsv = () => {
    exportToCsv(
      `Laporan_Tunggakan_SPP_STAI_AL_FURQAN.csv`,
      [
        'NIM',
        'Nama Mahasiswa',
        'Jurusan',
        'Angkatan',
        'Semester',
        'Tahun Akademik',
        'Skema Bayar',
        'Total Tagihan (Rp)',
        'Sudah Dibayar (Rp)',
        'Sisa Tunggakan (Rp)',
        'Status',
      ],
      reportRows.map((r) => [
        r.student?.nim || '-',
        r.student?.nama_lengkap || '-',
        r.dept?.nama_jurusan || '-',
        r.student?.angkatan || '-',
        r.bill.semester,
        r.bill.tahun_akademik,
        r.bill.skema_bayar,
        r.bill.total_tagihan,
        r.bill.total_terbayar,
        r.sisa,
        r.bill.status,
      ])
    );
    showToast('Laporan tunggakan SPP berhasil diekspor ke CSV.');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <OfficialLetterhead
        documentTitle="LAPORAN REKAPITULASI PEMBAYARAN & TUNGGAKAN SPP MAHASISWA"
        subtitle="Tahun Akademik 2026/2027 · Bagian Keuangan STAI AL-FURQAN Makassar"
      />

      {/* 5 KPI Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 no-print">
        <div className="bg-white border border-[#D5E4D7] rounded-xl p-5">
          <p className="text-xs font-medium text-[#4A6350]">Mahasiswa Aktif</p>
          <p className="text-2xl font-extrabold font-mono text-[#122B18] mt-2 tabular-nums">
            {kpis.activeStudents}
          </p>
          <p className="text-xs text-[#4A6350] mt-1.5">
            Total terdaftar: {data.students.length} mahasiswa
          </p>
        </div>

        <div className="bg-white border border-[#D5E4D7] rounded-xl p-5">
          <p className="text-xs font-medium text-[#4A6350]">Fakultas & Jurusan</p>
          <p className="text-2xl font-extrabold font-mono text-[#122B18] mt-2 tabular-nums">
            {kpis.totalFaculties} / {kpis.totalDepartments}
          </p>
          <p className="text-xs text-[#4A6350] mt-1.5">
            {kpis.totalFaculties} Fakultas · {kpis.totalDepartments} Prodi S1
          </p>
        </div>

        <div className="bg-white border border-[#D5E4D7] rounded-xl p-5">
          <p className="text-xs font-medium text-[#4A6350]">Pemasukan SPP Terverifikasi</p>
          <p className="text-xl font-extrabold font-mono text-[#146E22] mt-2 tabular-nums">
            {formatRupiah(kpis.totalVerifiedIncome)}
          </p>
          <p className="text-xs text-[#4A6350] mt-1.5">Akumulasi pembayaran disetujui</p>
        </div>

        <div className="bg-white border border-[#D5E4D7] rounded-xl p-5">
          <p className="text-xs font-medium text-[#4A6350]">Total Tunggakan SPP</p>
          <p className="text-xl font-extrabold font-mono text-[#B91C1C] mt-2 tabular-nums">
            {formatRupiah(kpis.totalUnpaidArrears)}
          </p>
          <p className="text-xs text-[#4A6350] mt-1.5">Sisa tagihan belum lunas</p>
        </div>

        <button
          type="button"
          onClick={onGoToVerification}
          className="text-left bg-[#FBF5DF] border border-[#E5CF80] hover:border-[#C9A227] rounded-xl p-5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#6F560C]">Menunggu Verifikasi</p>
            <FileCheck2 className="w-4 h-4 text-[#8F6F12]" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-[#5C4507] mt-2 tabular-nums">
            {kpis.pendingProofs}
          </p>
          <p className="text-xs font-medium text-[#7B6110] mt-1.5">
            Klik untuk proses antrean bukti →
          </p>
        </button>
      </section>

      {/* Interactive Analytics Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 no-print">
        {/* Bar Chart: Students per Department */}
        <div className="lg:col-span-4 bg-white border border-[#D5E4D7] rounded-xl p-5 flex flex-col">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-[#122B18]">Mahasiswa per Program Studi</h2>
            <p className="text-xs text-[#4A6350] mt-0.5">Sebaran mahasiswa terdaftar tiap jurusan</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8F0E9" vertical={false} />
                <XAxis dataKey="kode" tick={{ fontSize: 12, fill: '#4A6350' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#4A6350' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => [`${Number(value ?? 0)} Mahasiswa`, 'Jumlah']}
                  labelFormatter={(label) => {
                    const found = deptChartData.find((d) => d.kode === label);
                    return found ? found.nama : label;
                  }}
                  contentStyle={{ borderRadius: 10, borderColor: '#D5E4D7', fontSize: 12 }}
                />
                <Bar dataKey="jumlah" fill="#146E22" radius={[6, 6, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Area Chart: Monthly SPP Income Trend */}
        <div className="lg:col-span-5 bg-white border border-[#D5E4D7] rounded-xl p-5 flex flex-col">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-[#122B18]">Tren Pemasukan SPP Bulanan</h2>
            <p className="text-xs text-[#4A6350] mt-0.5">Total pembayaran SPP terverifikasi per bulan (Rp)</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyIncomeData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#146E22" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#146E22" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8F0E9" vertical={false} />
                <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: '#4A6350' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`}
                  tick={{ fontSize: 11, fill: '#4A6350' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [formatRupiah(Number(value ?? 0)), 'Pemasukan']}
                  contentStyle={{ borderRadius: 10, borderColor: '#D5E4D7', fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="pemasukan"
                  stroke="#146E22"
                  strokeWidth={2.5}
                  fill="url(#incomeGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Payment Status Proportion */}
        <div className="lg:col-span-3 bg-white border border-[#D5E4D7] rounded-xl p-5 flex flex-col">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-[#122B18]">Proporsi Status SPP</h2>
            <p className="text-xs text-[#4A6350] mt-0.5">Semester aktif TA 2026/2027</p>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {paymentStatusData.map((entry, idx) => (
                    <Cell key={entry.name} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${Number(value ?? 0)} Tagihan`, 'Jumlah']}
                  contentStyle={{ borderRadius: 10, borderColor: '#D5E4D7', fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-auto pt-2 border-t border-[#EDF3EE] space-y-1.5">
            {paymentStatusData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-[#214228]">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: DONUT_COLORS[idx] }}
                  />
                  {item.name}
                </span>
                <span className="font-mono font-bold text-[#122B18] tabular-nums">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Arrears Report Table + Filters + Export CSV + Print */}
      <section className="bg-white border border-[#D5E4D7] rounded-xl overflow-hidden print-container">
        <div className="p-5 border-b border-[#D5E4D7] flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
          <div>
            <h2 className="text-base font-bold text-[#122B18]">Laporan Tunggakan & Pembayaran SPP</h2>
            <p className="text-xs text-[#4A6350] mt-0.5">
              Rincian tagihan, pembayaran terverifikasi, dan sisa kewajiban seluruh mahasiswa
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#122B18] bg-[#F7FAF7] hover:bg-[#ECF4ED] border border-[#C8DBC9] rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-[#146E22]" />
              Export ke CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg transition-colors whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Laporan
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-3.5 bg-[#F7FAF7] border-b border-[#D5E4D7] flex flex-wrap items-center gap-3 no-print">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A6350]">
            <Filter className="w-3.5 h-3.5" />
            Filter:
          </span>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="text-xs bg-white border border-[#C8DBC9] rounded-lg px-3 py-1.5 text-[#122B18] focus:outline-none focus:border-[#146E22]"
          >
            <option value="ALL">Semua Jurusan</option>
            {data.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nama_jurusan}
              </option>
            ))}
          </select>

          <select
            value={filterAngkatan}
            onChange={(e) => setFilterAngkatan(e.target.value)}
            className="text-xs bg-white border border-[#C8DBC9] rounded-lg px-3 py-1.5 text-[#122B18] focus:outline-none focus:border-[#146E22]"
          >
            <option value="ALL">Semua Angkatan</option>
            {angkatanOptions.map((a) => (
              <option key={a} value={String(a)}>
                Angkatan {a}
              </option>
            ))}
          </select>

          <select
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="text-xs bg-white border border-[#C8DBC9] rounded-lg px-3 py-1.5 text-[#122B18] focus:outline-none focus:border-[#146E22]"
          >
            <option value="ALL">Semua Semester</option>
            {semesterOptions.map((s) => (
              <option key={s} value={String(s)}>
                Semester {s}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-white border border-[#C8DBC9] rounded-lg px-3 py-1.5 text-[#122B18] focus:outline-none focus:border-[#146E22]"
          >
            <option value="ALL">Semua Status</option>
            <option value="Belum Bayar">Belum Bayar</option>
            <option value="Cicilan Berjalan">Cicilan Berjalan</option>
            <option value="Lunas">Lunas</option>
          </select>

          {(filterDept !== 'ALL' ||
            filterAngkatan !== 'ALL' ||
            filterSemester !== 'ALL' ||
            filterStatus !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setFilterDept('ALL');
                setFilterAngkatan('ALL');
                setFilterSemester('ALL');
                setFilterStatus('ALL');
              }}
              className="text-xs font-semibold text-[#146E22] hover:underline"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D5E4D7] bg-[#F7FAF7] text-[11px] font-bold text-[#4A6350]">
                <th className="py-3 px-4">NIM & Mahasiswa</th>
                <th className="py-3 px-4">Jurusan / Sem</th>
                <th className="py-3 px-4">Skema</th>
                <th className="py-3 px-4 text-right">Total Tagihan</th>
                <th className="py-3 px-4 text-right">Sudah Dibayar</th>
                <th className="py-3 px-4 text-right">Sisa Tunggakan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF3EE] text-xs">
              {reportRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#4A6350]">
                    Tidak ada data tagihan yang sesuai dengan filter dipilih.
                  </td>
                </tr>
              ) : (
                reportRows.map(({ bill, student, dept, sisa }) => (
                  <tr key={bill.id} className="hover:bg-[#F7FAF7]/70 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#122B18]">{student?.nama_lengkap}</p>
                      <p className="font-mono text-[11px] text-[#4A6350] tabular-nums">
                        {student?.nim} · Angkatan {student?.angkatan}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-[#122B18]">{dept?.nama_jurusan || '-'}</p>
                      <p className="text-[11px] text-[#4A6350]">
                        Semester {bill.semester} · TA {bill.tahun_akademik}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-[#214228]">{bill.skema_bayar}</td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-[#122B18] tabular-nums">
                      {formatRupiah(bill.total_tagihan)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-[#146E22] tabular-nums">
                      {formatRupiah(bill.total_terbayar)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-[#B91C1C]">
                      {sisa > 0 ? formatRupiah(sisa) : <span className="text-[#15803D]">Rp 0</span>}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={bill.status} />
                    </td>
                    <td className="py-3 px-4 text-right no-print">
                      {student && (
                        <button
                          type="button"
                          onClick={() => onViewStudent(student.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#146E22] hover:bg-[#ECF4ED] rounded-md transition-colors whitespace-nowrap"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Detail
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {reportRows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[#D5E4D7] bg-[#ECF4ED]/60 text-xs font-bold text-[#122B18]">
                  <td colSpan={3} className="py-3 px-4">
                    Total ({reportRows.length} tagihan ditampilkan)
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatRupiah(filteredTotals.tagihan)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#146E22] tabular-nums">
                    {formatRupiah(filteredTotals.terbayar)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#B91C1C] tabular-nums">
                    {formatRupiah(filteredTotals.sisa)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <OfficialSignatureFooter />
    </div>
  );
};
