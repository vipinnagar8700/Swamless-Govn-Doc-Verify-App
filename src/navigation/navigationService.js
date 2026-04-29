import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

let pendingNotificationOpen = null;

export const openNotificationDestination = (remoteMessage) => {
    const params = {
        screen: 'Notifications',
        params: {
            openFromPush: true,
            notificationPayload: remoteMessage?.data || {},
        },
    };

    if (navigationRef.isReady()) {
        navigationRef.navigate('MainApp', params);
        return;
    }

    pendingNotificationOpen = params;
};

export const flushPendingNotificationOpen = () => {
    if (!pendingNotificationOpen || !navigationRef.isReady()) {
        return;
    }

    navigationRef.navigate('MainApp', pendingNotificationOpen);
    pendingNotificationOpen = null;
};