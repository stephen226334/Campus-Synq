# CAMPUS SYNQ — ADMIN APPLICATION (STAGE 1)
## COMPREHENSIVE ARCHITECTURE & IMPLEMENTATION REPORT

**Product:** Campus Synq  
**Module:** Admin Application — Stage 1  
**Scope:** Computer Science Department Academic Administration  
**Target Roles:** ADMIN (Stage 1), HOD / Faculty (Stage 2 - Coming Soon), Student (Stage 3 - Coming Soon)  
**Database:** MongoDB Local (`mongodb://127.0.0.1:27017/campus_synq`)

---

## 1. Executive Summary

Campus Synq Admin Application (Stage 1) is an end-to-end administrative portal engineered from scratch for the Department of Computer Science. Built using a modern JavaScript stack (Node.js, Express.js, Mongoose, React, Vite, and custom CSS design system), it delivers secure authentication, real-data dashboard analytics, and full CRUD management for institutional master data:
- **Semesters & Academic Years**
- **Curriculum Subjects**
- **Class Sections & Cohorts**
- **Lecture Classrooms**
- **Computing Laboratories**
- **Department Auditoriums**

All records and statistics are backed strictly by local MongoDB database operations with zero mock data.

---

## 2. Technology Stack

### Frontend
- **Framework:** React 18 with Vite
- **Language:** JavaScript (ES6+ Modules)
- **Styling:** Vanilla CSS design tokens with custom CSS variables (Purple/Neutral theme)
- **Routing:** React Router v6 with protected route guards
- **Icons:** Lucide React icons
- **State & Context:** React Context API (`AuthContext`, `ThemeContext`, `ToastContext`)

### Backend
- **Runtime:** Node.js v23.6+
- **Server Framework:** Express.js
- **Database & ODM:** MongoDB Local (port 27017) with Mongoose v8
- **Authentication:** JSON Web Tokens (`jsonwebtoken`), salted password hashing (`bcryptjs`)
- **Validation:** `express-validator` middleware
- **Logging & Security:** `morgan`, `cors`

---

## 3. System Architecture & Project Structure

```text
c:\CAMPUS SYNQ\
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js             # MongoDB connection with Mongoose
│   │   │   └── env.js            # Central environment configuration
│   │   ├── controllers/
│   │   │   ├── adminDashboardController.js  # Real counts and recent records
│   │   │   ├── authController.js            # Signup lock, Login, Me, Logout
│   │   │   ├── semesterController.js        # Semesters CRUD & cascade guard
│   │   │   ├── subjectController.js         # Subjects CRUD & unique code check
│   │   │   ├── classSectionController.js    # Sections CRUD & semester link
│   │   │   ├── classroomController.js       # Classrooms CRUD
│   │   │   ├── labController.js             # Labs CRUD
│   │   │   └── auditoriumController.js      # Auditoriums CRUD
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js     # Bearer JWT verification & user load
│   │   │   ├── roleMiddleware.js     # Role verification ('ADMIN')
│   │   │   ├── validateMiddleware.js # express-validator error extractor
│   │   │   └── errorMiddleware.js    # Central error handler (duplicate key, CastError, 404)
│   │   ├── models/
│   │   │   ├── Admin.js              # admins collection schema
│   │   │   ├── Semester.js           # semesters collection schema
│   │   │   ├── Subject.js            # subjects collection schema
│   │   │   ├── ClassSection.js       # classSections collection schema
│   │   │   ├── Classroom.js          # classrooms collection schema
│   │   │   ├── Lab.js                # labs collection schema
│   │   │   └── Auditorium.js         # auditoriums collection schema
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── dashboardRoutes.js
│   │   │   ├── semesterRoutes.js
│   │   │   ├── subjectRoutes.js
│   │   │   ├── classSectionRoutes.js
│   │   │   ├── classroomRoutes.js
│   │   │   ├── labRoutes.js
│   │   │   ├── auditoriumRoutes.js
│   │   │   └── index.js              # Mounted at /api/v1
│   │   ├── utils/
│   │   │   ├── jwt.js                # Token sign & verify
│   │   │   └── response.js           # Standard success/error JSON envelopes
│   │   ├── app.js                    # Express app configuration
│   │   └── server.js                 # HTTP listener & database connection
│   ├── tests/
│   │   └── api.test.js               # 17 automated tests using native test runner
│   ├── .env
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   ├── auth-hero.jpg             # High-res academic CS campus hero illustration
│   │   └── logo.png                  # Official Campus Synq brand identity logo
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js             # Fetch wrapper with JWT headers & 401 handling
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Badge.jsx         # Status pill badges (Active, Inactive, Coming Soon)
│   │   │   │   ├── ConfirmDialog.jsx # Safe delete confirmation with blocked-reason display
│   │   │   │   ├── DataTable.jsx     # Master table with search, filters, actions
│   │   │   │   ├── EmptyState.jsx    # Actionable empty state displays
│   │   │   │   ├── LoadingSkeleton.jsx # Pulse skeleton loaders & spinner
│   │   │   │   ├── Modal.jsx         # Accessible dialog modal
│   │   │   │   └── StatCard.jsx      # Metric cards with links
│   │   │   └── layout/
│   │   │       ├── AdminLayout.jsx   # Collapsible sidebar + sticky header wrapper
│   │   │       ├── Header.jsx        # Breadcrumbs, theme toggle, profile chip, logout
│   │   │       ├── ProtectedRoute.jsx# Auth guard redirecting to /login
│   │   │       └── Sidebar.jsx       # Master Data navigation + Stage 2 Coming Soon badges
│   │   ├── context/
│   │   │   ├── AuthContext.jsx       # User state, token, login, signup, session check
│   │   │   ├── ThemeContext.jsx      # Light/Dark mode with localStorage persistence
│   │   │   └── ToastContext.jsx      # Slide-in toast alerts
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.jsx     # Majavana split-screen login
│   │   │   │   └── SignupPage.jsx    # Initial admin registration with public lock
│   │   │   ├── dashboard/
│   │   │   │   └── DashboardPage.jsx # Real MongoDB counts & recent items
│   │   │   ├── masterData/
│   │   │   │   ├── SemestersPage.jsx # Semesters CRUD
│   │   │   │   ├── SubjectsPage.jsx  # Subjects CRUD
│   │   │   │   ├── ClassSectionsPage.jsx # Class sections CRUD
│   │   │   │   ├── ClassroomsPage.jsx # Classrooms CRUD
│   │   │   │   ├── LabsPage.jsx      # Labs CRUD
│   │   │   │   └── AuditoriumsPage.jsx # Auditoriums CRUD
│   │   │   ├── profile/
│   │   │   │   └── ProfilePage.jsx   # Admin profile details
│   │   │   ├── NotFoundPage.jsx      # 404 page
│   │   ├── App.jsx                   # Central routing tree
│   │   ├── index.css                 # Comprehensive design system
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── docs/
│   ├── DEVELOPMENT_PROGRESS.md
│   └── ADMIN_STAGE_1_REPORT.md
├── .gitignore
└── README.md
```

