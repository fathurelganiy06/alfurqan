import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CreditCard,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useSiakad } from '../context/SiakadContext';
import { CAMPUS_LOGO_URL } from '../utils/formatters';

export const LoginPage: React.FC = () => {
  const { loginDemo, loginDemoCredentials, loginWithGoogle } = useSiakad();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Mohon masukkan Email/NIM dan kata sandi Anda.');
      return;
    }
    setSubmitting('form');
    try {
      await loginDemoCredentials(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk ke sistem.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleQuickLogin = async (role: 'admin' | 'mahasiswa') => {
    setError('');
    setSubmitting(role);
    try {
      await loginDemo(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk akun demo.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSubmitting('google');
    try {
      await loginWithGoogle('admin');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk dengan Google.';
      if (msg.includes('unauthorized-domain')) {
        setError(
          'Domain ini belum terdaftar di Firebase Authorized Domains. Tambahkan domain deployment Anda di Firebase Console (Authentication → Settings → Authorized domains), atau gunakan tombol Quick Login di atas.'
        );
      } else if (!msg.includes('popup-closed-by-user')) {
        setError('Gagal autentikasi Google. Anda tetap dapat menggunakan tombol Quick Login di atas.');
      }
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#F7FAF7]">
      {/* Left Institutional Identity Column */}
      <div className="lg:col-span-6 xl:col-span-7 bg-[#ECF4ED] border-b lg:border-b-0 lg:border-r border-[#D5E4D7] flex flex-col justify-between p-8 sm:p-12 xl:p-16 relative overflow-hidden">
        {/* Subtle geometric gold & green architectural accent */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full border border-[#C9A227]/25"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 w-[420px] h-[420px] rounded-full border border-[#146E22]/15"
          aria-hidden="true"
        />

        <div className="relative z-10 flex items-center gap-4">
          <img
            src={CAMPUS_LOGO_URL}
            alt="Logo Resmi STAI AL FURQAN Makassar"
            referrerPolicy="no-referrer"
            className="w-16 h-16 object-contain rounded-full bg-white p-1 border border-[#D5E4D7] shadow-sm shrink-0"
          />
          <div>
            <p className="text-xs font-semibold tracking-wide text-[#8F6F12]">
              Sistem Informasi Akademik Terpadu
            </p>
            <h1 className="text-lg sm:text-xl font-extrabold text-[#122B18] tracking-tight">
              STAI AL-FURQAN Makassar
            </h1>
          </div>
        </div>

        <div className="relative z-10 my-10 lg:my-0 max-w-xl">
          <div className="h-[3px] w-16 bg-[#C9A227] rounded-full mb-6" />
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#103A18] leading-tight tracking-tight [text-wrap:balance]">
            Portal Akademik & Administrasi Keuangan SPP dalam Satu Ekosistem
          </h2>
          <p className="text-[15px] text-[#3E5844] mt-4 leading-relaxed">
            Kelola data mahasiswa, pengisian Kartu Rencana Studi (KRS) bervalidasi jadwal,
            tagihan SPP, skema pembayaran berkala, hingga verifikasi bukti transfer secara transparan
            dan terintegrasi bagi sivitas akademika STAI AL-FURQAN Makassar.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-9 pt-8 border-t border-[#D5E4D7]">
            <div>
              <div className="w-9 h-9 rounded-lg bg-white border border-[#D5E4D7] text-[#146E22] flex items-center justify-center mb-3">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#122B18]">KRS Cerdas 24 SKS</h3>
              <p className="text-xs text-[#4A6350] mt-1 leading-relaxed">
                Deteksi bentrok jadwal kuliah otomatis dengan arsip riwayat tiap semester.
              </p>
            </div>
            <div>
              <div className="w-9 h-9 rounded-lg bg-white border border-[#D5E4D7] text-[#146E22] flex items-center justify-center mb-3">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#122B18]">Cicilan & Bukti Bayar</h3>
              <p className="text-xs text-[#4A6350] mt-1 leading-relaxed">
                Jadwal termin fleksibel 2–4x serta unggah bukti transfer JPG, PNG, dan PDF.
              </p>
            </div>
            <div>
              <div className="w-9 h-9 rounded-lg bg-white border border-[#D5E4D7] text-[#146E22] flex items-center justify-center mb-3">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#122B18]">Analitik & Laporan</h3>
              <p className="text-xs text-[#4A6350] mt-1 leading-relaxed">
                Pantau pemasukan SPP, ekspor CSV, dan cetak laporan berkop surat resmi.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#4A6350] pt-4 border-t border-[#D5E4D7]">
          <span>Sekolah Tinggi Agama Islam (STAI) AL-FURQAN Makassar</span>
          <span>Tahun Akademik 2026/2027</span>
        </div>
      </div>

      {/* Right Authentication Form Column */}
      <div className="lg:col-span-6 xl:col-span-5 flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-7">
            <h2 className="text-2xl font-extrabold text-[#122B18] tracking-tight">
              Masuk ke SIAKAD
            </h2>
            <p className="text-sm text-[#4A6350] mt-1.5">
              Gunakan akun kampus Anda atau uji langsung dengan akun demo di bawah ini.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Login Demo Section */}
          <div className="mb-6 p-4 rounded-xl bg-[#F7FAF7] border border-[#D5E4D7]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#122B18]">
                Akses Cepat Akun Demo (Quick Login)
              </span>
              <span className="text-[11px] font-medium text-[#8F6F12]">Uji 2 Peran Instan</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={submitting !== null}
                onClick={() => handleQuickLogin('admin')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#146E22] hover:bg-[#0F561A] text-white text-xs font-semibold transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                {submitting === 'admin' ? 'Memuat...' : 'Masuk Demo Admin'}
              </button>
              <button
                type="button"
                disabled={submitting !== null}
                onClick={() => handleQuickLogin('mahasiswa')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#FBF5DF] hover:bg-[#F5E9BD] text-[#5C4507] border border-[#DFC772] text-xs font-semibold transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                {submitting === 'mahasiswa' ? 'Memuat...' : 'Masuk Demo Mahasiswa'}
              </button>
            </div>
            <div className="mt-3 pt-3 border-t border-[#D5E4D7] grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#4A6350]">
              <div>
                <span className="font-semibold text-[#122B18] block">Akun Admin:</span>
                <span className="font-mono">admin@staialfurqan.ac.id</span>
                <span className="block font-mono">Pass: admin123</span>
              </div>
              <div>
                <span className="font-semibold text-[#122B18] block">Akun Mahasiswa:</span>
                <span className="font-mono">2024010001</span>
                <span className="block font-mono">Pass: mahasiswa123</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-[#122B18] mb-1.5">
                Email Kampus atau NIM
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#4A6350] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@staialfurqan.ac.id atau 2024010001"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#C8DBC9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#146E22]/25 focus:border-[#146E22] transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-[#122B18] mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#4A6350] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#C8DBC9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#146E22]/25 focus:border-[#146E22] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting !== null}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#103A18] hover:bg-[#146E22] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              <span>{submitting === 'form' ? 'Memverifikasi...' : 'Masuk dengan Kredensial'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2ECE4]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-[#4A6350]">atau sinkronisasi cloud</span>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting !== null}
            onClick={handleGoogleLogin}
            className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg bg-white hover:bg-[#F7FAF7] text-[#122B18] border border-[#C8DBC9] text-sm font-semibold transition-colors disabled:opacity-60"
          >
            <UserCheck className="w-4 h-4 text-[#146E22]" />
            <span>{submitting === 'google' ? 'Menghubungkan...' : 'Masuk dengan Akun Google (Cloud)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
