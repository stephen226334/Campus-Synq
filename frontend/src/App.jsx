import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

// Layouts & Guard
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import SemestersPage from './pages/masterData/SemestersPage';
import SubjectsPage from './pages/masterData/SubjectsPage';
import ClassSectionsPage from './pages/masterData/ClassSectionsPage';
import ClassroomsPage from './pages/masterData/ClassroomsPage';
import LabsPage from './pages/masterData/LabsPage';
import AuditoriumsPage from './pages/masterData/AuditoriumsPage';
import ProfilePage from './pages/profile/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Admin Scheduling Pages
import FacultyPage from './pages/faculty/FacultyPage';
import TimetablePage from './pages/timetable/TimetablePage';
import PeriodsPage from './pages/masterData/PeriodsPage';

// Faculty Portal Components
import FacultyLayout from './components/layout/FacultyLayout';
import FacultyDashboardPage from './pages/faculty/FacultyDashboardPage';
import FacultyTimetablePage from './pages/faculty/FacultyTimetablePage';
import FacultyWeeklyPage from './pages/faculty/FacultyWeeklyPage';
import FacultySubstitutionsPage from './pages/faculty/FacultySubstitutionsPage';
import FacultyProfilePage from './pages/faculty/FacultyProfilePage';

// Dean Portal Components
import DeanLayout from './components/layout/DeanLayout';
import DeanLoginPage from './pages/dean/DeanLoginPage';
import DeanDashboardPage from './pages/dean/DeanDashboardPage';
import DeanClassSearchPage from './pages/dean/DeanClassSearchPage';
import DeanRoomSearchPage from './pages/dean/DeanRoomSearchPage';
import DeanFacultySearchPage from './pages/dean/DeanFacultySearchPage';
import DeanFreeRoomsPage from './pages/dean/DeanFreeRoomsPage';
import DeanCurrentStatusPage from './pages/dean/DeanCurrentStatusPage';
import DeanSearchPage from './pages/dean/DeanSearchPage';
import DeanFacultyPage from './pages/dean/DeanFacultyPage';
import DeanFacultyDetailPage from './pages/dean/DeanFacultyDetailPage';
import DeanSubjectsPage from './pages/dean/DeanSubjectsPage';
import DeanClassroomsPage from './pages/dean/DeanClassroomsPage';
import DeanLabsPage from './pages/dean/DeanLabsPage';
import DeanAuditoriumsPage from './pages/dean/DeanAuditoriumsPage';
import DeanSemestersPage from './pages/dean/DeanSemestersPage';
import DeanSectionsPage from './pages/dean/DeanSectionsPage';
import DeanTimetablePage from './pages/dean/DeanTimetablePage';
import DeanSubstitutionsPage from './pages/dean/DeanSubstitutionsPage';
import DeanProfilePage from './pages/dean/DeanProfilePage';

import LoadingSkeleton from './components/common/LoadingSkeleton';
import { useAuth } from './context/AuthContext';

const RootRedirect = () => {
  const { user, isAuthenticated, isFaculty, isAdmin, isDean, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <LoadingSkeleton message="Authenticating session..." rows={4} cols={4} />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isDean) return <Navigate to="/dean/dashboard" replace />;
  if (isFaculty) return <Navigate to="/faculty/dashboard" replace />;
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/login" replace />;
};

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin/login" element={<LoginPage />} />
              <Route path="/faculty/login" element={<LoginPage />} />
              <Route path="/dean/login" element={<DeanLoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* Protected Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                
                {/* Stage 2 Academic & Scheduling Routes */}
                <Route path="faculty" element={<FacultyPage />} />
                <Route path="timetable" element={<TimetablePage />} />
                <Route path="periods" element={<PeriodsPage />} />

                {/* Stage 1 Master Data Routes */}
                <Route path="semesters" element={<SemestersPage />} />
                <Route path="subjects" element={<SubjectsPage />} />
                <Route path="class-sections" element={<ClassSectionsPage />} />
                <Route path="classrooms" element={<ClassroomsPage />} />
                <Route path="labs" element={<LabsPage />} />
                <Route path="auditoriums" element={<AuditoriumsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              {/* Protected Faculty Routes */}
              <Route
                path="/faculty"
                element={
                  <ProtectedRoute allowedRoles={['FACULTY', 'HOD_FACULTY']}>
                    <FacultyLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/faculty/dashboard" replace />} />
                <Route path="dashboard" element={<FacultyDashboardPage />} />
                <Route path="timetable" element={<FacultyTimetablePage />} />
                <Route path="weekly" element={<FacultyWeeklyPage />} />
                <Route path="weekly-schedule" element={<FacultyWeeklyPage />} />
                <Route path="substitutions" element={<FacultySubstitutionsPage />} />
                <Route path="profile" element={<FacultyProfilePage />} />
              </Route>

              {/* Protected Dean Oversight Routes (DEAN role only) */}
              <Route
                path="/dean"
                element={
                  <ProtectedRoute allowedRoles={['DEAN']}>
                    <DeanLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dean/dashboard" replace />} />
                <Route path="dashboard" element={<DeanDashboardPage />} />
                <Route path="class-search" element={<DeanClassSearchPage />} />
                <Route path="room-search" element={<DeanRoomSearchPage />} />
                <Route path="faculty-search" element={<DeanFacultySearchPage />} />
                <Route path="free-rooms" element={<DeanFreeRoomsPage />} />
                <Route path="current-status" element={<DeanCurrentStatusPage />} />
                <Route path="search" element={<DeanSearchPage />} />
                <Route path="faculty" element={<DeanFacultyPage />} />
                <Route path="faculty/:id" element={<DeanFacultyDetailPage />} />
                <Route path="subjects" element={<DeanSubjectsPage />} />
                <Route path="classrooms" element={<DeanClassroomsPage />} />
                <Route path="labs" element={<DeanLabsPage />} />
                <Route path="auditoriums" element={<DeanAuditoriumsPage />} />
                <Route path="semesters" element={<DeanSemestersPage />} />
                <Route path="sections" element={<DeanSectionsPage />} />
                <Route path="timetable" element={<DeanTimetablePage />} />
                <Route path="substitutions" element={<DeanSubstitutionsPage />} />
                <Route path="profile" element={<DeanProfilePage />} />
              </Route>

              {/* Redirect root based on role */}
              <Route path="/" element={<RootRedirect />} />

              {/* Fallback 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
