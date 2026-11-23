export type UserRole = 'admin' | 'mahasiswa';

export interface Profile {
  id: string;
  user_id: string;
  role: UserRole;
  nama_lengkap: string;
  avatar_url?: string;
  student_id?: string;
}

export interface Faculty {
  id: string;
  kode_fakultas: string;
  nama_fakultas: string;
  dekan: string;
  is_public: boolean;
}

export type JenjangStudi = 'S1' | 'S2' | 'D3';

export interface Department {
  id: string;
  faculty_id: string;
  kode_jurusan: string;
  nama_jurusan: string;
  jenjang: JenjangStudi;
  biaya_spp_default: number;
  is_public: boolean;
}

export type StudentStatus = 'Aktif' | 'Cuti' | 'Lulus' | 'Nonaktif';
export type JenisKelamin = 'Laki-laki' | 'Perempuan';

export interface Student {
  id: string;
  user_id?: string;
  nim: string;
  nama_lengkap: string;
  email: string;
  no_hp: string;
  jenis_kelamin: JenisKelamin;
  alamat: string;
  faculty_id: string;
  department_id: string;
  angkatan: number;
  semester_aktif: number;
  status: StudentStatus;
}

export type HariKuliah = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';

export interface Course {
  id: string;
  department_id: string;
  kode_mk: string;
  nama_mk: string;
  sks: number;
  semester: number;
  dosen_pengampu: string;
  hari: HariKuliah;
  jam_mulai: string; // HH:mm
  jam_selesai: string; // HH:mm
  ruangan: string;
  is_active: boolean;
}

export interface StudentEnrollment {
  id: string;
  student_id: string;
  user_id: string;
  course_id: string;
  semester_diambil: number;
  tahun_akademik: string;
  created_at: string;
}

export interface BankAccount {
  id: string;
  nama_bank: string;
  nomor_rekening: string;
  atas_nama: string;
  keterangan: string;
  is_active: boolean;
}

export type SkemaBayar = 'Lunas Sekali Bayar' | 'Cicilan';
export type BillStatus = 'Belum Bayar' | 'Cicilan Berjalan' | 'Lunas';

export interface TuitionBill {
  id: string;
  student_id: string;
  user_id: string;
  semester: number;
  tahun_akademik: string;
  total_tagihan: number;
  total_terbayar: number;
  skema_bayar: SkemaBayar;
  status: BillStatus;
}

export type InstallmentStatus = 'Belum Bayar' | 'Menunggu Verifikasi' | 'Lunas';

export interface InstallmentSchedule {
  id: string;
  tuition_bill_id: string;
  student_id: string;
  user_id: string;
  termin_ke: number;
  nominal_termin: number;
  tanggal_jatuh_tempo: string; // YYYY-MM-DD
  status: InstallmentStatus;
}

export type VerificationStatus = 'Menunggu Verifikasi' | 'Disetujui' | 'Ditolak';

export interface PaymentProof {
  id: string;
  student_id: string;
  user_id: string;
  tuition_bill_id: string;
  installment_id: string; // '' if full payment / non-installment
  bank_account_id: string;
  nominal_transfer: number;
  tanggal_transfer: string; // YYYY-MM-DD
  file_url: string;
  file_name: string;
  file_type: string;
  catatan: string;
  status_verifikasi: VerificationStatus;
  alasan_penolakan: string;
  verified_at: string;
  created_at: string;
}

export interface SiakadDataset {
  faculties: Faculty[];
  departments: Department[];
  students: Student[];
  courses: Course[];
  enrollments: StudentEnrollment[];
  bankAccounts: BankAccount[];
  tuitionBills: TuitionBill[];
  installments: InstallmentSchedule[];
  paymentProofs: PaymentProof[];
}

export type AdminMenuKey =
  | 'dashboard'
  | 'students'
  | 'student_detail'
  | 'faculties_departments'
  | 'courses'
  | 'bank_accounts'
  | 'tuition_bills'
  | 'payment_verification';

export type StudentMenuKey =
  | 'student_dashboard'
  | 'student_krs'
  | 'student_billing'
  | 'student_upload'
  | 'student_profile';

export interface SessionUser {
  uid: string;
  role: UserRole;
  nama_lengkap: string;
  email: string;
  avatar_url?: string;
  student_id?: string;
  mode: 'cloud' | 'demo';
  demoToken?: string;
  localDemo?: boolean;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}
