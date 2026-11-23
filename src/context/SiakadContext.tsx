import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { DEMO_STUDENT_ID } from '../data/seedData';
import { auth, BOOTSTRAPPED_ADMIN_EMAIL, db, googleAuthProvider } from '../lib/firebase';
import {
  ensureFirestoreSeeded,
  fsApprovePaymentProof,
  fsConfigureInstallments,
  fsDeleteBankAccount,
  fsDeleteCourse,
  fsDeleteDepartment,
  fsDeleteFaculty,
  fsDeleteStudent,
  fsGenerateBills,
  fsRejectPaymentProof,
  fsSaveBankAccount,
  fsSaveCourse,
  fsSaveDepartment,
  fsSaveFaculty,
  fsSaveStudent,
  fsSaveStudentKrs,
  fsSubmitPaymentProof,
  fsUpdateStudentContact,
  subscribeSiakadFirestore,
} from '../services/firestoreService';
import {
  localApprovePaymentProof,
  localConfigureInstallments,
  localDeleteBankAccount,
  localDeleteCourse,
  localDeleteDepartment,
  localDeleteFaculty,
  localDeleteStudent,
  localGenerateBills,
  localGetScopedDataset,
  localLogin,
  localRejectPaymentProof,
  localSaveBankAccount,
  localSaveCourse,
  localSaveDepartment,
  localSaveFaculty,
  localSaveStudent,
  localSaveStudentKrs,
  localSubmitPaymentProof,
  localUpdateStudentContact,
  readFileAsProofDataUrl,
} from '../services/localDemoEngine';
import type {
  BankAccount,
  Course,
  Department,
  Faculty,
  SessionUser,
  SiakadDataset,
  Student,
  ToastItem,
  UserRole,
} from '../types/siakad';
import { CURRENT_ACADEMIC_YEAR, detectScheduleConflicts, generateId, MAX_KRS_SKS } from '../utils/formatters';

const EMPTY_DATASET: SiakadDataset = {
  faculties: [],
  departments: [],
  students: [],
  courses: [],
  enrollments: [],
  bankAccounts: [],
  tuitionBills: [],
  installments: [],
  paymentProofs: [],
};

async function parseJsonSafe<T = Record<string, unknown>>(
  res: Response
): Promise<{ isJson: boolean; data: T | null }> {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!text.trim()) {
    return { isJson: contentType.includes('application/json'), data: null };
  }
  try {
    return { isJson: true, data: JSON.parse(text) as T };
  } catch {
    return { isJson: false, data: null };
  }
}

