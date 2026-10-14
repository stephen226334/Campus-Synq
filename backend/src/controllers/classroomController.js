const mongoose = require('mongoose');
const Classroom = require('../models/Classroom');
const TimetableEntry = require('../models/TimetableEntry');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all classrooms with search & filter
 * GET /api/v1/admin/classrooms
 */
const getClassrooms = async (req, res, next) => {
  try {
    const { search, status, sort = 'roomNumber' } = req.query;
    const query = {};

    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }

    if (search) {
      query.roomNumber = { $regex: search, $options: 'i' };
    }

    const classrooms = await Classroom.find(query).sort(sort).lean();
    return successResponse(res, classrooms, 'Classrooms retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single classroom by ID
 * GET /api/v1/admin/classrooms/:id
 */
const getClassroomById = async (req, res, next) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return errorResponse(res, 'Classroom not found', 404);
    }
    return successResponse(res, classroom, 'Classroom retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new classroom
 * POST /api/v1/admin/classrooms
 */
const createClassroom = async (req, res, next) => {
  try {
    const { roomNumber, capacity, status = 'ACTIVE' } = req.body;

    const formattedRoom = roomNumber.trim().toUpperCase();
    const existing = await Classroom.findOne({ roomNumber: formattedRoom });
    if (existing) {
      return errorResponse(res, `Classroom with room number '${formattedRoom}' already exists.`, 409);
    }

    const classroom = await Classroom.create({
      roomNumber: formattedRoom,
      capacity: Number(capacity),
      status: status.toUpperCase()
    });

    return successResponse(res, classroom, 'Classroom created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update classroom
 * PUT /api/v1/admin/classrooms/:id
 */
const updateClassroom = async (req, res, next) => {
  try {
    const { roomNumber, capacity, status } = req.body;
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return errorResponse(res, 'Classroom not found', 404);
    }

    if (roomNumber) {
      const formattedRoom = roomNumber.trim().toUpperCase();
      const duplicate = await Classroom.findOne({
        _id: { $ne: req.params.id },
        roomNumber: formattedRoom
      });
      if (duplicate) {
        return errorResponse(res, `Classroom with room number '${formattedRoom}' already exists.`, 409);
      }
      classroom.roomNumber = formattedRoom;
    }

    if (capacity !== undefined) classroom.capacity = Number(capacity);
    if (status) classroom.status = status.toUpperCase();

    await classroom.save();

    return successResponse(res, classroom, 'Classroom updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete classroom
 * DELETE /api/v1/admin/classrooms/:id
 */
const deleteClassroom = async (req, res, next) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return errorResponse(res, 'Classroom not found', 404);
    }

    const timetableCount = await TimetableEntry.countDocuments({ roomId: req.params.id });
    if (timetableCount > 0) {
      return errorResponse(
        res,
        `Cannot delete classroom '${classroom.roomNumber}'. It is currently assigned in ${timetableCount} timetable session(s). Please reassign or delete these sessions first.`,
        400,
        null,
        {
          code: 'REFERENTIAL_INTEGRITY_VIOLATION',
          details: { timetableUsageCount: timetableCount },
          recommendation: 'Reassign or remove linked timetable sessions before deleting this classroom.'
        }
      );
    }

    await classroom.deleteOne();
    return successResponse(res, null, 'Classroom deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete classrooms with referential integrity guard
 * DELETE /api/v1/admin/classrooms/bulk
 */
const bulkDeleteClassrooms = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 'Please provide an array of classroom IDs to delete.', 400);
    }

    const invalidIds = ids.filter((id) => !id || !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return errorResponse(res, 'One or more classroom IDs are invalid.', 400);
    }

    const uniqueIds = Array.from(new Set(ids.map((id) => id.toString())));
    const classrooms = await Classroom.find({ _id: { $in: uniqueIds } });
    if (classrooms.length === 0) {
      return errorResponse(res, 'None of the specified classrooms were found.', 404);
    }

    // Check usage in TimetableEntry
    const referencedRoomIds = await TimetableEntry.find({ roomId: { $in: uniqueIds } }).distinct('roomId');
    const referencedSet = new Set(referencedRoomIds.map((id) => id.toString()));

    const blockedItems = classrooms.filter((c) => referencedSet.has(c._id.toString()));
    const safeToDelete = classrooms.filter((c) => !referencedSet.has(c._id.toString()));

    if (safeToDelete.length === 0) {
      return errorResponse(
        res,
        `Cannot delete any of the selected classroom(s). All ${blockedItems.length} selected room(s) are currently assigned to active timetable sessions.`,
        400,
        null,
        {
          code: 'REFERENTIAL_INTEGRITY_VIOLATION',
          details: { blockedClassrooms: blockedItems.map((c) => c.roomNumber) },
          recommendation: 'Reassign or remove linked timetable sessions before deleting these classrooms.'
        }
      );
    }

    const safeIds = safeToDelete.map((c) => c._id);
    const deleteResult = await Classroom.deleteMany({ _id: { $in: safeIds } });

    const isPartial = blockedItems.length > 0;
    const message = isPartial
      ? `${deleteResult.deletedCount} classroom(s) deleted successfully. ${blockedItems.length} room(s) could not be deleted because they are assigned to timetable sessions.`
      : `${deleteResult.deletedCount} classroom(s) deleted successfully.`;

    return successResponse(
      res,
      {
        deletedCount: deleteResult.deletedCount,
        deletedIds: safeIds.map((id) => id.toString()),
        blockedCount: blockedItems.length,
        blockedItems: blockedItems.map((c) => ({ id: c._id, roomNumber: c.roomNumber })),
        isPartial
      },
      message
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClassrooms,
  getClassroomById,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  bulkDeleteClassrooms
};
