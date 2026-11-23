import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { buildSeedDataset, DEMO_STUDENT_ID } from '../data/seedData';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  BankAccount,
  Course,
  Department,
  Faculty,
  InstallmentSchedule,
  PaymentProof,
  SiakadDataset,
  Student,
  TuitionBill,
  UserRole,
} from '../types/siakad';
import { CURRENT_ACADEMIC_YEAR, generateId } from '../utils/formatters';

function stripId<T extends { id: string }>(obj: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = obj;
  return rest;
}

export async function ensureFirestoreSeeded(adminUid: string): Promise<void> {
  try {
    const existingFaculties = await getDocs(collection(db, 'faculties'));
    if (!existingFaculties.empty) {
      // Ensure demo student is linked to adminUid if needed for previewing student role
      const stdRef = doc(db, 'students', DEMO_STUDENT_ID);
      const stdSnap = await getDoc(stdRef);
      if (stdSnap.exists() && !stdSnap.data().user_id) {
        await updateDoc(stdRef, { user_id: adminUid });
      }
      return;
    }

    const seed = buildSeedDataset(adminUid);

    // Sequential batches so parent `exists()` checks in firestore.rules pass strictly
    // Batch 1: faculties & bank_accounts
    const b1 = writeBatch(db);
    for (const f of seed.faculties) {
      b1.set(doc(db, 'faculties', f.id), stripId(f));
    }
    for (const bank of seed.bankAccounts) {
      b1.set(doc(db, 'bank_accounts', bank.id), stripId(bank));
    }
    await b1.commit();

    // Batch 2: departments (references faculties)
    const b2 = writeBatch(db);
    for (const d of seed.departments) {
      b2.set(doc(db, 'departments', d.id), stripId(d));
    }
    await b2.commit();

    // Batch 3: students & courses (references faculties & departments)
    const b3 = writeBatch(db);
    for (const s of seed.students) {
      b3.set(doc(db, 'students', s.id), stripId(s));
    }
    for (const c of seed.courses) {
      b3.set(doc(db, 'courses', c.id), stripId(c));
    }
    await b3.commit();

    // Batch 4: student_enrollments & tuition_bills
    const b4 = writeBatch(db);
    for (const e of seed.enrollments) {
      b4.set(doc(db, 'student_enrollments', e.id), stripId(e));
    }
    for (const tb of seed.tuitionBills) {
      b4.set(doc(db, 'tuition_bills', tb.id), stripId(tb));
    }
    await b4.commit();

    // Batch 5: installment_schedules & payment_proofs
    const b5 = writeBatch(db);
    for (const inst of seed.installments) {
      b5.set(doc(db, 'installment_schedules', inst.id), stripId(inst));
    }
    for (const p of seed.paymentProofs) {
      b5.set(doc(db, 'payment_proofs', p.id), stripId(p));
    }
    await b5.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed_initial_data');
  }
}

export function subscribeSiakadFirestore(
  role: UserRole,
  uid: string,
  onUpdate: (partial: Partial<SiakadDataset>) => void,
  onError: (err: Error) => void
): () => void {
  const unsubs: Unsubscribe[] = [];

  const listen = <T>(
    pathName: string,
    q: ReturnType<typeof query> | ReturnType<typeof collection>,
    key: keyof SiakadDataset
  ) => {
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[];
        onUpdate({ [key]: items } as Partial<SiakadDataset>);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, pathName);
        } catch (wrapped) {
          onError(wrapped as Error);
        }
      }
    );
    unsubs.push(unsub);
  };

  const isAdminRole = role === 'admin';

  listen<Faculty>(
    'faculties',
    isAdminRole ? collection(db, 'faculties') : query(collection(db, 'faculties'), where('is_public', '==', true)),
    'faculties'
  );
  listen<Department>(
    'departments',
    isAdminRole ? collection(db, 'departments') : query(collection(db, 'departments'), where('is_public', '==', true)),
    'departments'
  );
  listen<Course>(
    'courses',
    isAdminRole ? collection(db, 'courses') : query(collection(db, 'courses'), where('is_active', '==', true)),
    'courses'
  );
  listen<BankAccount>(
    'bank_accounts',
    isAdminRole ? collection(db, 'bank_accounts') : query(collection(db, 'bank_accounts'), where('is_active', '==', true)),
    'bankAccounts'
  );
  listen<Student>(
    'students',
    isAdminRole ? collection(db, 'students') : query(collection(db, 'students'), where('user_id', '==', uid)),
    'students'
  );
  listen(
    'student_enrollments',
    isAdminRole
      ? collection(db, 'student_enrollments')
      : query(collection(db, 'student_enrollments'), where('user_id', '==', uid)),
    'enrollments'
  );
  listen<TuitionBill>(
    'tuition_bills',
    isAdminRole ? collection(db, 'tuition_bills') : query(collection(db, 'tuition_bills'), where('user_id', '==', uid)),
    'tuitionBills'
  );
  listen<InstallmentSchedule>(
    'installment_schedules',
    isAdminRole
      ? collection(db, 'installment_schedules')
      : query(collection(db, 'installment_schedules'), where('user_id', '==', uid)),
    'installments'
  );
  listen<PaymentProof>(
    'payment_proofs',
    isAdminRole ? collection(db, 'payment_proofs') : query(collection(db, 'payment_proofs'), where('user_id', '==', uid)),
    'paymentProofs'
  );

  return () => {
    for (const u of unsubs) u();
  };
}

