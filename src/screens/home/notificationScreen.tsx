import React, { useCallback, useState } from 'react';
import {
    DeviceEventEmitter,
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { getMyNotificationsApi, readNotificationApi } from '../../services/notificationApi';
import { getApplicationStatusApi } from '../../services/applicationFlowApi';

const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
};

const NotificationScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const buildRequestTarget = (application, preferredType) => {
        const pendingRequests = Array.isArray(application?.adminRequests)
            ? application.adminRequests.filter((r) => r?.status === 'pending')
            : [];

        if (!pendingRequests.length) return null;

        const matched = pendingRequests.find((r) => r?.requestType === preferredType) || pendingRequests[0];
        if (!matched) return null;

        return {
            requestId: matched?._id,
            requestType: matched?.requestType,
            title: matched?.title,
            message: matched?.message,
            requiredDocs: matched?.requiredDocs || [],
            requiredFields: matched?.requiredFields || [],
        };
    };

    const fetchNotifications = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const res = await getMyNotificationsApi({ limit: 50 });
            setNotifications(Array.isArray(res?.data?.notifications) ? res.data.notifications : []);
        } catch (err) {
            console.log('[NotificationScreen] fetch failed:', err);
            setNotifications([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchNotifications();

            const subscription = DeviceEventEmitter.addListener('notifications:changed', () => {
                fetchNotifications(true);
            });

            return () => subscription.remove();
        }, [])
    );

    useFocusEffect(
        useCallback(() => {
            const payload = route?.params?.notificationPayload;
            if (!payload?.applicationId) return;

            setNotifications((prev) => prev.map((item) => (
                item?.data?.applicationId === payload.applicationId && !item?.readAt
                    ? { ...item, readAt: new Date().toISOString() }
                    : item
            )));
        }, [route?.params])
    );

    const openRelatedApplication = async (item) => {
        if (!item?.readAt && item?._id) {
            setNotifications((prev) => prev.map((entry) => entry._id === item._id ? { ...entry, readAt: new Date().toISOString() } : entry));
            await readNotificationApi(item._id).catch(() => null);
            DeviceEventEmitter.emit('notifications:changed');
        }

        if (!item?.data?.applicationId) {
            return;
        }

        if (item?.data?.type === 'application_action_required') {
            let requestTarget = null;

            try {
                const statusRes = await getApplicationStatusApi(item?.data?.applicationId);
                requestTarget = buildRequestTarget(statusRes?.data?.application, item?.data?.requestType);
            } catch (err) {
                console.log('[NotificationScreen] action-required status fetch failed:', err);
            }

            navigation.navigate('AiAssistScreen', {
                item: {
                    title: item?.data?.serviceName || 'Government Service',
                    category: item?.data?.serviceName || '',
                    subServiceTitle: item?.data?.subServiceTitle || '',
                    openFrom: 'status',
                    sessionId: item?.data?.applicationId,
                    requestTarget: requestTarget || undefined,
                },
            });
            return;
        }

        navigation.navigate('Status', {
            targetApplicationId: item?.data?.applicationId,
            highlightFromNotification: true,
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Notifications</Text>
            <Text style={styles.subheader}>Application updates and admin requests will appear here.</Text>

            <FlatList
                data={notifications}
                keyExtractor={(item, index) => item?._id || String(index)}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchNotifications(true)}
                        colors={['#3B82F6']}
                        tintColor="#3B82F6"
                    />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyWrap}>
                            <Text style={styles.emptyTitle}>No notifications yet</Text>
                            <Text style={styles.emptyText}>You will see application updates here.</Text>
                        </View>
                    ) : null
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => openRelatedApplication(item)}
                        style={[styles.card, !item?.readAt && styles.cardUnread]}
                    >
                        <View style={styles.cardTop}>
                            <Text style={styles.title}>{item?.title || 'Notification'}</Text>
                            {!item?.readAt ? <View style={styles.dot} /> : null}
                        </View>
                        <Text style={styles.body}>{item?.body || ''}</Text>
                        {!!item?.data?.serviceName && (
                            <Text style={styles.meta}>
                                {item.data.serviceName}{item?.data?.subServiceTitle ? ` - ${item.data.subServiceTitle}` : ''}
                            </Text>
                        )}
                        <Text style={styles.date}>{formatDate(item?.createdAt)}</Text>
                        {!!item?.data?.applicationId && (
                            <View style={styles.linkBtn}>
                                <Text style={styles.linkBtnText}>
                                    {item?.data?.type === 'application_action_required'
                                        ? 'Open Chat To Upload / Fill Details'
                                        : 'Open Related Status'}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}
                contentContainerStyle={notifications.length ? styles.listContent : styles.listEmptyContent}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FA',
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    header: {
        fontSize: 22,
        fontFamily: 'Poppins-Bold',
        color: '#111827',marginTop: 30,
    },
    subheader: {
        marginTop: 6,
        marginBottom: 16,
        fontSize: 13,
        color: '#6B7280',
        fontFamily: 'Poppins-Regular',
    },
    listContent: {
        paddingBottom: 24,
    },
    listEmptyContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cardUnread: {
        borderColor: '#BFDBFE',
        backgroundColor: '#F8FBFF',
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    title: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
        fontFamily: 'Poppins-SemiBold',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 999,
        backgroundColor: '#2563EB',
    },
    body: {
        marginTop: 8,
        fontSize: 13,
        lineHeight: 20,
        color: '#4B5563',
        fontFamily: 'Poppins-Regular',
    },
    meta: {
        marginTop: 10,
        fontSize: 12,
        color: '#1D4ED8',
        fontFamily: 'Poppins-Medium',
    },
    date: {
        marginTop: 10,
        fontSize: 11,
        color: '#9CA3AF',
        fontFamily: 'Poppins-Regular',
    },
    linkBtn: {
        marginTop: 12,
        alignSelf: 'flex-start',
        backgroundColor: '#EEF4FF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
    },
    linkBtnText: {
        color: '#2563EB',
        fontSize: 12,
        fontFamily: 'Poppins-SemiBold',
    },
    emptyWrap: {
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 18,
        color: '#111827',
        fontFamily: 'Poppins-SemiBold',
    },
    emptyText: {
        marginTop: 8,
        color: '#6B7280',
        fontSize: 13,
        textAlign: 'center',
        fontFamily: 'Poppins-Regular',
    },
});

export default NotificationScreen;