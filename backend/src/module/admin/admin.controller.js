import adminService from './admin.service.js';
import ApiResponse from '../../common/utils/api-response.js';

const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();

    return ApiResponse.ok(res, 'Dashboard statistics retrieved successfully', {
      stats,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getDashboardStats,
};
