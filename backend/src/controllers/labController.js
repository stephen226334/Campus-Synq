const mongoose = require('mongoose');
const Lab = require('../models/Lab');
const TimetableEntry = require('../models/TimetableEntry');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all labs with search & filter
 * GET /api/v1/admin/labs
 */
const getLabs = async (req, res, next) => {
  try {
    const { search, status, sort = 'labNumber' } = req.query;
    const query = {};

    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }

    if (search) {
      query.$or = [
        { labName: { $regex: search, $options: 'i' } },
        { labNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const labs = await Lab.find(query).sort(sort).lean();
    return successResponse(res, labs, 'Labs retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single lab by ID
 * GET /api/v1/admin/labs/:id
 */
const getLabById = async (req, res, next) => {
  try {
    const lab = await Lab.findById(req.params.id);
    if (!lab) {
      return errorResponse(res, 'Lab not found', 404);
    }
    return successResponse(res, lab, 'Lab retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new lab
 * POST /api/v1/admin/labs
 */
const createLab = async (req, res, next) => {
  try {
    const { labName, labNumber, capacity, status = 'ACTIVE' } = req.body;

    const formattedNumber = labNumber.trim().toUpperCase();
    const existing = await Lab.findOne({ labNumber: formattedNumber });
    if (existing) {
      return errorResponse(res, `Lab with number '${formattedNumber}' already exists.`, 409);
    }

    const lab = await Lab.create({
      labName: labName.trim(),
      labNumber: formattedNumber,
      capacity: Number(capacity),
      status: status.toUpperCase()
    });

    return successResponse(res, lab, 'Lab created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update lab
 * PUT /api/v1/admin/labs/:id
 */
const updateLab = async (req, res, next) => {
  try {
    const { labName, labNumber, capacity, status } = req.body;
    const lab = await Lab.findById(req.params.id);

    if (!lab) {
      return errorResponse(res, 'Lab not found', 404);
    }

    if (labNumber) {
      const formattedNumber = labNumber.trim().toUpperCase();
      const duplicate = await Lab.findOne({
        _id: { $ne: req.params.id },
        labNumber: formattedNumber
      });
      if (duplicate) {
        return errorResponse(res, `Lab with number '${formattedNumber}' already exists.`, 409);
      }
      lab.labNumber = formattedNumber;
    }

    if (labName) lab.labName = labName.trim();
    if (capacity !== undefined) lab.capacity = Number(capacity);
    if (status) lab.status = status.toUpperCase();

    await lab.save();

    return successResponse(res, lab, 'Lab updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete lab
 * DELETE /api/v1/admin/labs/:id
 */
const deleteLab = async (req, res, next) => {
  try {
    const lab = await Lab.findById(req.params.id);
    if (!lab) {
      return errorResponse(res, 'Lab not found', 404);
    }

    const timetableCount = await TimetableEntry.countDocuments({ roomId: req.params.id });
    if (timetableCount > 0) {
      return errorResponse(
        res,
        `Cannot delete laboratory '${lab.labName}' [${lab.labNumber}]. It is currently assigned in ${timetableCount} timetable session(s). Please reassign or delete these sessions first.`,
        400,
        null,
        {
          code: 'REFERENTIAL_INTEGRITY_VIOLATION',
          details: { timetableUsageCount: timetableCount },
          recommendation: 'Reassign or remove linked timetable sessions before deleting this laboratory.'
        }
      );
    }

    await lab.deleteOne();
    return successResponse(res, null, 'Lab deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete labs with referential integrity guard
 * DELETE /api/v1/admin/labs/bulk
 */
const bulkDeleteLabs = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 'Please provide an array of lab IDs to delete.', 400);
    }

    const invalidIds = ids.filter((id) => !id || !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return errorResponse(res, 'One or more lab IDs are invalid.', 400);
    }

    const uniqueIds = Array.from(new Set(ids.map((id) => id.toString())));
    const labs = await Lab.find({ _id: { $in: uniqueIds } });
    if (labs.length === 0) {
      return errorResponse(res, 'None of the specified labs were found.', 404);
    }

    // Check usage in TimetableEntry
    const referencedRoomIds = await TimetableEntry.find({ roomId: { $in: uniqueIds } }).distinct('roomId');
    const referencedSet = new Set(referencedRoomIds.map((id) => id.toString()));

    const blockedItems = labs.filter((l) => referencedSet.has(l._id.toString()));
    const safeToDelete = labs.filter((l) => !referencedSet.has(l._id.toString()));

    if (safeToDelete.length === 0) {
      return errorResponse(
        res,
        `Cannot delete any of the selected laboratory(ies). All ${blockedItems.length} selected lab(s) are currently assigned to active timetable sessions.`,
        400,
        null,
        {
          code: 'REFERENTIAL_INTEGRITY_VIOLATION',
          details: { blockedLabs: blockedItems.map((l) => `${l.labName} [${l.labNumber}]`) },
          recommendation: 'Reassign or remove linked timetable sessions before deleting these laboratories.'
        }
      );
    }

    const safeIds = safeToDelete.map((l) => l._id);
    const deleteResult = await Lab.deleteMany({ _id: { $in: safeIds } });

    const isPartial = blockedItems.length > 0;
    const message = isPartial
      ? `${deleteResult.deletedCount} lab(s) deleted successfully. ${blockedItems.length} lab(s) could not be deleted because they are assigned to timetable sessions.`
      : `${deleteResult.deletedCount} lab(s) deleted successfully.`;

    return successResponse(
      res,
      {
        deletedCount: deleteResult.deletedCount,
        deletedIds: safeIds.map((id) => id.toString()),
        blockedCount: blockedItems.length,
        blockedItems: blockedItems.map((l) => ({ id: l._id, labName: l.labName, labNumber: l.labNumber })),
        isPartial
      },
      message
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLabs,
  getLabById,
  createLab,
  updateLab,
  deleteLab,
  bulkDeleteLabs
};