export async function fsSaveFaculty(payload: Partial<Faculty>): Promise<void> {
  const id = payload.id || generateId('fac');
  try {
    await setDoc(doc(db, 'faculties', id), {
      kode_fakultas: (payload.kode_fakultas || '').trim().slice(0, 20),
      nama_fakultas: (payload.nama_fakultas || '').trim().slice(0, 150),
      dekan: (payload.dekan || '').trim().slice(0, 150),
      is_public: true,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `faculties/${id}`);
  }
}

export async function fsDeleteFaculty(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'faculties', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `faculties/${id}`);
  }
}

export async function fsSaveDepartment(payload: Partial<Department>): Promise<void> {
  const id = payload.id || generateId('dept');
  try {
    await setDoc(doc(db, 'departments', id), {
      faculty_id: payload.faculty_id || '',
      kode_jurusan: (payload.kode_jurusan || '').trim().slice(0, 20),
      nama_jurusan: (payload.nama_jurusan || '').trim().slice(0, 150),
      jenjang: payload.jenjang || 'S1',
      biaya_spp_default: Math.max(0, Number(payload.biaya_spp_default) || 0),
      is_public: true,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `departments/${id}`);
  }
}

export async function fsDeleteDepartment(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'departments', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `departments/${id}`);
  }
}

export async function fsSaveStudent(payload: Partial<Student>): Promise<void> {
  const id = payload.id || generateId('std');
  try {
    await setDoc(doc(db, 'students', id), {
      user_id: payload.user_id || `uid-${id}`,
      nim: (payload.nim || '').trim().slice(0, 30),
      nama_lengkap: (payload.nama_lengkap || '').trim().slice(0, 120),
      email: (payload.email || `${payload.nim}@staialfurqan.ac.id`).trim().slice(0, 160),
      no_hp: (payload.no_hp || '-').trim().slice(0, 30),
      jenis_kelamin: payload.jenis_kelamin || 'Laki-laki',
      alamat: (payload.alamat || 'Makassar').trim().slice(0, 400),
      faculty_id: payload.faculty_id || '',
      department_id: payload.department_id || '',
      angkatan: Number(payload.angkatan) || 2026,
      semester_aktif: Number(payload.semester_aktif) || 1,
      status: payload.status || 'Aktif',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `students/${id}`);
  }
}

export async function fsDeleteStudent(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'students', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `students/${id}`);
  }
}