interface SiakadContextValue {
  user: SessionUser | null;
  authLoading: boolean;
  dataLoading: boolean;
  data: SiakadDataset;
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastItem['type']) => void;
  dismissToast: (id: string) => void;
  loginDemo: (role: UserRole) => Promise<void>;
  loginDemoCredentials: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (preferredRole?: UserRole) => Promise<void>;
  switchCloudPreviewRole: (role: UserRole) => void;
  logout: () => Promise<void>;
  uploadProofFile: (file: File) => Promise<{ file_url: string; file_name: string; file_type: string }>;

  // Admin CRUD actions
  saveFaculty: (payload: Partial<Faculty>) => Promise<void>;
  deleteFaculty: (id: string) => Promise<void>;
  saveDepartment: (payload: Partial<Department>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  saveStudent: (payload: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  saveCourse: (payload: Partial<Course>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  saveBankAccount: (payload: Partial<BankAccount>) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;
  generateBills: (tahunAkademik?: string, departmentId?: string) => Promise<number>;
  configureInstallments: (
    billId: string,
    skemaBayar: 'Lunas Sekali Bayar' | 'Cicilan',
    schedules: { termin_ke: number; nominal_termin: number; tanggal_jatuh_tempo: string; status?: 'Belum Bayar' | 'Menunggu Verifikasi' | 'Lunas' }[]
  ) => Promise<void>;
  approvePaymentProof: (proofId: string) => Promise<void>;
  rejectPaymentProof: (proofId: string, alasanPenolakan: string) => Promise<void>;

  // Student actions
  saveStudentKrs: (courseIds: string[]) => Promise<void>;
  submitPaymentProof: (payload: {
    tuition_bill_id: string;
    installment_id: string;
    bank_account_id: string;
    nominal_transfer: number;
    tanggal_transfer: string;
    file_url: string;
    file_name: string;
    file_type: string;
    catatan: string;
  }) => Promise<void>;
  updateStudentContact: (no_hp: string, alamat: string) => Promise<void>;
}

const SiakadContext = createContext<SiakadContextValue | null>(null);

export const SiakadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [data, setData] = useState<SiakadDataset>(EMPTY_DATASET);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const isCloudAdminRef = useRef(false);
  const preferredCloudRoleRef = useRef<UserRole | null>(null);

  const showToast = useCallback((message: string, type: ToastItem['type'] = 'success') => {
    const id = generateId('toast');
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Listen for Firebase Auth state (Cloud Firestore mode)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setAuthLoading(false);
        return;
      }

      try {
        const isBootstrappedAdmin =
          fbUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase() &&
          fbUser.emailVerified;

        let resolvedIsAdmin = isBootstrappedAdmin;
        if (!resolvedIsAdmin) {
          const adminDoc = await getDoc(doc(db, 'admins', fbUser.uid));
          resolvedIsAdmin = adminDoc.exists();
        }
        isCloudAdminRef.current = resolvedIsAdmin;

        const profileRef = doc(db, 'profiles', fbUser.uid);
        const profileSnap = await getDoc(profileRef);
        const targetRole: UserRole =
          resolvedIsAdmin
            ? preferredCloudRoleRef.current || 'admin'
            : 'mahasiswa';

        if (!profileSnap.exists()) {
          await setDoc(profileRef, {
            user_id: fbUser.uid,
            role: resolvedIsAdmin ? 'admin' : 'mahasiswa',
            nama_lengkap: (fbUser.displayName || 'Pengguna SIAKAD').slice(0, 120),
            avatar_url: fbUser.photoURL || '',
            student_id: DEMO_STUDENT_ID,
          });
        }

        if (resolvedIsAdmin) {
          await ensureFirestoreSeeded(fbUser.uid);
        }

        setUser({
          uid: fbUser.uid,
          role: targetRole,
          nama_lengkap:
            targetRole === 'mahasiswa'
              ? 'Ahmad Fauzan Ramadhan'
              : fbUser.displayName || 'Admin STAI AL FURQAN',
          email: fbUser.email || '',
          avatar_url: fbUser.photoURL || undefined,
          student_id: DEMO_STUDENT_ID,
          mode: 'cloud',
        });
      } catch (err) {
        console.error('Firebase session init error:', err);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Attach Firestore realtime listeners ONLY when authenticated in Cloud Mode
  useEffect(() => {
    if (!user || user.mode !== 'cloud' || !firebaseUser) return;
    setDataLoading(true);
    const firestoreQueryRole: UserRole = isCloudAdminRef.current ? 'admin' : 'mahasiswa';
    const unsub = subscribeSiakadFirestore(
      firestoreQueryRole,
      firebaseUser.uid,
      (partial) => {
        setData((prev) => ({ ...prev, ...partial }));
        setDataLoading(false);
      },
      (err) => {
        console.error(err);
        setDataLoading(false);
        showToast('Terjadi kendala saat menyinkronkan data cloud.', 'error');
      }
    );
    return () => unsub();
  }, [user, firebaseUser, showToast]);

  const demoFetch = useCallback(
    async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
      };
      if (user?.demoToken) {
        headers.Authorization = `Bearer ${user.demoToken}`;
      }
      if (!(options.body instanceof FormData) && options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      const res = await fetch(url, { ...options, headers });
      const { isJson, data: json } = await parseJsonSafe<T & { error?: string }>(res);
      if (!res.ok) {
        throw new Error((isJson && json?.error) || 'Terjadi kesalahan pada server.');
      }
      if (!isJson || json === null) {
        throw new Error('Layanan backend tidak tersedia pada hosting statis ini.');
      }
      return json as T;
    },
    [user?.demoToken]
  );

  const loadDemoState = useCallback(async (token: string) => {
    setDataLoading(true);
    try {
      const res = await fetch('/api/demo/state', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { isJson, data: dataset } = await parseJsonSafe<SiakadDataset>(res);
      if (!res.ok || !isJson || !dataset) throw new Error('Gagal memuat data SIAKAD.');
      setData(dataset);
    } finally {
      setDataLoading(false);
    }
  }, []);

  const activateLocalDemo = useCallback(
    (params: { role?: UserRole; email?: string; password?: string }) => {
      const sessionUser = localLogin(params);
      const dataset = localGetScopedDataset(sessionUser.role, sessionUser.student_id);
      setUser(sessionUser);
      setData(dataset);
      return sessionUser;
    },
    []
  );

  const loginDemo = useCallback(
    async (role: UserRole) => {
      // If user is already signed in via Cloud Admin, allow instant preview switch in Cloud mode
      if (firebaseUser && isCloudAdminRef.current) {
        setUser({
          uid: firebaseUser.uid,
          role,
          nama_lengkap:
            role === 'mahasiswa'
              ? 'Ahmad Fauzan Ramadhan'
              : firebaseUser.displayName || 'Admin STAI AL FURQAN',
          email: firebaseUser.email || '',
          avatar_url: firebaseUser.photoURL || undefined,
          student_id: DEMO_STUDENT_ID,
          mode: 'cloud',
        });
        showToast(`Masuk sebagai ${role === 'admin' ? 'Admin' : 'Mahasiswa'} (Cloud Firestore aktif).`, 'success');
        return;
      }

      try {
        const res = await fetch('/api/demo/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });
        const { isJson, data: json } = await parseJsonSafe<{
          user?: SessionUser;
          token?: string;
          error?: string;
        }>(res);

        if (isJson && json) {
          if (!res.ok || !json.user || !json.token) {
            throw new Error(json.error || 'Gagal masuk akun demo.');
          }
          setUser({
            ...json.user,
            demoToken: json.token,
          });
          await loadDemoState(json.token);
          showToast(
            role === 'admin'
              ? 'Berhasil masuk sebagai Admin STAI AL FURQAN Makassar.'
              : 'Berhasil masuk sebagai Mahasiswa (Ahmad Fauzan Ramadhan).',
            'success'
          );
          return;
        }
      } catch (err) {
        if (err instanceof Error && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
          throw err;
        }
      }

      // Static hosting fallback (e.g., Vercel / Netlify / GitHub Pages without Express server)
      activateLocalDemo({ role });
      showToast(
        role === 'admin'
          ? 'Berhasil masuk sebagai Admin STAI AL FURQAN Makassar.'
          : 'Berhasil masuk sebagai Mahasiswa (Ahmad Fauzan Ramadhan).',
        'success'
      );
    },
    [firebaseUser, loadDemoState, activateLocalDemo, showToast]
  );

  const loginDemoCredentials = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch('/api/demo/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const { isJson, data: json } = await parseJsonSafe<{
          user?: SessionUser;
          token?: string;
          error?: string;
        }>(res);

        if (isJson && json) {
          if (!res.ok || !json.user || !json.token) {
            throw new Error(json.error || 'Email/NIM atau kata sandi tidak valid.');
          }
          setUser({
            ...json.user,
            demoToken: json.token,
          });
          await loadDemoState(json.token);
          showToast(`Selamat datang, ${json.user.nama_lengkap}.`, 'success');
          return;
        }
      } catch (err) {
        if (err instanceof Error && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
          throw err;
        }
      }

      // Static hosting fallback (validates exact demo credentials locally)
      const sessionUser = activateLocalDemo({ email, password });
      showToast(`Selamat datang, ${sessionUser.nama_lengkap}.`, 'success');
    },
    [loadDemoState, activateLocalDemo, showToast]
  );

  const loginWithGoogle = useCallback(
    async (preferredRole: UserRole = 'admin') => {
      preferredCloudRoleRef.current = preferredRole;
      await signInWithPopup(auth, googleAuthProvider);
      showToast('Berhasil masuk dengan akun Google (Sinkronisasi Cloud aktif).', 'success');
    },
    [showToast]
  );

  const switchCloudPreviewRole = useCallback(
    (role: UserRole) => {
      if (!user) return;
      if (user.mode === 'cloud' && isCloudAdminRef.current) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                role,
                nama_lengkap:
                  role === 'mahasiswa'
                    ? 'Ahmad Fauzan Ramadhan'
                    : firebaseUser?.displayName || 'Admin STAI AL FURQAN',
              }
            : null
        );
        showToast(`Beralih ke tampilan ${role === 'admin' ? 'Admin' : 'Mahasiswa'}.`, 'info');
      }
    },
    [user, firebaseUser, showToast]
  );

  const logout = useCallback(async () => {
    if (user?.mode === 'cloud') {
      await signOut(auth);
    } else if (user?.demoToken && !user?.localDemo) {
      await fetch('/api/demo/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.demoToken}` },
      }).catch(() => undefined);
    }
    setUser(null);
    setData(EMPTY_DATASET);
    showToast('Anda telah keluar dari SIAKAD.', 'info');
  }, [user, showToast]);

  const uploadProofFile = useCallback(
    async (file: File) => {
      if (user?.localDemo) {
        return readFileAsProofDataUrl(file);
      }

      const formData = new FormData();
      formData.append('file', file);
      let token = user?.demoToken || '';
      if (user?.mode === 'cloud' && firebaseUser) {
        token = await firebaseUser.getIdToken();
      }

      try {
        const res = await fetch('/api/uploads', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const { isJson, data: json } = await parseJsonSafe<{
          file_url?: string;
          file_name?: string;
          file_type?: string;
          error?: string;
        }>(res);

        if (isJson && json) {
          if (!res.ok || !json.file_url) {
            throw new Error(json.error || 'Gagal mengunggah file bukti bayar.');
          }
          return json as { file_url: string; file_name: string; file_type: string };
        }
      } catch (err) {
        if (err instanceof Error && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
          throw err;
        }
      }

      // Static hosting fallback when /api/uploads backend is not active
      if (user?.mode === 'cloud' && file.size > 650 * 1024) {
        throw new Error(
          'Pada hosting statis, ukuran bukti bayar untuk mode Cloud dibatasi maksimal 650 KB. Mohon kompres gambar/PDF Anda.'
        );
      }
      return readFileAsProofDataUrl(file);
    },
    [user, firebaseUser]
  );

  // --- Admin Mutations ---
  const saveFaculty = useCallback(
    async (payload: Partial<Faculty>) => {
      if (user?.mode === 'cloud') {
        await fsSaveFaculty(payload);
      } else if (user?.localDemo) {
        setData(localSaveFaculty(payload));
      } else {
        const next = await demoFetch<SiakadDataset>('/api/demo/admin/faculty', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setData(next);
      }
      showToast(payload.id ? 'Data fakultas berhasil diperbarui.' : 'Fakultas baru berhasil ditambahkan.');
    },
    [user?.mode, user?.localDemo, demoFetch, showToast]
  );

  const deleteFaculty = useCallback(
    async (id: string) => {
      if (data.departments.some((d) => d.faculty_id === id)) {
        throw new Error('Fakultas masih memiliki jurusan. Hapus jurusan terkait terlebih dahulu.');
      }
      if (user?.mode === 'cloud') {
        await fsDeleteFaculty(id);
      } else if (user?.localDemo) {
        setData(localDeleteFaculty(id));
      } else {
        const next = await demoFetch<SiakadDataset>(`/api/demo/admin/faculty/${id}`, { method: 'DELETE' });
        setData(next);
      }
      showToast('Fakultas berhasil dihapus.');
    },
    [user?.mode, user?.localDemo, data.departments, demoFetch, showToast]
  );

  const saveDepartment = useCallback(
    async (payload: Partial<Department>) => {
      if (user?.mode === 'cloud') {
        await fsSaveDepartment(payload);
      } else if (user?.localDemo) {
        setData(localSaveDepartment(payload));
      } else {
        const next = await demoFetch<SiakadDataset>('/api/demo/admin/department', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setData(next);
      }
      showToast(payload.id ? 'Data jurusan berhasil diperbarui.' : 'Jurusan baru berhasil ditambahkan.');
    },
    [user?.mode, user?.localDemo, demoFetch, showToast]
  );

  const deleteDepartment = useCallback(
    async (id: string) => {
      if (data.students.some((s) => s.department_id === id)) {
        throw new Error('Jurusan masih memiliki mahasiswa terdaftar.');
      }
      if (user?.mode === 'cloud') {
        await fsDeleteDepartment(id);
      } else if (user?.localDemo) {
        setData(localDeleteDepartment(id));
      } else {
        const next = await demoFetch<SiakadDataset>(`/api/demo/admin/department/${id}`, { method: 'DELETE' });
        setData(next);
      }
      showToast('Jurusan berhasil dihapus.');
    },
    [user?.mode, user?.localDemo, data.students, demoFetch, showToast]
  );

  const saveStudent = useCallback(
    async (payload: Partial<Student>) => {
      if (user?.mode === 'cloud') {
        const duplicateNim = data.students.some(
          (s) => s.nim.toLowerCase() === (payload.nim || '').trim().toLowerCase() && s.id !== payload.id
        );
        if (duplicateNim) {
          throw new Error(`NIM ${payload.nim} sudah digunakan mahasiswa lain.`);
        }
        await fsSaveStudent(payload);
      } else if (user?.localDemo) {
        setData(localSaveStudent(payload));
      } else {
        const next = await demoFetch<SiakadDataset>('/api/demo/admin/student', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setData(next);
      }
      showToast(payload.id ? 'Data mahasiswa berhasil diperbarui.' : 'Mahasiswa baru berhasil ditambahkan.');
    },
    [user?.mode, user?.localDemo, data.students, demoFetch, showToast]
  );

  const deleteStudent = useCallback(
    async (id: string) => {
      if (user?.mode === 'cloud') {
        await fsDeleteStudent(id);
      } else if (user?.localDemo) {
        setData(localDeleteStudent(id));
      } else {
        const next = await demoFetch<SiakadDataset>(`/api/demo/admin/student/${id}`, { method: 'DELETE' });
        setData(next);
      }
      showToast('Data mahasiswa berhasil dihapus.');
    },
    [user?.mode, user?.localDemo, demoFetch, showToast]
  );

  const saveCourse = useCallback(
    async (payload: Partial<Course>) => {
      if (user?.mode === 'cloud') {
        await fsSaveCourse(payload);
      } else if (user?.localDemo) {
        setData(localSaveCourse(payload));
      } else {
        const next = await demoFetch<SiakadDataset>('/api/demo/admin/course', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setData(next);
      }
      showToast(payload.id ? 'Mata kuliah berhasil diperbarui.' : 'Mata kuliah baru berhasil ditambahkan.');
    },
    [user?.mode, user?.localDemo, demoFetch, showToast]
  );

  const deleteCourse = useCallback(
    async (id: string) => {
      if (user?.mode === 'cloud') {
        await fsDeleteCourse(id);
      } else if (user?.localDemo) {
        setData(localDeleteCourse(id));
      } else {
        const next = await demoFetch<SiakadDataset>(`/api/demo/admin/course/${id}`, { method: 'DELETE' });
        setData(next);
      }
      showToast('Mata kuliah berhasil dihapus.');
    },
    [user?.mode, user?.localDemo, demoFetch, showToast]
  );

  const saveBankAccount = useCallback(
    async (payload: Partial<BankAccount>) => {
      if (user?.mode === 'cloud') {
        await fsSaveBankAccount(payload);
      } else if (user?.localDemo) {
        setData(localSaveBankAccount(payload));
      } else {
        const next = await demoFetch<SiakadDataset>('/api/demo/admin/bank', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setData(next);
      }
      showToast(payload.id ? 'Rekening bank diperbarui.' : 'Rekening bank baru ditambahkan.');
    },
    [user?.mode, user?.localDemo, demoFetch, showToast]
  );

  const deleteBankAccount = useCallback(
    async (id: string) => {
      if (user?.mode === 'cloud') {
        await fsDeleteBankAccount(id);
      } else if (user?.localDemo) {
        setData(localDeleteBankAccount(id));
      } else {
        const next = await demoFetch<SiakadDataset>(`/api/demo/admin/bank/${id}`, { method: 'DELETE' });
        setData(next);
      }
      showToast('Rekening bank berhasil dihapus.');
    },
    [user?.mode, user?.localDemo, demoFetch, showToast]
  );

  const generateBills = useCallback(
    async (tahunAkademik = CURRENT_ACADEMIC_YEAR, departmentId?: string) => {
      if (user?.mode === 'cloud') {
        const count = await fsGenerateBills(
          data.students,
          data.departments,
          data.tuitionBills,
          tahunAkademik,
          departmentId
        );
        showToast(
          count > 0
            ? `${count} tagihan SPP baru berhasil diterbitkan.`
            : 'Seluruh mahasiswa aktif pada filter tersebut sudah memiliki tagihan semester ini.',
          count > 0 ? 'success' : 'info'
        );
        return count;
      } else if (user?.localDemo) {
        const res = localGenerateBills(tahunAkademik, departmentId);
        setData(res.data);
        showToast(
          res.createdCount > 0
            ? `${res.createdCount} tagihan SPP baru berhasil diterbitkan.`
            : 'Seluruh mahasiswa aktif sudah memiliki tagihan semester ini.',
          res.createdCount > 0 ? 'success' : 'info'
        );
        return res.createdCount;
      } else {
        const res = await demoFetch<{ data: SiakadDataset; createdCount: number }>(
          '/api/demo/admin/bills/generate',
          {
            method: 'POST',
            body: JSON.stringify({ tahun_akademik: tahunAkademik, department_id: departmentId }),
          }
        );
        setData(res.data);
        showToast(
          res.createdCount > 0
            ? `${res.createdCount} tagihan SPP baru berhasil diterbitkan.`
            : 'Seluruh mahasiswa aktif sudah memiliki tagihan semester ini.',
          res.createdCount > 0 ? 'success' : 'info'
        );
        return res.createdCount;
      }
    },
    [user?.mode, user?.localDemo, data.students, data.departments, data.tuitionBills, demoFetch, showToast]
  );

  const configureInstallments = useCallback(
    async (
      billId: string,
      skemaBayar: 'Lunas Sekali Bayar' | 'Cicilan',
      schedules: { termin_ke: number; nominal_termin: number; tanggal_jatuh_tempo: string; status?: 'Belum Bayar' | 'Menunggu Verifikasi' | 'Lunas' }[]
    ) => {
      if (user?.mode === 'cloud') {
        const bill = data.tuitionBills.find((b) => b.id === billId);
        if (!bill) throw new Error('Tagihan tidak ditemukan.');
        await fsConfigureInstallments(bill, data.installments, skemaBayar, schedules);
      } else if (user?.localDemo) {
        setData(localConfigureInstallments(billId, skemaBayar, schedules));
      } else {
        const next = await demoFetch<SiakadDataset>(`/api/demo/admin/bills/${billId}/installments`, {
          method: 'POST',
          body: JSON.stringify({ skema_bayar: skemaBayar, schedules }),
        });
        setData(next);
      }
      showToast(
        skemaBayar === 'Cicilan'
          ? 'Skema bayar berkala (cicilan) berhasil diaktifkan.'
          : 'Skema pembayaran dikembalikan ke Lunas Sekali Bayar.'
      );
    },
    [user?.mode, user?.localDemo, data.tuitionBills, data.installments, demoFetch, showToast]
  );

  const approvePaymentProof = useCallback(
    async (proofId: string) => {
      if (user?.mode === 'cloud') {
        const proof = data.paymentProofs.find((p) => p.id === proofId);
        if (!proof) throw new Error('Bukti pembayaran tidak ditemukan.');
        const bill = data.tuitionBills.find((b) => b.id === proof.tuition_bill_id);
        const inst = proof.installment_id
          ? data.installments.find((i) => i.id === proof.installment_id)
          : undefined;
        await fsApprovePaymentProof(proof, bill, inst);
      } else if (user?.localDemo) {
        setData(localApprovePaymentProof(proofId));
      } else {
        const next = await demoFetch<SiakadDataset>(`/api/demo/admin/proofs/${proofId}/approve`, {
          method: 'POST',
        });
        setData(next);
      }
      showToast('Bukti pembayaran disetujui. Total terbayar & status tagihan otomatis diperbarui.');
    },
    [user?.mode, user?.localDemo, data.paymentProofs, data.tuitionBills, data.installments, demoFetch, showToast]
  );

  const rejectPaymentProof = useCallback(
    async (proofId: string, alasanPenolakan: string) => {
      if (alasanPenolakan.trim().length < 5) {
        throw new Error('Mohon tuliskan alasan penolakan minimal 5 karakter.');
      }
      if (user?.mode === 'cloud') {
        const proof = data.paymentProofs.find((p) => p.id === proofId);
        if (!proof) throw new Error('Bukti pembayaran tidak ditemukan.');
        const inst = proof.installment_id
          ? data.installments.find((i) => i.id === proof.installment_id)
          : undefined;
        await fsRejectPaymentProof(proof, alasanPenolakan, inst);
      } else if (user?.localDemo) {
        setData(localRejectPaymentProof(proofId, alasanPenolakan));
      } else {
        const next = await demoFetch<SiakadDataset>(`/api/demo/admin/proofs/${proofId}/reject`, {
          method: 'POST',
          body: JSON.stringify({ alasan_penolakan: alasanPenolakan }),
        });
        setData(next);
      }
      showToast('Bukti pembayaran ditolak dan alasan telah dikirim ke mahasiswa.', 'warning');
    },
    [user?.mode, user?.localDemo, data.paymentProofs, data.installments, demoFetch, showToast]
  );

  // --- Student Mutations ---
  const saveStudentKrs = useCallback(
    async (courseIds: string[]) => {
      const studentId = user?.student_id || DEMO_STUDENT_ID;
      const student = data.students.find((s) => s.id === studentId);
      if (!student) throw new Error('Data mahasiswa tidak ditemukan.');

      const selected = data.courses.filter((c) => courseIds.includes(c.id) && c.is_active);
      const totalSks = selected.reduce((sum, c) => sum + c.sks, 0);
      if (totalSks > MAX_KRS_SKS) {
        throw new Error(`Total SKS (${totalSks}) melebihi batas maksimal ${MAX_KRS_SKS} SKS.`);
      }
      const conflicts = detectScheduleConflicts(selected);
      if (conflicts.length > 0) {
        throw new Error(conflicts[0].reason);
      }

      if (user?.mode === 'cloud') {
        await fsSaveStudentKrs(student, data.enrollments, courseIds, user.uid);
      } else if (user?.localDemo) {
        const enrollments = localSaveStudentKrs(studentId, courseIds);
        setData((prev) => ({ ...prev, enrollments }));
      } else {
        const res = await demoFetch<{ enrollments: SiakadDataset['enrollments'] }>('/api/demo/student/krs', {
          method: 'POST',
          body: JSON.stringify({ course_ids: courseIds }),
        });
        setData((prev) => ({ ...prev, enrollments: res.enrollments }));
      }
      showToast(`KRS Semester ${student.semester_aktif} berhasil disimpan (${totalSks} SKS).`);
    },
    [user, data.students, data.courses, data.enrollments, demoFetch, showToast]
  );

  const submitPaymentProof = useCallback(
    async (payload: {
      tuition_bill_id: string;
      installment_id: string;
      bank_account_id: string;
      nominal_transfer: number;
      tanggal_transfer: string;
      file_url: string;
      file_name: string;
      file_type: string;
      catatan: string;
    }) => {
      const studentId = user?.student_id || DEMO_STUDENT_ID;
      const student = data.students.find((s) => s.id === studentId);
      if (!student) throw new Error('Data mahasiswa tidak ditemukan.');

      if (user?.mode === 'cloud') {
        await fsSubmitPaymentProof(student, payload, user.uid);
      } else if (user?.localDemo) {
        const res = localSubmitPaymentProof(studentId, payload);
        setData((prev) => ({
          ...prev,
          paymentProofs: res.paymentProofs,
          installments: res.installments,
        }));
      } else {
        const res = await demoFetch<{
          paymentProofs: SiakadDataset['paymentProofs'];
          installments: SiakadDataset['installments'];
        }>('/api/demo/student/payment-proof', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setData((prev) => ({
          ...prev,
          paymentProofs: res.paymentProofs,
          installments: res.installments,
        }));
      }
      showToast('Bukti pembayaran berhasil diunggah dan sedang menunggu verifikasi Admin.');
    },
    [user, data.students, demoFetch, showToast]
  );

  const updateStudentContact = useCallback(
    async (no_hp: string, alamat: string) => {
      const studentId = user?.student_id || DEMO_STUDENT_ID;
      if (user?.mode === 'cloud') {
        await fsUpdateStudentContact(studentId, no_hp, alamat);
      } else if (user?.localDemo) {
        const updatedStudent = localUpdateStudentContact(studentId, no_hp, alamat);
        setData((prev) => ({
          ...prev,
          students: prev.students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)),
        }));
      } else {
        const res = await demoFetch<{ student: Student }>('/api/demo/student/profile', {
          method: 'PATCH',
          body: JSON.stringify({ no_hp, alamat }),
        });
        setData((prev) => ({
          ...prev,
          students: prev.students.map((s) => (s.id === res.student.id ? res.student : s)),
        }));
      }
      showToast('Informasi kontak profil berhasil diperbarui.');
    },
    [user?.mode, user?.localDemo, user?.student_id, demoFetch, showToast]
  );

  return (
    <SiakadContext.Provider
      value={{
        user,
        authLoading,
        dataLoading,
        data,
        toasts,
        showToast,
        dismissToast,
        loginDemo,
        loginDemoCredentials,
        loginWithGoogle,
        switchCloudPreviewRole,
        logout,
        uploadProofFile,
        saveFaculty,
        deleteFaculty,
        saveDepartment,
        deleteDepartment,
        saveStudent,
        deleteStudent,
        saveCourse,
        deleteCourse,
        saveBankAccount,
        deleteBankAccount,
        generateBills,
        configureInstallments,
        approvePaymentProof,
        rejectPaymentProof,
        saveStudentKrs,
        submitPaymentProof,
        updateStudentContact,
      }}
    >
      {children}
    </SiakadContext.Provider>
  );
};

export function useSiakad() {
  const ctx = useContext(SiakadContext);
  if (!ctx) {
    throw new Error('useSiakad must be used inside SiakadProvider');
  }
  return ctx;
}
