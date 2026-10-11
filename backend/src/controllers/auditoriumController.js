const Auditorium = require('../models/Auditorium');
const TimetableEntry = require('../models/TimetableEntry');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all auditoriums with search & filter
 * GET /api/v1/admin/auditoriums
 */
const getAuditoriums = async (req, res, next) => {
  try {
    const { search, status, sort = 'auditoriumNumber' } = req.query;
    const query = {};

    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }

    if (search) {
      query.$or = [
        { auditoriumName: { $regex: search, $options: 'i' } },
        { auditoriumNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const auditoriums = await Auditorium.find(query).sort(sort).lean();
    return successResponse(res, auditoriums, 'Auditoriums retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single auditorium by ID
 * GET /api/v1/admin/auditoriums/:id
 */
const getAuditoriumById = async (req, res, next) => {
  try {
    const auditorium = await Auditorium.findById(req.params.id);
    if (!auditorium) {
      return errorResponse(res, 'Auditorium not found', 404);
    }
    return successResponse(res, auditorium, 'Auditorium retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new auditorium
 * POST /api/v1/admin/auditoriums
 */
const createAuditorium = async (req, res, next) => {
  try {
    const { auditoriumName, auditoriumNumber, capacity, status = 'ACTIVE' } = req.body;

    const formattedNumber = auditoriumNumber.trim().toUpperCase();
    const existing = await Auditorium.findOne({ auditoriumNumber: formattedNumber });
    if (existing) {
      return errorResponse(res, `Auditorium with number '${formattedNumber}' already exists.`, 409);
    }

    const auditorium = await Auditorium.create({
      auditoriumName: auditoriumName.trim(),
      auditoriumNumber: formattedNumber,
      capacity: Number(capacity),
      status: status.toUpperCase()
    });

    return successResponse(res, auditorium, 'Auditorium created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update auditorium
 * PUT /api/v1/admin/auditoriums/:id
 */
const updateAuditorium = async (req, res, next) => {
  try {
    const { auditoriumName, auditoriumNumber, capacity, status } = req.body;
    const auditorium = await Auditorium.findById(req.params.id);

    if (!auditorium) {
      return errorResponse(res, 'Auditorium not found', 404);
    }

    if (auditoriumNumber) {
      const formattedNumber = auditoriumNumber.trim().toUpperCase();
      const duplicate = await Auditorium.findOne({
        _id: { $ne: req.params.id },
        auditoriumNumber: formattedNumber
      });
      if (duplicate) {
        return errorResponse(res, `Auditorium with number '${formattedNumber}' already exists.`, 409);
      }
      auditorium.auditoriumNumber = formattedNumber;
    }

    if (auditoriumName) auditorium.auditoriumName = auditoriumName.trim();
    if (capacity !== undefined) auditorium.capacity = Number(capacity);
    if (status) auditorium.status = status.toUpperCase();

    await auditorium.save();

    return successResponse(res, auditorium, 'Auditorium updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete auditorium
 * DELETE /api/v1/admin/auditoriums/:id
 */
const deleteAuditorium = async (req, res, next) => {
  try {
    const auditorium = await Auditorium.findById(req.params.id);
    if (!auditorium) {
      return errorResponse(res, 'Auditorium not found', 404);
    }

    const timetableCount = await TimetableEntry.countDocuments({ roomId: req.params.id });
    if (timetableCount > 0) {
      return errorResponse(
        res,
        `Cannot delete auditorium '${auditorium.auditoriumName}' [${auditorium.auditoriumNumber}]. It is currently assigned in ${timetableCount} timetable session(s). Please reassign or delete these sessions first.`,
        400,
        null,
        {
          code: 'REFERENTIAL_INTEGRITY_VIOLATION',
          details: { timetableUsageCount: timetableCount },
          recommendation: 'Reassign or remove linked timetable sessions before deleting this auditorium.'
        }
      );
    }

    await auditorium.deleteOne();
    return successResponse(res, null, 'Auditorium deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditoriums,
  getAuditoriumById,
  createAuditorium,
  updateAuditorium,
  deleteAuditorium
};
