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

module.exports = {
  getClassrooms,
  getClassroomById,
  createClassroom,
  updateClassroom,
  deleteClassroom
};
