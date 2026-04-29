import API from './api';

export const registerNotificationTokenApi = (payload) =>
    API.post('/user/notifications/device-token', payload);

export const unregisterNotificationTokenApi = (token) =>
    API.delete('/user/notifications/device-token', { data: { token } });

export const getMyNotificationsApi = (params) =>
    API.get('/user/notifications', { params });

export const readNotificationApi = (notificationId) =>
    API.patch(`/user/notifications/${notificationId}/read`);