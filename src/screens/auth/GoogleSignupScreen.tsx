import React, { useEffect, useContext, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    ActivityIndicator,
    Image,
    StatusBar,
} from 'react-native';

import {
    GoogleSignin,
    User as GoogleUser,
} from '@react-native-google-signin/google-signin';

import { AuthContext } from '../../context/AuthContext';

interface Props {
    navigation: any;
}

const GoogleSignupScreen: React.FC<Props> = ({ navigation }) => {
    const { login } = useContext(AuthContext);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: '241652440277-0kv0a6ml0lm37ip4emh32dputct5l179.apps.googleusercontent.com', // 🔥 replace
        });
    }, []);

    const handleGoogleSignup = async () => {
        try {
            // setLoading(true);

            // await GoogleSignin.hasPlayServices();
            // const userInfo: GoogleUser = await GoogleSignin.signIn();

            // // ✅ Validation
            // if (!userInfo?.user?.email) {
            //     Alert.alert('Error', 'Unable to fetch user data');
            //     return;
            // }

            // const userData = {
            //     name: userInfo.user.name || 'No Name',
            //     email: userInfo.user.email,
            //     photo: userInfo.user.photo || '',
            // };

            // // ✅ Save in Context
            // login(userData);

            Alert.alert('Success', `Welcome User`);

            navigation.replace('GymWorkScreen');

        } catch (error: any) {
            console.log(error);

            if (error.code === 'SIGN_IN_CANCELLED') {
                Alert.alert('Cancelled', 'User cancelled login');
            } else {
                Alert.alert('Error', 'Google Sign-In failed');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content"
                backgroundColor="#ffffff" />
            <View style={styles.inner}>
                <Image source={require('../../assets/image/back-icon.png')} style={{ width: 28, height: 28 }} />
                <Text style={styles.header}>Sign Up</Text>

                <View style={styles.center}>
                    <Text style={styles.title}>
                        Welcome! Manage, Track and Grow your Gym with WellVantage.
                    </Text>

                    <TouchableOpacity
                        style={styles.googleButton}
                        onPress={handleGoogleSignup}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator />
                        ) : (
                            <View style={styles.row}>
                                <Image source={require('../../assets/image/google-icon.png')} style={{ width: 30, height: 30 }} />
                                {/* <Icon name="google" size={18} color="#DB4437" /> */}
                                <Text style={styles.googleText}>
                                    Continue with Google
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default GoogleSignupScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 20,
    },
    inner: {
        flex: 1, marginTop: 40
    },
    header: {
        fontSize: 25,
        textAlign: 'center',
        marginTop: 10,
        fontWeight: '600', color: "#333333", fontFamily: "Poppins-SemiBold", lineHeight: 35, letterSpacing: 0
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center', marginBottom: 250
    },
    title: {
        textAlign: 'center',
        fontSize: 25,
        fontWeight: '600',
        marginBottom: 30,
        color: '#333',
        fontFamily: "Poppins-SemiBold", lineHeight: 35, letterSpacing: 0
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#D9D9D9',
        borderRadius: 8,
        height: 50,
        width: '100%',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    googleText: {
        marginLeft: 10,
        fontSize: 15,
        color: '#333333',
        fontFamily: "Poppins-Medium", fontWeight: "500", lineHeight: 24, letterSpacing: 0
    },
});