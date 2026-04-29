import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Image, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native'; // ✅ import useNavigation
import Ionicons from 'react-native-vector-icons/Ionicons';

import HomeScreen from '../screens/home/homeScreen';
import assistScreen from '../screens/home/assistScreen';
import profileScreen from '../screens/home/profileScreen';
import statusScreen from '../screens/home/statusScreen';
import NotificationScreen from '../screens/home/notificationScreen';
import { getMyNotificationsApi } from '../services/notificationApi';

const Tab = createBottomTabNavigator();

export default function BottomNavigator() {
    const navigation = useNavigation(); // ✅ get navigation object
    const [unreadCount, setUnreadCount] = useState(0);

    const refreshUnreadCount = async () => {
        try {
            const res = await getMyNotificationsApi({ limit: 50 });
            const list = Array.isArray(res?.data?.notifications) ? res.data.notifications : [];
            setUnreadCount(list.filter((item) => !item?.readAt).length);
        } catch (err) {
            console.log('[BottomNavigator] unread notifications fetch failed:', err);
        }
    };

    useFocusEffect(
        useCallback(() => {
            refreshUnreadCount();
        }, [])
    );

    useEffect(() => {
        refreshUnreadCount();
        const sub = DeviceEventEmitter.addListener('notifications:changed', refreshUnreadCount);
        return () => sub.remove();
    }, []);

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    height: 60,
                    borderTopWidth: 1,
                    borderColor: '#cccccc61',
                },
                tabBarLabelStyle: {
                    fontFamily: 'Poppins-Medium',
                    fontSize: 11,
                },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <Image
                            source={require('../assets/home.png')}
                            style={{
                                width: 22,
                                height: 22,
                                tintColor: focused ? '#3B82F6' : '#999',
                            }}
                            resizeMode="contain"
                        />
                    ),
                }}
            />

            <Tab.Screen
                name="AI Assist"
                component={assistScreen} // keep this as default screen if needed
                options={{
                    tabBarIcon: ({ focused }) => (
                        <Image
                            source={require('../assets/comment.png')}
                            style={{
                                width: 22,
                                height: 22,
                                tintColor: focused ? '#3B82F6' : '#999',
                            }}
                            resizeMode="contain"
                        />
                    ),
                    tabBarButton: (props) => (
                        <TouchableOpacity
                            {...props}
                            onPress={() => navigation.navigate('AiAssistScreen', { item: { openFrom: 'home' } })} // ✅ open fresh chat
                        />
                    ),
                }}
            />

            <Tab.Screen
                name="Status"
                component={statusScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <Image
                            source={require('../assets/document.png')}
                            style={{
                                width: 22,
                                height: 22,
                                tintColor: focused ? '#3B82F6' : '#999',
                            }}
                            resizeMode="contain"
                        />
                    ),
                }}
            />

            <Tab.Screen
                name="Notifications"
                component={NotificationScreen}
                options={{
                    tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
                    tabBarIcon: ({ focused }) => (
                       <Image
                            source={require('../assets/bell.png')}
                            style={{
                                width: 22,
                                height: 22,
                                tintColor: focused ? '#3B82F6' : '#999',
                            }}
                            resizeMode="contain"
                        />
                    ),
                }}
            />

            <Tab.Screen
                name="Profile"
                component={profileScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <Image
                            source={require('../assets/people.png')}
                            style={{
                                width: 22,
                                height: 22,
                                tintColor: focused ? '#3B82F6' : '#999',
                            }}
                            resizeMode="contain"
                        />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}