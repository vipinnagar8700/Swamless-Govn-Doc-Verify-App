import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OnboardingScreen from '../onboarding/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import BottomNavigator from './BottomNavigator';
import DocumentVerifyScreen from '../screens/document-verify/documentVerifyScreen';
import personalDetailsScreen from '../screens/document-verify/personalDetailsScreen';
import paymentDetailsScreen from '../screens/document-verify/paymentDetailsScreen';
import TermConditionScreen from '../screens/content-page/TermConditionScreen';
import PrivacyPolicyScreen from '../screens/content-page/PrivacyPolicyScreen';
import AiAssistScreen from '../screens/home/assistScreen';
import { AuthContext } from '../context/AuthContext';
import AppLoader from '../helper/AppLoader';
import DocWalletScreen from '../screens/wallet/docWalletScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const { token, loading, isReady } = useContext(AuthContext);
    console.log("token1w", token);
    // console.log("loading", loading);
    if (!isReady) return <AppLoader />;
    return (
        <Stack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName={token ? "MainApp" : "Onboarding"} // ✅ key fix
        >
            {token ? (
                <>
                    <Stack.Screen name="MainApp" component={BottomNavigator} />
                    <Stack.Screen name="DocumentVerifyScreen" component={DocumentVerifyScreen} />
                    <Stack.Screen name="PersonalDetailsScreen" component={personalDetailsScreen} />
                    <Stack.Screen name="PaymentDetailsScreen" component={paymentDetailsScreen} />
                    <Stack.Screen name="AiAssistScreen" component={AiAssistScreen} />
                    <Stack.Screen name="TermConditionScreen" component={TermConditionScreen} />
                    <Stack.Screen name="PrivacyPolicyScreen" component={PrivacyPolicyScreen} />
                    <Stack.Screen name="DocWalletScreen" component={DocWalletScreen} />
                </>
            ) : (
                <>
                    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                    <Stack.Screen name="Login" component={LoginScreen} />
                </>
            )}
        </Stack.Navigator>
    );
}