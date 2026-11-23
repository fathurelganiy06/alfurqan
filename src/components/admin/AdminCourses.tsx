import React, { useMemo, useState } from 'react';
import { Edit3, Plus, Search, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react';
import { useSiakad } from '../../context/SiakadContext';
import type { Course, HariKuliah } from '../../types/siakad';

const HARI_OPTIONS: HariKuliah[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const AdminCourses: React.FC = () => {
  const { data, saveCourse, deleteCourse, showToast } = useSiakad();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterSem, setFilterSem] = useState('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Course>>({});
  const [saving, setSaving] = useState(false);

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.courses
      .filter((c) => {
        if (
          q &&
          !c.nama_mk.toLowerCase().includes(q) &&
          !c.kode_mk.toLowerCase().includes(q) &&
          !c.dosen_pengampu.toLowerCase().includes(q)
        ) {
          return false;
        }
        if (filterDept !== 'ALL' && c.department_id !== filterDept) return false;
        if (filterSem !== 'ALL' && String(c.semester) !== filterSem) return false;
        return true;
      })
      .sort((a, b) => a.semester - b.semester || a.kode_mk.localeCompare(b.kode_mk));
  }, [data.courses, search, filterDept, filterSem]);

  const openNew = () => {
    setForm({
      department_id: filterDept !== 'ALL' ? filterDept : data.departments[0]?.id || '',
      kode_mk: '',
      nama_mk: '',
      sks: 3,
      semester: filterSem !== 'ALL' ? Number(filterSem) : 1,
      dosen_pengampu: '',
      hari: 'Senin',
      jam_mulai: '08:00',
      jam_selesai: '10:30',
      ruangan: 'R. Al-Ghazali 101',
      is_active: true,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveCourse(form);
      setModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan mata kuliah.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (course: Course) => {
    try {
      await saveCourse({ ...course, is_active: !course.is_active });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengubah status mata kuliah.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCourse(id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus mata kuliah.', 'error');
    }
  };

  return (
    <div className="bg-white border border-[#D5E4D7] rounded-xl overflow-hidden">
      <div className="p-5 border-b border-[#D5E4D7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#122B18]">Kurikulum & Jadwal Mata Kuliah</h2>
          <p className="text-xs text-[#4A6350] mt-0.5">
            Mata kuliah berstatus Aktif akan langsung muncul pada halaman pengisian KRS Mahasiswa terkait
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Tambah Mata Kuliah
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
            placeholder="Cari kode MK, nama mata kuliah, atau dosen..."
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
          value={filterSem}
          onChange={(e) => setFilterSem(e.target.value)}
          className="text-xs bg-white border border-[#C8DBC9] rounded-lg px-3 py-1.5"
        >
          <option value="ALL">Semua Semester</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <option key={s} value={String(s)}>
              Semester {s}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#D5E4D7] bg-[#F7FAF7] text-[11px] font-bold text-[#4A6350]">
              <th className="py-3 px-4">Kode & Mata Kuliah</th>
              <th className="py-3 px-4">Jurusan / Sem</th>
              <th className="py-3 px-4 text-center">SKS</th>
              <th className="py-3 px-4">Dosen Pengampu</th>
              <th className="py-3 px-4">Jadwal & Ruangan</th>
              <th className="py-3 px-4 text-center">Status KRS</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF3EE]">
            {filteredCourses.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-[#4A6350]">
                  Tidak ada mata kuliah sesuai filter yang dipilih.
                </td>
              </tr>
            ) : (
              filteredCourses.map((c) => {
                const dept = data.departments.find((d) => d.id === c.department_id);
                return (
                  <tr key={c.id} className="hover:bg-[#F7FAF7]/70">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[#146E22] block">{c.kode_mk}</span>
                      <span className="font-semibold text-[#122B18]">{c.nama_mk}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-[#122B18] block">{dept?.kode_jurusan || '-'}</span>
                      <span className="text-[11px] text-[#4A6350]">Semester {c.semester}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold tabular-nums">{c.sks}</td>
                    <td className="py-3 px-4 text-[#214228]">{c.dosen_pengampu}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[#122B18] block">
                        {c.hari}, {c.jam_mulai}–{c.jam_selesai}
                      </span>
                      <span className="text-[11px] text-[#4A6350]">{c.ruangan}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(c)}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          c.is_active ? 'text-[#15803D]' : 'text-[#64748B]'
                        }`}
                      >
                        {c.is_active ? (
                          <ToggleRight className="w-5 h-5 text-[#146E22]" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-slate-400" />
                        )}
                        {c.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setForm({ ...c });
                            setModalOpen(true);
                          }}
                          className="p-1.5 text-[#7B6110] hover:bg-[#FBF5DF] rounded-md"
                          title="Edit Mata Kuliah"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(c.id)}
                          className="p-1.5 text-[#B91C1C] hover:bg-red-50 rounded-md"
                          title="Hapus Mata Kuliah"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Course Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#122B18]/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D5E4D7] rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 bg-[#F7FAF7] border-b border-[#D5E4D7] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#122B18]">
                {form.id ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah Baru'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-[#4A6350]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Jurusan / Prodi *</label>
                  <select
                    required
                    value={form.department_id || ''}
                    onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                    className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg bg-white"
                  >
                    {data.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nama_jurusan}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Kode MK *</label>
                  <input
                    required
                    value={form.kode_mk || ''}
                    onChange={(e) => setForm({ ...form, kode_mk: e.target.value })}
                    placeholder="Contoh: PAI309"
                    className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1">Nama Mata Kuliah *</label>
                  <input
                    required
                    value={form.nama_mk || ''}
                    onChange={(e) => setForm({ ...form, nama_mk: e.target.value })}
                    placeholder="Nama lengkap mata kuliah"
                    className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">SKS *</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    required
                    value={form.sks ?? 3}
                    onChange={(e) => setForm({ ...form, sks: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Semester *</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    required
                    value={form.semester ?? 1}
                    onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1">Dosen Pengampu *</label>
                  <input
                    required
                    value={form.dosen_pengampu || ''}
                    onChange={(e) => setForm({ ...form, dosen_pengampu: e.target.value })}
                    placeholder="Nama dosen beserta gelar"
                    className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Hari Kuliah</label>
                  <select
                    value={form.hari || 'Senin'}
                    onChange={(e) => setForm({ ...form, hari: e.target.value as HariKuliah })}
                    className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg bg-white"
                  >
                    {HARI_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Ruangan *</label>
                  <input
                    required
                    value={form.ruangan || ''}
                    onChange={(e) => setForm({ ...form, ruangan: e.target.value })}
                    placeholder="R. Al-Ghazali 201"
                    className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Jam Mulai *</label>
                  <input
                    type="time"
                    required
                    value={form.jam_mulai || '08:00'}
                    onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })}
                    className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Jam Selesai *</label>
                  <input
                    type="time"
                    required
                    value={form.jam_selesai || '10:30'}
                    onChange={(e) => setForm({ ...form, jam_selesai: e.target.value })}
                    className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg font-mono"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active ?? true}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-[#C8DBC9] text-[#146E22] focus:ring-[#146E22]"
                />
                <span className="font-semibold text-[#122B18]">Aktifkan untuk pilihan KRS Mahasiswa</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EDF3EE]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 font-semibold text-[#4A6350] border border-[#D5E4D7] rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Mata Kuliah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
