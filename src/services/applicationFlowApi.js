import API from './api';

export const startApplicationSessionApi = (payload) =>
    API.post('/user/applications/sessions', payload);

export const storeSessionMessagesApi = (sessionId, payload) =>
    API.post(`/user/applications/sessions/${sessionId}/messages`, payload);

export const updateApplicationFlowApi = (sessionId, payload) =>
    API.patch(`/user/applications/sessions/${sessionId}/flow`, payload);

export const getApplicationSessionApi = (sessionId) =>
    API.get(`/user/applications/sessions/${sessionId}`);

export const submitApplicationApi = (sessionId, payload) =>
    API.post(`/user/applications/sessions/${sessionId}/submit`, payload);

export const createRazorpayOrderApi = (sessionId, payload) =>
    API.post(`/user/applications/sessions/${sessionId}/payments/razorpay/order`, payload);

export const verifyRazorpayPaymentApi = (sessionId, payload) =>
    API.post(`/user/applications/sessions/${sessionId}/payments/razorpay/verify`, payload);

export const getRecentApplicationChatsApi = (params) =>
    API.get('/user/applications/recent-chats', { params });

export const getMyApplicationsApi = () =>
    API.get('/user/applications');

export const getApplicationStatusApi = (applicationId) =>
    API.get(`/user/applications/${applicationId}/status`);

export const resolveApplicationRequestApi = (sessionId, requestId, payload) =>
    API.patch(`/user/applications/sessions/${sessionId}/requests/${requestId}/resolve`, payload || {});
