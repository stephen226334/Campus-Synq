const Lab = require('../models/Lab');
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

    await lab.deleteOne();
    return successResponse(res, null, 'Lab deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLabs,
  getLabById,
  createLab,
  updateLab,
  deleteLab
};
