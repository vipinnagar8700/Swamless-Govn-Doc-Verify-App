import { Alert, DeviceEventEmitter, PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { registerNotificationTokenApi, unregisterNotificationTokenApi } from './notificationApi';
import { openNotificationDestination } from '../navigation/navigationService';

const STORAGE_KEY = 'mobileFcmToken';

const requestNotificationPermission = async () => {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
        const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
            return false;
        }
    }

    const status = await messaging().requestPermission().catch(() => null);
    if (Platform.OS === 'ios') {
        return status === messaging.AuthorizationStatus.AUTHORIZED
            || status === messaging.AuthorizationStatus.PROVISIONAL;
    }

    return true;
};

const syncTokenToBackend = async () => {
    const allowed = await requestNotificationPermission();
    if (!allowed) return '';

    await messaging().registerDeviceForRemoteMessages().catch(() => null);
    const token = await messaging().getToken().catch(() => '');
    console.log(token, 'FCMTOKEN');
    if (token) {
        await AsyncStorage.setItem(STORAGE_KEY, token).catch(() => null);
        await registerNotificationTokenApi({ token, platform: Platform.OS, deviceType: 'mobile-app' }).catch(() => null);
    }
    return token;
};

export const initializePushNotifications = async () => {
    await syncTokenToBackend();

    const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
        const title = remoteMessage?.notification?.title || 'Seamless';
        const body = remoteMessage?.notification?.body || 'You have a new update.';
        DeviceEventEmitter.emit('notifications:changed');
        Alert.alert(title, body, [
            { text: 'Later', style: 'cancel' },
            { text: 'View', onPress: () => openNotificationDestination(remoteMessage) },
        ]);
    });

    const unsubscribeOpen = messaging().onNotificationOpenedApp((remoteMessage) => {
        DeviceEventEmitter.emit('notifications:changed');
        openNotificationDestination(remoteMessage);
    });

    const initialNotification = await messaging().getInitialNotification().catch(() => null);
    if (initialNotification) {
        DeviceEventEmitter.emit('notifications:changed');
        openNotificationDestination(initialNotification);
    }

    const unsubscribeRefresh = messaging().onTokenRefresh(async (nextToken) => {
        await AsyncStorage.setItem(STORAGE_KEY, nextToken).catch(() => null);
        await registerNotificationTokenApi({ token: nextToken, platform: Platform.OS, deviceType: 'mobile-app' }).catch(() => null);
    });

    return () => {
        unsubscribeForeground();
        unsubscribeOpen();
        unsubscribeRefresh();
    };
};

export const unregisterPushNotifications = async () => {
    const token = await AsyncStorage.getItem(STORAGE_KEY).catch(() => '') || await messaging().getToken().catch(() => '');
    if (token) {
        await unregisterNotificationTokenApi(token).catch(() => null);
    }
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => null);
};