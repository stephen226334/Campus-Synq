const mongoose = require('mongoose');
const Period = require('../models/Period');
const TimetableEntry = require('../models/TimetableEntry');
const { successResponse, errorResponse } = require('../utils/response');

const {
  parseTimeToMinutes,
  parsePeriodNumber,
  sortPeriodsChronologically
} = require('../utils/timetableSort');

/**
 * Chronological & academic period sorting:
 * Configured start time in minutes is primary sort key.
 */
const sortPeriodsAcademic = (periods) => {
  return sortPeriodsChronologically(periods);
};

/**
 * Get all configured periods in academic order
 * GET /api/v1/admin/periods
 */
const getPeriods = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};

    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }

    const periods = await Period.find(query).lean({ virtuals: true });
    const sorted = sortPeriodsAcademic(periods);

    return successResponse(res, sorted, 'Periods retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single period by ID
 * GET /api/v1/admin/periods/:id
 */
const getPeriodById = async (req, res, next) => {
  try {
    const period = await Period.findById(req.params.id);
    if (!period) {
      return errorResponse(res, 'Period not found', 404);
    }
    return successResponse(res, period, 'Period retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new period
 * POST /api/v1/admin/periods
 */
const createPeriod = async (req, res, next) => {
  try {
    const { periodNumber, startTime, endTime, order, status = 'ACTIVE' } = req.body;

    const formattedNumber = periodNumber.trim().toUpperCase();

    const existing = await Period.findOne({ periodNumber: formattedNumber });
    if (existing) {
      return errorResponse(res, `Period '${formattedNumber}' already exists.`, 409);
    }

    // Validate 12-hour time format & range
    const startM = parseTimeToMinutes(startTime);
    const endM = parseTimeToMinutes(endTime);
    if (startM >= endM) {
      return errorResponse(res, 'Period start time must be earlier than end time.', 400);
    }

    // Determine sequence order automatically if not specified
    let calculatedOrder = order;
    if (calculatedOrder === undefined || calculatedOrder === null) {
      const allPeriods = await Period.find();
      const maxOrder = allPeriods.reduce((max, p) => Math.max(max, p.order || 0), 0);
      calculatedOrder = maxOrder + 1;
    }

    const period = await Period.create({
      periodNumber: formattedNumber,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      order: Number(calculatedOrder),
      status: status.toUpperCase()
    });

    return successResponse(res, period, 'Period created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update period
 * PUT /api/v1/admin/periods/:id
 */
const updatePeriod = async (req, res, next) => {
  try {
    const { periodNumber, startTime, endTime, order, status } = req.body;
    const period = await Period.findById(req.params.id);

    if (!period) {
      return errorResponse(res, 'Period not found', 404);
    }

    if (periodNumber) {
      const formattedNumber = periodNumber.trim().toUpperCase();
      const duplicate = await Period.findOne({
        _id: { $ne: req.params.id },
        periodNumber: formattedNumber
      });
      if (duplicate) {
        return errorResponse(res, `Period '${formattedNumber}' already exists.`, 409);
      }
      period.periodNumber = formattedNumber;
    }

    const newStart = startTime ? startTime.trim() : period.startTime;
    const newEnd = endTime ? endTime.trim() : period.endTime;
    const startM = parseTimeToMinutes(newStart);
    const endM = parseTimeToMinutes(newEnd);

    if (startM >= endM) {
      return errorResponse(res, 'Period start time must be earlier than end time.', 400);
    }

    const newStatus = status ? status.toUpperCase() : period.status;

    if (startTime) period.startTime = newStart;
    if (endTime) period.endTime = newEnd;
    if (order !== undefined) period.order = Number(order);
    if (status) period.status = newStatus;

    await period.save();

    return successResponse(res, period, 'Period updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete period with referential integrity guard
 * DELETE /api/v1/admin/periods/:id
 */
const deletePeriod = async (req, res, next) => {
  try {
    const period = await Period.findById(req.params.id);
    if (!period) {
      return errorResponse(res, 'Period not found', 404);
    }

    const usageCount = await TimetableEntry.countDocuments({ period: req.params.id });
    if (usageCount > 0) {
      return errorResponse(
        res,
        `Cannot delete period '${period.periodNumber}'. It is currently used in ${usageCount} timetable schedule entry(ies). Please reassign or delete these sessions first.`,
        400,
        null,
        {
          code: 'REFERENTIAL_INTEGRITY_VIOLATION',
          details: { timetableUsageCount: usageCount },
          recommendation: 'Reassign or remove linked timetable sessions before deleting this period.'
        }
      );
    }

    await period.deleteOne();
    return successResponse(res, null, 'Period deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete periods with referential integrity guard
 * DELETE /api/v1/admin/periods/bulk
 */
const bulkDeletePeriods = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 'Please provide an array of period IDs to delete.', 400);
    }

    const invalidIds = ids.filter((id) => !id || !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return errorResponse(res, 'One or more period IDs are invalid.', 400);
    }

    const uniqueIds = Array.from(new Set(ids.map((id) => id.toString())));
    const periods = await Period.find({ _id: { $in: uniqueIds } });
    if (periods.length === 0) {
      return errorResponse(res, 'None of the specified periods were found.', 404);
    }

    // Check usage in TimetableEntry
    const referencedPeriodIds = await TimetableEntry.find({ period: { $in: uniqueIds } }).distinct('period');
    const referencedSet = new Set(referencedPeriodIds.map((id) => id.toString()));

    const blockedItems = periods.filter((p) => referencedSet.has(p._id.toString()));
    const safeToDelete = periods.filter((p) => !referencedSet.has(p._id.toString()));

    if (safeToDelete.length === 0) {
      return errorResponse(
        res,
        `Cannot delete any of the selected period(s). All ${blockedItems.length} selected period(s) are currently scheduled in active timetable entries.`,
        400,
        null,
        {
          code: 'REFERENTIAL_INTEGRITY_VIOLATION',
          details: {
            blockedPeriods: blockedItems.map((p) => p.periodNumber)
          },
          recommendation: 'Reassign or remove timetable sessions using these periods before deleting.'
        }
      );
    }

    const safeIds = safeToDelete.map((p) => p._id);
    const deleteResult = await Period.deleteMany({ _id: { $in: safeIds } });

    const isPartial = blockedItems.length > 0;
    const message = isPartial
      ? `${deleteResult.deletedCount} period(s) deleted successfully. ${blockedItems.length} period(s) could not be deleted because they are assigned to timetable sessions.`
      : `${deleteResult.deletedCount} period(s) deleted successfully.`;

    return successResponse(
      res,
      {
        deletedCount: deleteResult.deletedCount,
        deletedIds: safeIds.map((id) => id.toString()),
        blockedCount: blockedItems.length,
        blockedItems: blockedItems.map((p) => ({ id: p._id, periodNumber: p.periodNumber })),
        isPartial
      },
      message
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPeriods,
  getPeriodById,
  createPeriod,
  updatePeriod,
  deletePeriod,
  bulkDeletePeriods
};
