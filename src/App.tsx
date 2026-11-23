import React, { useEffect, useState } from 'react';
import { AdminBankAccounts } from './components/admin/AdminBankAccounts';
import { AdminCourses } from './components/admin/AdminCourses';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminFacultiesDepartments } from './components/admin/AdminFacultiesDepartments';
import { AdminPaymentVerification } from './components/admin/AdminPaymentVerification';
import { AdminStudents } from './components/admin/AdminStudents';
import { AdminTuitionBills } from './components/admin/AdminTuitionBills';
import { DashboardLayout } from './components/DashboardLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './components/LoginPage';
import { StudentBilling } from './components/student/StudentBilling';
import { StudentDashboard } from './components/student/StudentDashboard';
import { StudentKrs } from './components/student/StudentKrs';
import { StudentProfile } from './components/student/StudentProfile';
import { StudentUploadProof } from './components/student/StudentUploadProof';
import { ToastContainer } from './components/ToastContainer';
import { SiakadProvider, useSiakad } from './context/SiakadContext';
import type { AdminMenuKey, StudentMenuKey } from './types/siakad';
import { CAMPUS_LOGO_URL } from './utils/formatters';

const ADMIN_PAGES: Record<AdminMenuKey, string> = {
  dashboard: 'Dashboard Analytics',
  students: 'Data Mahasiswa',
  student_detail: 'Detail Mahasiswa',
  faculties_departments: 'Fakultas & Jurusan',
  courses: 'Mata Kuliah',
  bank_accounts: 'Rekening Bank Kampus',
  tuition_bills: 'Pembayaran & Cicilan SPP',
  payment_verification: 'Verifikasi Bukti Bayar',
};

const STUDENT_PAGES: Record<StudentMenuKey, string> = {
  student_dashboard: 'Dashboard Mahasiswa',
  student_krs: 'Mata Kuliah & KRS',
  student_billing: 'Pembayaran SPP & Rekening',
  student_upload: 'Upload Bukti Bayar',
  student_profile: 'Profil Saya',
};

const SiakadShell: React.FC = () => {
  const { user, authLoading, dataLoading } = useSiakad();
  const [adminPage, setAdminPage] = useState<AdminMenuKey>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentPage, setStudentPage] = useState<StudentMenuKey>('student_dashboard');
  const [uploadPreset, setUploadPreset] = useState<{
    billId: string;
    installmentId?: string;
    nominal?: number;
  } | null>(null);

  // Reset route safely whenever role changes (strict route protection)
  useEffect(() => {
    if (user?.role === 'admin') {
      setAdminPage('dashboard');
      setSelectedStudentId(null);
    } else if (user?.role === 'mahasiswa') {
      setStudentPage('student_dashboard');
      setUploadPreset(null);
    }
  }, [user?.role, user?.uid]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F7FAF7] flex flex-col items-center justify-center p-6">
        <img
          src={CAMPUS_LOGO_URL}
          alt="STAI AL FURQAN Makassar"
          referrerPolicy="no-referrer"
          className="w-16 h-16 object-contain rounded-full bg-white p-1 border border-[#D5E4D7] mb-4"
        />
        <p className="text-sm font-semibold text-[#122B18]">Memuat SIAKAD STAI AL-FURQAN Makassar...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Strict Role Guard: Admin View
  if (user.role === 'admin') {
    const handleAdminNav = (page: string) => {
      if (page in ADMIN_PAGES) {
        const key = page as AdminMenuKey;
        setAdminPage(key);
        if (key !== 'student_detail') {
          setSelectedStudentId(null);
        }
      }
    };

    const handleViewStudent = (studentId: string) => {
      setSelectedStudentId(studentId);
      setAdminPage('student_detail');
    };

    const activeTitle =
      adminPage === 'student_detail' && selectedStudentId
        ? 'Detail Profil & Akademik Mahasiswa'
        : ADMIN_PAGES[adminPage];

    return (
      <DashboardLayout
        activePage={adminPage}
        onNavigate={handleAdminNav}
        pageTitle={activeTitle}
      >
        {dataLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-28 rounded-xl bg-white border border-[#D5E4D7] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            {adminPage === 'dashboard' && (
              <AdminDashboard
                onViewStudent={handleViewStudent}
                onGoToVerification={() => handleAdminNav('payment_verification')}
              />
            )}
            {(adminPage === 'students' || adminPage === 'student_detail') && (
              <AdminStudents
                selectedStudentId={selectedStudentId}
                onSelectStudent={(id) => {
                  setSelectedStudentId(id);
                  setAdminPage(id ? 'student_detail' : 'students');
                }}
              />
            )}
            {adminPage === 'faculties_departments' && <AdminFacultiesDepartments />}
            {adminPage === 'courses' && <AdminCourses />}
            {adminPage === 'bank_accounts' && <AdminBankAccounts />}
            {adminPage === 'tuition_bills' && <AdminTuitionBills />}
            {adminPage === 'payment_verification' && <AdminPaymentVerification />}
          </>
        )}
      </DashboardLayout>
    );
  }

  // Strict Role Guard: Mahasiswa View (cannot access any Admin route)
  const handleStudentNav = (page: string) => {
    if (page in STUDENT_PAGES) {
      setStudentPage(page as StudentMenuKey);
    }
  };

  return (
    <DashboardLayout
      activePage={studentPage}
      onNavigate={handleStudentNav}
      pageTitle={STUDENT_PAGES[studentPage]}
    >
      {dataLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-28 rounded-xl bg-white border border-[#D5E4D7] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {studentPage === 'student_dashboard' && (
            <StudentDashboard
              onNavigate={(p) => setStudentPage(p)}
              onGoToUpload={(preset) => {
                setUploadPreset(preset);
                setStudentPage('student_upload');
              }}
            />
          )}
          {studentPage === 'student_krs' && <StudentKrs />}
          {studentPage === 'student_billing' && (
            <StudentBilling
              onGoToUpload={(preset) => {
                setUploadPreset(preset || null);
                setStudentPage('student_upload');
              }}
            />
          )}
          {studentPage === 'student_upload' && <StudentUploadProof preset={uploadPreset} />}
          {studentPage === 'student_profile' && <StudentProfile />}
        </>
      )}
    </DashboardLayout>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <SiakadProvider>
        <SiakadShell />
        <ToastContainer />
      </SiakadProvider>
    </ErrorBoundary>
  );
}