export async function fsSaveCourse(payload: Partial<Course>): Promise<void> {
  const id = payload.id || generateId('mk');
  try {
    await setDoc(doc(db, 'courses', id), {
      department_id: payload.department_id || '',
      kode_mk: (payload.kode_mk || '').trim().slice(0, 24),
      nama_mk: (payload.nama_mk || '').trim().slice(0, 160),
      sks: Math.min(6, Math.max(1, Number(payload.sks) || 3)),
      semester: Math.min(8, Math.max(1, Number(payload.semester) || 1)),
      dosen_pengampu: (payload.dosen_pengampu || '').trim().slice(0, 140),
      hari: payload.hari || 'Senin',
      jam_mulai: payload.jam_mulai || '08:00',
      jam_selesai: payload.jam_selesai || '10:30',
      ruangan: (payload.ruangan || '').trim().slice(0, 60),
      is_active: payload.is_active ?? true,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `courses/${id}`);
  }
}

export async function fsDeleteCourse(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'courses', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `courses/${id}`);
  }
}

export async function fsSaveBankAccount(payload: Partial<BankAccount>): Promise<void> {
  const id = payload.id || generateId('bank');
  try {
    await setDoc(doc(db, 'bank_accounts', id), {
      nama_bank: (payload.nama_bank || '').trim().slice(0, 100),
      nomor_rekening: (payload.nomor_rekening || '').trim().slice(0, 40),
      atas_nama: (payload.atas_nama || '').trim().slice(0, 150),
      keterangan: (payload.keterangan || '').trim().slice(0, 250),
      is_active: payload.is_active ?? true,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `bank_accounts/${id}`);
  }
}

export async function fsDeleteBankAccount(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'bank_accounts', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `bank_accounts/${id}`);
  }
}

export async function fsGenerateBills(
  students: Student[],
  departments: Department[],
  existingBills: TuitionBill[],
  tahunAkademik = CURRENT_ACADEMIC_YEAR,
  departmentId?: string
): Promise<number> {
  const targets = students.filter(
    (s) => s.status === 'Aktif' && (!departmentId || s.department_id === departmentId)
  );
  const batch = writeBatch(db);
  let created = 0;
  for (const s of targets) {
    const exists = existingBills.some(
      (b) => b.student_id === s.id && b.semester === s.semester_aktif && b.tahun_akademik === tahunAkademik
    );
    if (!exists) {
      const dept = departments.find((d) => d.id === s.department_id);
      const billId = generateId('bill');
      batch.set(doc(db, 'tuition_bills', billId), {
        student_id: s.id,
        user_id: s.user_id || `uid-${s.id}`,
        semester: s.semester_aktif,
        tahun_akademik: tahunAkademik,
        total_tagihan: dept?.biaya_spp_default || 2500000,
        total_terbayar: 0,
        skema_bayar: 'Lunas Sekali Bayar',
        status: 'Belum Bayar',
      });
      created++;
    }
  }
  if (created > 0) {
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tuition_bills');
    }
  }
  return created;
}

export async function fsConfigureInstallments(
  bill: TuitionBill,
  existingInstallments: InstallmentSchedule[],
  skemaBayar: 'Lunas Sekali Bayar' | 'Cicilan',
  schedules: { termin_ke: number; nominal_termin: number; tanggal_jatuh_tempo: string; status?: 'Belum Bayar' | 'Menunggu Verifikasi' | 'Lunas' }[]
): Promise<void> {
  const batch = writeBatch(db);
  const oldItems = existingInstallments.filter((i) => i.tuition_bill_id === bill.id);
  for (const old of oldItems) {
    batch.delete(doc(db, 'installment_schedules', old.id));
  }

  const nextStatus =
    bill.total_terbayar >= bill.total_tagihan
      ? 'Lunas'
      : skemaBayar === 'Cicilan' && bill.total_terbayar > 0
      ? 'Cicilan Berjalan'
      : 'Belum Bayar';

  batch.update(doc(db, 'tuition_bills', bill.id), {
    skema_bayar: skemaBayar,
    status: nextStatus,
  });

  if (skemaBayar === 'Cicilan') {
    schedules.forEach((s, idx) => {
      const instId = generateId(`inst-${idx + 1}`);
      batch.set(doc(db, 'installment_schedules', instId), {
        tuition_bill_id: bill.id,
        student_id: bill.student_id,
        user_id: bill.user_id,
        termin_ke: idx + 1,
        nominal_termin: Number(s.nominal_termin),
        tanggal_jatuh_tempo: s.tanggal_jatuh_tempo,
        status: s.status || 'Belum Bayar',
      });
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `tuition_bills/${bill.id}`);
  }
}

export async function fsApprovePaymentProof(
  proof: PaymentProof,
  bill: TuitionBill | undefined,
  installment: InstallmentSchedule | undefined
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'payment_proofs', proof.id), {
    status_verifikasi: 'Disetujui',
    alasan_penolakan: '',
    verified_at: new Date().toISOString(),
  });

  if (bill) {
    const updatedPaid = Math.min(bill.total_tagihan, bill.total_terbayar + proof.nominal_transfer);
    const updatedStatus =
      updatedPaid >= bill.total_tagihan
        ? 'Lunas'
        : updatedPaid > 0
        ? 'Cicilan Berjalan'
        : 'Belum Bayar';
    batch.update(doc(db, 'tuition_bills', bill.id), {
      total_terbayar: updatedPaid,
      status: updatedStatus,
    });
  }

  if (installment) {
    batch.update(doc(db, 'installment_schedules', installment.id), {
      status: 'Lunas',
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `payment_proofs/${proof.id}`);
  }
}

