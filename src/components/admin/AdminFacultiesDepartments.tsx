import React, { useState } from 'react';
import { Building2, Edit3, GraduationCap, Plus, Trash2, X } from 'lucide-react';
import { useSiakad } from '../../context/SiakadContext';
import type { Department, Faculty, JenjangStudi } from '../../types/siakad';
import { formatRupiah } from '../../utils/formatters';

export const AdminFacultiesDepartments: React.FC = () => {
  const { data, saveFaculty, deleteFaculty, saveDepartment, deleteDepartment, showToast } = useSiakad();

  const [facModal, setFacModal] = useState(false);
  const [facForm, setFacForm] = useState<Partial<Faculty>>({ kode_fakultas: '', nama_fakultas: '', dekan: '' });

  const [deptModal, setDeptModal] = useState(false);
  const [deptForm, setDeptForm] = useState<Partial<Department>>({
    faculty_id: '',
    kode_jurusan: '',
    nama_jurusan: '',
    jenjang: 'S1',
    biaya_spp_default: 2500000,
  });

  const [saving, setSaving] = useState(false);

  const handleSaveFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveFaculty(facForm);
      setFacModal(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan fakultas.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFaculty = async (id: string) => {
    try {
      await deleteFaculty(id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Tidak dapat menghapus fakultas.', 'error');
    }
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveDepartment(deptForm);
      setDeptModal(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan jurusan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    try {
      await deleteDepartment(id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Tidak dapat menghapus jurusan.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Fakultas Section */}
      <section className="bg-white border border-[#D5E4D7] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#D5E4D7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-[#146E22]" />
            <div>
              <h2 className="text-base font-bold text-[#122B18]">Daftar Fakultas</h2>
              <p className="text-xs text-[#4A6350]">Kelola unit fakultas dan pimpinan dekanat STAI AL-FURQAN Makassar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setFacForm({ kode_fakultas: '', nama_fakultas: '', dekan: '' });
              setFacModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Tambah Fakultas
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D5E4D7] bg-[#F7FAF7] text-[11px] font-bold text-[#4A6350]">
                <th className="py-3 px-4">Kode</th>
                <th className="py-3 px-4">Nama Fakultas</th>
                <th className="py-3 px-4">Dekan</th>
                <th className="py-3 px-4 text-center">Jumlah Prodi</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF3EE]">
              {data.faculties.map((f) => {
                const deptCount = data.departments.filter((d) => d.faculty_id === f.id).length;
                return (
                  <tr key={f.id} className="hover:bg-[#F7FAF7]/70">
                    <td className="py-3 px-4 font-mono font-bold text-[#146E22]">{f.kode_fakultas}</td>
                    <td className="py-3 px-4 font-semibold text-[#122B18]">{f.nama_fakultas}</td>
                    <td className="py-3 px-4 text-[#4A6350]">{f.dekan}</td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums">{deptCount}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setFacForm({ ...f });
                            setFacModal(true);
                          }}
                          className="p-1.5 text-[#7B6110] hover:bg-[#FBF5DF] rounded-md"
                          title="Edit Fakultas"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteFaculty(f.id)}
                          className="p-1.5 text-[#B91C1C] hover:bg-red-50 rounded-md"
                          title="Hapus Fakultas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Jurusan / Program Studi Section */}
      <section className="bg-white border border-[#D5E4D7] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#D5E4D7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-5 h-5 text-[#146E22]" />
            <div>
              <h2 className="text-base font-bold text-[#122B18]">Jurusan / Program Studi & Tarif SPP</h2>
              <p className="text-xs text-[#4A6350]">
                Atur program studi serta nominal biaya SPP default per semester sebagai acuan generate tagihan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeptForm({
                faculty_id: data.faculties[0]?.id || '',
                kode_jurusan: '',
                nama_jurusan: '',
                jenjang: 'S1',
                biaya_spp_default: 2500000,
              });
              setDeptModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Tambah Jurusan
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D5E4D7] bg-[#F7FAF7] text-[11px] font-bold text-[#4A6350]">
                <th className="py-3 px-4">Kode</th>
                <th className="py-3 px-4">Nama Jurusan / Prodi</th>
                <th className="py-3 px-4">Fakultas</th>
                <th className="py-3 px-4 text-center">Jenjang</th>
                <th className="py-3 px-4 text-right">Biaya SPP Default / Sem</th>
                <th className="py-3 px-4 text-center">Mahasiswa</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF3EE]">
              {data.departments.map((d) => {
                const fac = data.faculties.find((f) => f.id === d.faculty_id);
                const mhsCount = data.students.filter((s) => s.department_id === d.id).length;
                return (
                  <tr key={d.id} className="hover:bg-[#F7FAF7]/70">
                    <td className="py-3 px-4 font-mono font-bold text-[#146E22]">{d.kode_jurusan}</td>
                    <td className="py-3 px-4 font-semibold text-[#122B18]">{d.nama_jurusan}</td>
                    <td className="py-3 px-4 text-[#4A6350]">{fac?.nama_fakultas || '-'}</td>
                    <td className="py-3 px-4 text-center font-mono font-semibold">{d.jenjang}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#122B18] tabular-nums">
                      {formatRupiah(d.biaya_spp_default)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums">{mhsCount}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDeptForm({ ...d });
                            setDeptModal(true);
                          }}
                          className="p-1.5 text-[#7B6110] hover:bg-[#FBF5DF] rounded-md"
                          title="Edit Jurusan"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteDepartment(d.id)}
                          className="p-1.5 text-[#B91C1C] hover:bg-red-50 rounded-md"
                          title="Hapus Jurusan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Fakultas */}
      {facModal && (
        <div className="fixed inset-0 z-50 bg-[#122B18]/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D5E4D7] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-[#F7FAF7] border-b border-[#D5E4D7] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#122B18]">
                {facForm.id ? 'Edit Fakultas' : 'Tambah Fakultas Baru'}
              </h3>
              <button type="button" onClick={() => setFacModal(false)} className="text-[#4A6350]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveFaculty} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Kode Fakultas *</label>
                <input
                  required
                  value={facForm.kode_fakultas || ''}
                  onChange={(e) => setFacForm({ ...facForm, kode_fakultas: e.target.value })}
                  placeholder="Contoh: FTK"
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Nama Fakultas *</label>
                <input
                  required
                  value={facForm.nama_fakultas || ''}
                  onChange={(e) => setFacForm({ ...facForm, nama_fakultas: e.target.value })}
                  placeholder="Contoh: Fakultas Tarbiyah dan Keguruan"
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Nama Dekan *</label>
                <input
                  required
                  value={facForm.dekan || ''}
                  onChange={(e) => setFacForm({ ...facForm, dekan: e.target.value })}
                  placeholder="Nama lengkap beserta gelar"
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#EDF3EE]">
                <button
                  type="button"
                  onClick={() => setFacModal(false)}
                  className="px-4 py-2 font-semibold text-[#4A6350] border border-[#D5E4D7] rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Jurusan */}
      {deptModal && (
        <div className="fixed inset-0 z-50 bg-[#122B18]/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D5E4D7] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-[#F7FAF7] border-b border-[#D5E4D7] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#122B18]">
                {deptForm.id ? 'Edit Jurusan / Prodi' : 'Tambah Jurusan / Prodi'}
              </h3>
              <button type="button" onClick={() => setDeptModal(false)} className="text-[#4A6350]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveDepartment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Fakultas *</label>
                <select
                  required
                  value={deptForm.faculty_id || ''}
                  onChange={(e) => setDeptForm({ ...deptForm, faculty_id: e.target.value })}
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg bg-white"
                >
                  <option value="">Pilih Fakultas</option>
                  {data.faculties.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nama_fakultas}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Kode Jurusan *</label>
                  <input
                    required
                    value={deptForm.kode_jurusan || ''}
                    onChange={(e) => setDeptForm({ ...deptForm, kode_jurusan: e.target.value })}
                    placeholder="PAI"
                    className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Jenjang</label>
                  <select
                    value={deptForm.jenjang || 'S1'}
                    onChange={(e) => setDeptForm({ ...deptForm, jenjang: e.target.value as JenjangStudi })}
                    className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg bg-white"
                  >
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                    <option value="D3">D3</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Nama Jurusan / Program Studi *</label>
                <input
                  required
                  value={deptForm.nama_jurusan || ''}
                  onChange={(e) => setDeptForm({ ...deptForm, nama_jurusan: e.target.value })}
                  placeholder="Contoh: Pendidikan Agama Islam"
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Biaya SPP Default per Semester (Rp) *</label>
                <input
                  type="number"
                  min={0}
                  step={50000}
                  required
                  value={deptForm.biaya_spp_default ?? 2500000}
                  onChange={(e) => setDeptForm({ ...deptForm, biaya_spp_default: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#EDF3EE]">
                <button
                  type="button"
                  onClick={() => setDeptModal(false)}
                  className="px-4 py-2 font-semibold text-[#4A6350] border border-[#D5E4D7] rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