---

## 4. Database Collections & Schemas

| Collection | Key Fields | Constraints & Indexes |
| :--- | :--- | :--- |
| `admins` | `fullName`, `email`, `password`, `role`, `department`, `status`, `lastLogin` | `email` unique index, password hashed via bcrypt |
| `semesters` | `name`, `academicYear`, `status` | Compound unique index on `{ name: 1, academicYear: 1 }` |
| `subjects` | `name`, `code`, `semester` (ref: Semester), `status` | `code` unique index, uppercase |
| `classSections`| `name`, `semester` (ref: Semester), `status` | Compound unique index on `{ name: 1, semester: 1 }` |
| `classrooms` | `roomNumber`, `capacity`, `status` | `roomNumber` unique index, min capacity 1 |
| `labs` | `labName`, `labNumber`, `capacity`, `status` | `labNumber` unique index |
| `auditoriums` | `auditoriumName`, `auditoriumNumber`, `capacity`, `status` | `auditoriumNumber` unique index |

---

## 5. Security & RBAC Enforcement

1. **Initial Admin Setup Lock:**
   - On `POST /api/v1/auth/signup`, the backend queries `Admin.countDocuments()`.
   - If an administrator already exists, public registration is rejected with `403 Forbidden` (`"Initial Admin account has already been registered. Public admin registration is locked."`).
   - The UI automatically renders a lock screen explaining that arbitrary signups are disabled.
2. **Password Cryptography:**
   - Plaintext passwords never enter the database.
   - Salted with 10 rounds using `bcryptjs`.
   - The `password` field is configured with `select: false` and stripped in `toJSON()`.
3. **JWT Authentication:**
   - Tokens signed with HMAC-SHA256 containing `userId`, `role`, `email`, and `fullName`.
   - Expiration configured via environment (`JWT_EXPIRES_IN=7d`).
   - Validated on every protected endpoint via `authMiddleware`.
4. **Referential Integrity Guards:**
   - Deleting a Semester that has existing Subjects or Class Sections is blocked with `400 Bad Request`.
   - The error response informs the administrator exactly how many dependents exist so data is not orphaned.

---

## 6. REST API Endpoints Catalog

### Authentication
- `GET  /api/v1/auth/status` — Check initialization status (whether root admin exists).
- `POST /api/v1/auth/signup` — Initial admin registration (locked once 1 admin exists).
- `POST /api/v1/auth/login` — Authenticate admin, returns JWT token.
- `GET  /api/v1/auth/me` — Retrieve current authenticated admin profile (Protected).
- `POST /api/v1/auth/logout` — Revoke local session (Protected).

