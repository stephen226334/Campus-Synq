import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import DeanHeader from './DeanHeader';
import DeanSidebar from './DeanSidebar';
import EntityDetailDrawer from '../dean/EntityDetailDrawer';
import ModifySubstitutionModal from '../dean/ModifySubstitutionModal';
import '../../styles/dean.css';

export const DeanLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [selectedSubForModify, setSelectedSubForModify] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = useNavigate();

  const handleOpenSearch = () => {
    navigate('/dean/search');
  };

  const handleSubstitutionSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="dp-shell">
      {/* Top Header (Height: 68px, Sticky) */}
      <DeanHeader
        onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        mobileSidebarOpen={mobileSidebarOpen}
        onOpenSearch={handleOpenSearch}
      />

      {/* Main Layout: 240px Sticky Sidebar + Content */}
      <div className="dp-body-layout">
        <DeanSidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="dp-main" id="dean-main-content">
          <Outlet
            context={{
              openEntityDrawer: setSelectedEntity,
              openModifyModal: setSelectedSubForModify,
              refreshKey
            }}
          />
        </main>
      </div>

      {/* Shared Slide-out Detail Drawer */}
      {selectedEntity && (
        <EntityDetailDrawer
          entity={selectedEntity}
          onClose={() => setSelectedEntity(null)}
          onModifySubstitution={(sub) => {
            setSelectedSubForModify(sub);
          }}
        />
      )}

      {/* Shared Substitution Modification Modal */}
      {selectedSubForModify && (
        <ModifySubstitutionModal
          substitution={selectedSubForModify}
          isOpen={!!selectedSubForModify}
          onClose={() => setSelectedSubForModify(null)}
          onSuccess={handleSubstitutionSuccess}
        />
      )}
    </div>
  );
};

export default DeanLayout;
