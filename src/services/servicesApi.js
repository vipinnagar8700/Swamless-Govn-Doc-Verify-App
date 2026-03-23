import API from "./api";

// ✅ Get all services (with search + pagination)
export const getServicesApi = (params) => {
    return API.get(`/admin/services/public`, {
        params, // { page, limit, search }
    });
};