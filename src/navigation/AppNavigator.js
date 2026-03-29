import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';


import GoogleSignupScreen from '../screens/auth/GoogleSignupScreen';
import GymWorkScreen from '../screens/home/GymWorkScreen';
import WorkoutManagementScreen from '../screens/workout/WorkoutManagementScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {/* Login Page  */}
            <Stack.Screen name="GoogleSignupScreen" component={GoogleSignupScreen} />
            <Stack.Screen name="GymWorkScreen" component={GymWorkScreen} />
            <Stack.Screen name="WorkoutManagementScreen" component={WorkoutManagementScreen} />
        </Stack.Navigator>
    );
}