### Dashboard
- `GET  /api/v1/admin/dashboard` — Returns real MongoDB document counts for all master entities and recent 5 records for subjects, classrooms, and sections.

### Master Data CRUD
- **Semesters:**
  - `GET    /api/v1/admin/semesters` (supports `search`, `status`)
  - `GET    /api/v1/admin/semesters/:id`
  - `POST   /api/v1/admin/semesters`
  - `PUT    /api/v1/admin/semesters/:id`
  - `DELETE /api/v1/admin/semesters/:id` (with dependency check)
- **Subjects:**
  - `GET    /api/v1/admin/subjects` (supports `search`, `semester`, `status`)
  - `GET    /api/v1/admin/subjects/:id`
  - `POST   /api/v1/admin/subjects`
  - `PUT    /api/v1/admin/subjects/:id`
  - `DELETE /api/v1/admin/subjects/:id`
- **Class Sections:**
  - `GET    /api/v1/admin/class-sections` (supports `search`, `semester`, `status`)
  - `GET    /api/v1/admin/class-sections/:id`
  - `POST   /api/v1/admin/class-sections`
  - `PUT    /api/v1/admin/class-sections/:id`
  - `DELETE /api/v1/admin/class-sections/:id`
- **Classrooms:**
  - `GET    /api/v1/admin/classrooms` (supports `search`, `status`)
  - `GET    /api/v1/admin/classrooms/:id`
  - `POST   /api/v1/admin/classrooms`
  - `PUT    /api/v1/admin/classrooms/:id`
  - `DELETE /api/v1/admin/classrooms/:id`
- **Labs:**
  - `GET    /api/v1/admin/labs` (supports `search`, `status`)
  - `GET    /api/v1/admin/labs/:id`
  - `POST   /api/v1/admin/labs`
  - `PUT    /api/v1/admin/labs/:id`
  - `DELETE /api/v1/admin/labs/:id`
- **Auditoriums:**
  - `GET    /api/v1/admin/auditoriums` (supports `search`, `status`)
  - `GET    /api/v1/admin/auditoriums/:id`
  - `POST   /api/v1/admin/auditoriums`
  - `PUT    /api/v1/admin/auditoriums/:id`
  - `DELETE /api/v1/admin/auditoriums/:id`

---

## 7. Automated Testing Results

### Backend Automated Test Suite
Run command: `npm test` inside `c:\CAMPUS SYNQ\backend`
Result: **17 passed, 0 failed** across all test suites:
1. Health check endpoint responds OK.
2. Auth Status returns initialization state.
3. Admin Signup validation catches malformed requests.
4. Initial Admin registration succeeds & secondary public registration is locked (403).
5. Auth Login with invalid credentials returns 401.
6. Protected route without token returns 401.
7. Protected route with valid token returns admin profile without password hash.
8. Dashboard API returns real database counts.
9. Semesters CRUD: creation, duplicate conflict detection (409), search, update.
10. Subjects CRUD: creation, duplicate code check (409), foreign key validation.
11. Class Sections CRUD: creation and uniqueness within semester.
12. Classrooms CRUD: unique room number enforcement.
13. Labs CRUD: unique lab number enforcement.
14. Auditoriums CRUD: unique auditorium code enforcement.
15. Referential integrity check prevents deleting referenced semester (400).
16. Clean deletion after dependencies are removed.

### Frontend Compilation
Run command: `npm run build` inside `c:\CAMPUS SYNQ\frontend`
Result: **Exit code 0**, 1607 modules transformed, production assets compiled in 8.05 seconds.

---

## 8. Definition of Done Checklist

- [x] Admin Signup works
- [x] Admin Login works
- [x] Admin Logout works
- [x] JWT authentication works
- [x] Password hashing with bcrypt works
- [x] Protected routes work
- [x] Admin RBAC enforced
- [x] Real-data Dashboard with MongoDB counts
- [x] Real recent records displayed on Dashboard
- [x] Semesters CRUD works with search and filter
- [x] Subjects CRUD works with search, semester filter, and status filter
- [x] Class Sections CRUD works with semester filter
- [x] Classrooms CRUD works with room search
- [x] Labs CRUD works with lab number uniqueness
- [x] Auditoriums CRUD works with hall number uniqueness
- [x] Delete confirmations and referential cascade protections
- [x] Light and Dark modes with persistent theme toggle
- [x] Responsive layout (desktop, tablet, mobile)
- [x] No mock data, no fake APIs, no TODOs
- [x] Majavana split-screen login/signup with academic CS visual
- [x] Stage 2 features explicitly designated as "Coming Soon"
