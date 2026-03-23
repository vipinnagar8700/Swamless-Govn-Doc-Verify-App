import React from 'react';
import { Image, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native'; // ✅ import useNavigation

import HomeScreen from '../screens/home/homeScreen';
import assistScreen from '../screens/home/assistScreen';
import profileScreen from '../screens/home/profileScreen';
import statusScreen from '../screens/home/statusScreen';

const Tab = createBottomTabNavigator();

export default function BottomNavigator() {
    const navigation = useNavigation(); // ✅ get navigation object

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
                            onPress={() => navigation.navigate('AiAssistScreen')} // ✅ navigate to stack screen
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