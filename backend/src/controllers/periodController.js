const Period = require('../models/Period');
const TimetableEntry = require('../models/TimetableEntry');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all configured periods
 * GET /api/v1/admin/periods
 */
const getPeriods = async (req, res, next) => {
  try {
    const { status, sort = 'order' } = req.query;
    const query = {};

    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }

    const periods = await Period.find(query).sort(sort).lean({ virtuals: true });
    return successResponse(res, periods, 'Periods retrieved');
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

    // Determine default order if not provided
    let calculatedOrder = order;
    if (calculatedOrder === undefined || calculatedOrder === null) {
      const highest = await Period.findOne().sort({ order: -1 });
      calculatedOrder = highest ? highest.order + 1 : 1;
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

    if (startTime) period.startTime = startTime.trim();
    if (endTime) period.endTime = endTime.trim();
    if (order !== undefined) period.order = Number(order);
    if (status) period.status = status.toUpperCase();

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
        400
      );
    }

    await period.deleteOne();
    return successResponse(res, null, 'Period deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPeriods,
  getPeriodById,
  createPeriod,
  updatePeriod,
  deletePeriod
};
