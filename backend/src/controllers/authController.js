const Admin = require('../models/Admin');
const Faculty = require('../models/Faculty');
const { generateToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Check if the system has been initialized with an initial Admin
 * GET /api/v1/auth/status
 */
const getAuthStatus = async (req, res, next) => {
  try {
    const adminCount = await Admin.countDocuments();
    return successResponse(res, {
      isInitialized: adminCount > 0,
      adminCount
    }, 'Auth status retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Register Initial Admin
 * POST /api/v1/auth/signup
 */
const signup = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if an admin already exists (Restriction: Initial registration lock)
    const existingAdminCount = await Admin.countDocuments();
    if (existingAdminCount > 0) {
      return errorResponse(
        res,
        'Initial Admin account has already been registered. Public admin registration is locked.',
        403
      );
    }

    // Check for duplicate email
    const duplicate = await Admin.findOne({ email: email.toLowerCase() });
    if (duplicate) {
      return errorResponse(res, 'An account with this email already exists.', 409);
    }

    const admin = await Admin.create({
      fullName,
      email: email.toLowerCase(),
      password,
      role: 'ADMIN',
      status: 'ACTIVE',
      department: 'Computer Science',
      lastLogin: new Date()
    });

    const token = generateToken({
      userId: admin._id,
      role: admin.role,
      email: admin.email,
      fullName: admin.fullName
    });

    return successResponse(
      res,
      {
        token,
        admin: {
          id: admin._id,
          fullName: admin.fullName,
          email: admin.email,
          role: admin.role,
          department: admin.department,
          status: admin.status
        },
        user: {
          id: admin._id,
          fullName: admin.fullName,
          email: admin.email,
          role: admin.role,
          department: admin.department,
          status: admin.status
        }
      },
      'Admin registered successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Login (Admin or Faculty)
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'Email and password are required', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Try Admin account first
    const admin = await Admin.findOne({ email: normalizedEmail }).select('+password');
    if (admin) {
      if (admin.status !== 'ACTIVE') {
        return errorResponse(res, 'Account is inactive. Please contact support.', 403);
      }

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        return errorResponse(res, 'Invalid credentials. Unknown email or incorrect password.', 401);
      }

      admin.lastLogin = new Date();
      await admin.save({ validateBeforeSave: false });

      const token = generateToken({
        userId: admin._id,
        role: admin.role,
        email: admin.email,
        fullName: admin.fullName
      });

      return successResponse(
        res,
        {
          token,
          admin: {
            id: admin._id,
            fullName: admin.fullName,
            email: admin.email,
            role: admin.role,
            department: admin.department,
            status: admin.status,
            lastLogin: admin.lastLogin
          },
          user: {
            id: admin._id,
            fullName: admin.fullName,
            email: admin.email,
            role: admin.role,
            department: admin.department,
            status: admin.status,
            lastLogin: admin.lastLogin
          }
        },
        'Logged in successfully'
      );
    }

    // 2. Try Faculty account (official email or personal email)
    const faculty = await Faculty.findOne({
      $or: [
        { officialEmail: normalizedEmail },
        { personalEmail: normalizedEmail }
      ]
    }).select('+password');

    if (faculty) {
      if (faculty.status !== 'ACTIVE') {
        return errorResponse(res, 'Faculty account is inactive. Please contact administrator.', 403);
      }

      const isMatch = await faculty.comparePassword(password);
      if (!isMatch) {
        return errorResponse(res, 'Invalid credentials. Unknown email or incorrect password.', 401);
      }

      const role = faculty.role || 'FACULTY';
      const token = generateToken({
        userId: faculty._id,
        role,
        email: faculty.officialEmail,
        fullName: faculty.fullName,
        facultyId: faculty.facultyId
      });

      return successResponse(
        res,
        {
          token,
          faculty: {
            id: faculty._id,
            facultyId: faculty.facultyId,
            fullName: faculty.fullName,
            email: faculty.officialEmail,
            personalEmail: faculty.personalEmail,
            role,
            department: faculty.department,
            designation: faculty.designation,
            status: faculty.status
          },
          user: {
            id: faculty._id,
            facultyId: faculty.facultyId,
            fullName: faculty.fullName,
            email: faculty.officialEmail,
            officialEmail: faculty.officialEmail,
            personalEmail: faculty.personalEmail,
            role,
            department: faculty.department,
            designation: faculty.designation,
            status: faculty.status
          }
        },
        'Faculty logged in successfully'
      );
    }

    return errorResponse(res, 'Invalid credentials. Unknown email or incorrect password.', 401);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Current User Profile (Admin or Faculty)
 * GET /api/v1/auth/me
 */
const getCurrentUser = async (req, res) => {
  if (req.user.facultyId || req.user.role === 'FACULTY' || req.user.role === 'HOD_FACULTY') {
    return successResponse(
      res,
      {
        id: req.user._id,
        facultyId: req.user.facultyId,
        fullName: req.user.fullName,
        email: req.user.officialEmail || req.user.email,
        personalEmail: req.user.personalEmail,
        phone: req.user.phone,
        role: req.user.role || 'FACULTY',
        department: req.user.department,
        designation: req.user.designation,
        status: req.user.status,
        createdAt: req.user.createdAt
      },
      'Faculty profile retrieved successfully'
    );
  }

  return successResponse(
    res,
    {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      role: req.user.role,
      department: req.user.department,
      status: req.user.status,
      lastLogin: req.user.lastLogin,
      createdAt: req.user.createdAt
    },
    'Profile retrieved successfully'
  );
};

/**
 * Logout
 * POST /api/v1/auth/logout
 */
const logout = async (req, res) => {
  return successResponse(res, null, 'Logged out successfully');
};

module.exports = {
  getAuthStatus,
  signup,
  login,
  getCurrentUser,
  logout
};
