import React, { useState } from 'react';
import { Copy, Edit3, Landmark, Plus, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react';
import { useSiakad } from '../../context/SiakadContext';
import type { BankAccount } from '../../types/siakad';

export const AdminBankAccounts: React.FC = () => {
  const { data, saveBankAccount, deleteBankAccount, showToast } = useSiakad();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<BankAccount>>({});
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setForm({
      nama_bank: '',
      nomor_rekening: '',
      atas_nama: 'STAI AL FURQAN MAKASSAR',
      keterangan: '',
      is_active: true,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveBankAccount(form);
      setModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan rekening bank.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (bank: BankAccount) => {
    try {
      await saveBankAccount({ ...bank, is_active: !bank.is_active });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengubah status rekening.', 'error');
    }
  };

  const handleCopy = async (rek: string) => {
    try {
      await navigator.clipboard.writeText(rek);
      showToast(`Nomor rekening ${rek} berhasil disalin.`);
    } catch {
      showToast('Gagal menyalin nomor rekening.', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#D5E4D7] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ECF4ED] text-[#146E22] flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#122B18]">Rekening Bank Resmi Kampus</h2>
            <p className="text-xs text-[#4A6350] mt-0.5">
              Hanya rekening berstatus Aktif yang ditampilkan sebagai tujuan transfer SPP di portal Mahasiswa
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#146E22] hover:bg-[#0F561A] rounded-lg whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Tambah Rekening
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.bankAccounts.map((bank) => (
          <div
            key={bank.id}
            className={`bg-white border rounded-xl p-5 flex flex-col justify-between transition-colors ${
              bank.is_active ? 'border-[#D5E4D7]' : 'border-slate-200 opacity-75'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#122B18]">{bank.nama_bank}</h3>
                  <p className="text-xs text-[#4A6350] mt-0.5">a.n. {bank.atas_nama}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleToggle(bank)}
                  className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${
                    bank.is_active ? 'text-[#15803D]' : 'text-slate-500'
                  }`}
                >
                  {bank.is_active ? (
                    <ToggleRight className="w-5 h-5 text-[#146E22]" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-400" />
                  )}
                  {bank.is_active ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              <div className="mt-4 p-3.5 rounded-lg bg-[#F7FAF7] border border-[#E2ECE4] flex items-center justify-between gap-2">
                <span className="font-mono text-base font-bold text-[#103A18] tracking-wide tabular-nums">
                  {bank.nomor_rekening}
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopy(bank.nomor_rekening)}
                  className="p-1.5 text-[#146E22] hover:bg-[#ECF4ED] rounded-md"
                  title="Salin nomor rekening"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              {bank.keterangan && (
                <p className="text-xs text-[#4A6350] mt-3 leading-relaxed">{bank.keterangan}</p>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-[#EDF3EE] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setForm({ ...bank });
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#7B6110] hover:bg-[#FBF5DF] rounded-lg"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => void deleteBankAccount(bank.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#B91C1C] hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#122B18]/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D5E4D7] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-[#F7FAF7] border-b border-[#D5E4D7] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#122B18]">
                {form.id ? 'Edit Rekening Bank' : 'Tambah Rekening Bank Kampus'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-[#4A6350]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nama Bank *</label>
                <input
                  required
                  value={form.nama_bank || ''}
                  onChange={(e) => setForm({ ...form, nama_bank: e.target.value })}
                  placeholder="Contoh: Bank Syariah Indonesia (BSI)"
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Nomor Rekening *</label>
                <input
                  required
                  value={form.nomor_rekening || ''}
                  onChange={(e) => setForm({ ...form, nomor_rekening: e.target.value })}
                  placeholder="Contoh: 7189452011"
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Atas Nama *</label>
                <input
                  required
                  value={form.atas_nama || ''}
                  onChange={(e) => setForm({ ...form, atas_nama: e.target.value })}
                  placeholder="STAI AL FURQAN MAKASSAR"
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Keterangan</label>
                <textarea
                  rows={2}
                  value={form.keterangan || ''}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  placeholder="Misal: Rekening Utama Pembayaran SPP"
                  className="w-full px-3 py-2 border border-[#C8DBC9] rounded-lg"
                />
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active ?? true}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-[#C8DBC9] text-[#146E22]"
                />
                <span className="font-semibold text-[#122B18]">Tampilkan aktif ke Mahasiswa</span>
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
                  {saving ? 'Menyimpan...' : 'Simpan Rekening'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