export async function fsRejectPaymentProof(
  proof: PaymentProof,
  alasanPenolakan: string,
  installment: InstallmentSchedule | undefined
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'payment_proofs', proof.id), {
    status_verifikasi: 'Ditolak',
    alasan_penolakan: alasanPenolakan.trim().slice(0, 400),
    verified_at: new Date().toISOString(),
  });

  if (installment && installment.status === 'Menunggu Verifikasi') {
    batch.update(doc(db, 'installment_schedules', installment.id), {
      status: 'Belum Bayar',
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `payment_proofs/${proof.id}`);
  }
}

export async function fsSaveStudentKrs(
  student: Student,
  existingEnrollments: { id: string; semester_diambil: number; student_id: string }[],
  courseIds: string[],
  uid: string
): Promise<void> {
  const batch = writeBatch(db);
  const currentSemEnrollments = existingEnrollments.filter(
    (e) => e.student_id === student.id && e.semester_diambil === student.semester_aktif
  );
  for (const old of currentSemEnrollments) {
    batch.delete(doc(db, 'student_enrollments', old.id));
  }
  const nowIso = new Date().toISOString();
  for (const cid of courseIds) {
    const enrId = generateId('enr');
    batch.set(doc(db, 'student_enrollments', enrId), {
      student_id: student.id,
      user_id: student.user_id || uid,
      course_id: cid,
      semester_diambil: student.semester_aktif,
      tahun_akademik: CURRENT_ACADEMIC_YEAR,
      created_at: nowIso,
    });
  }
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'student_enrollments');
  }
}

export async function fsSubmitPaymentProof(
  student: Student,
  payload: {
    tuition_bill_id: string;
    installment_id: string;
    bank_account_id: string;
    nominal_transfer: number;
    tanggal_transfer: string;
    file_url: string;
    file_name: string;
    file_type: string;
    catatan: string;
  },
  uid: string
): Promise<void> {
  const proofId = generateId('proof');
  const batch = writeBatch(db);
  batch.set(doc(db, 'payment_proofs', proofId), {
    student_id: student.id,
    user_id: student.user_id || uid,
    tuition_bill_id: payload.tuition_bill_id,
    installment_id: payload.installment_id || '',
    bank_account_id: payload.bank_account_id,
    nominal_transfer: Number(payload.nominal_transfer),
    tanggal_transfer: payload.tanggal_transfer,
    file_url: payload.file_url,
    file_name: payload.file_name.slice(0, 200),
    file_type: payload.file_type.slice(0, 60),
    catatan: payload.catatan.trim().slice(0, 400),
    status_verifikasi: 'Menunggu Verifikasi',
    alasan_penolakan: '',
    verified_at: '',
    created_at: new Date().toISOString(),
  });

  if (payload.installment_id) {
    batch.update(doc(db, 'installment_schedules', payload.installment_id), {
      status: 'Menunggu Verifikasi',
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `payment_proofs/${proofId}`);
  }
}

export async function fsUpdateStudentContact(
  studentId: string,
  no_hp: string,
  alamat: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'students', studentId), {
      no_hp: no_hp.trim().slice(0, 30),
      alamat: alamat.trim().slice(0, 400),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `students/${studentId}`);
  }
}
