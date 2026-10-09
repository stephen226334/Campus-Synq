import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

export const FacultyInfoCard = ({ faculty }) => {
  const fullName = faculty?.fullName || 'Faculty Member';
  const initial = fullName[0].toUpperCase();
  const designation = faculty?.designation || 'Associate Professor';
  const facultyId = faculty?.facultyId || 'FAC-CS-01';
  const email = faculty?.officialEmail || faculty?.email || 'faculty@campussynq.com';
  const department = faculty?.department || 'Computer Science Department';

  return (
    <div className="fp-profile-compact-card">
      <div>
        <div className="fp-bottom-card-header">
          <h3>Faculty Information</h3>
        </div>

        <div className="fp-profile-row">
          <div className="fp-profile-avatar-large">
            {initial}
          </div>
          <div className="fp-profile-names">
            <span className="fp-profile-name-lg">{fullName}</span>
            <span className="fp-profile-designation">{designation}</span>
          </div>
        </div>

        <div className="fp-profile-lines">
          <div className="fp-profile-line">
            <span className="fp-line-lbl">Faculty ID</span>
            <span className="fp-line-val">{facultyId}</span>
          </div>
          <div className="fp-profile-line">
            <span className="fp-line-lbl">Official Email</span>
            <span className="fp-line-val" style={{ wordBreak: 'break-all' }}>{email}</span>
          </div>
          <div className="fp-profile-line">
            <span className="fp-line-lbl">Department</span>
            <span className="fp-line-val">{department}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '12px' }}>
        <Link to="/faculty/profile" className="fp-btn-outline" style={{ width: '100%' }}>
          <span>View Profile</span>
          <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  );
};

export default FacultyInfoCard;
