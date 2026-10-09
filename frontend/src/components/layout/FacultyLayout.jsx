import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import FacultyHeader from './FacultyHeader';
import FacultySidebar from './FacultySidebar';
import '../../styles/faculty.css';

export const FacultyLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="fp-shell">
      {/* Top Header (68px, white/dark, sticky) */}
      <FacultyHeader
        onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        mobileSidebarOpen={mobileSidebarOpen}
      />

      {/* Main Body: Sticky Sidebar (240px) + Main Content Area */}
      <div className="fp-body-layout">
        <FacultySidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="fp-main" id="faculty-main-content">
          <div className="fp-content-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default FacultyLayout;
