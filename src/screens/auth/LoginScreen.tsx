import React, { useState, useRef, useEffect, useContext } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';

export default function LoginScreen({ navigation }: { navigation: any }) {
    const { sendOtp, verifyOtp, loading } = useContext(AuthContext);

    const [phone, setPhone] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [timer, setTimer] = useState(30);

    const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6 digit
    const [apiOtp, setApiOtp] = useState('');

    const otpRefs = useRef<any[]>([]);

    const isPhoneValid = phone.length === 10;
    const isOtpComplete = otp.every(d => d !== '');

    // ⏱ Timer
    useEffect(() => {
        let interval: any;
        if (isOtpSent && timer > 0) {
            interval = setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isOtpSent, timer]);

    // 📲 Send OTP
    const handleSendOtp = async () => {
        if (!isPhoneValid) {
            return Alert.alert("Error", "Enter valid 10 digit phone");
        }

        try {
            const res = await sendOtp(phone);

            setIsOtpSent(true);
            setTimer(30);

            // 🔥 Show OTP (Testing only)
            if (res?.otp) {
                setApiOtp(res.otp);
            }

        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to send OTP");
        }
    };

    // 🔢 OTP Change
    const handleOtpChange = (index: number, value: string) => {
        if (/^\d?$/.test(value)) {
            const newOtp = [...otp];
            newOtp[index] = value;
            setOtp(newOtp);

            if (value && index < 5) {
                otpRefs.current[index + 1]?.focus();
            }

            if (!value && index > 0) {
                otpRefs.current[index - 1]?.focus();
            }
        }
    };

    // 🔐 Verify OTP
    const handleVerifyOtp = async () => {
        const enteredOtp = otp.join('');

        if (enteredOtp.length !== 6) {
            return Alert.alert("Error", "Enter 6 digit OTP");
        }

        try {
            const res = await verifyOtp(phone, enteredOtp);

            Alert.alert("Success", res.message);

            if (res.status === "success") {
                navigation.replace("MainApp");
            }

        } catch (err: any) {
            Alert.alert("Error", err.message || "Invalid OTP");
        }
    };

    const handleResendOtp = () => {
        handleSendOtp();
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.card}>
                        <Text style={styles.logo}>⚖️</Text>
                        <Text style={styles.brand}>Zorolegal 2.0</Text>
                        <Text style={styles.title}>Welcome to Zerolegal 2.0</Text>
                        <Text style={styles.subtitle}>
                            Login or Signup to access government services made easy.
                        </Text>

                        {/* 📞 PHONE INPUT */}
                        {!isOtpSent && (
                            <>
                                <Text style={styles.label}>Phone Number</Text>

                                <View style={styles.inputBox}>
                                    <Text style={styles.code}>+91</Text>
                                    <TextInput
                                        placeholder="Enter phone"
                                        keyboardType="number-pad"
                                        maxLength={10}
                                        value={phone}
                                        onChangeText={setPhone}
                                        style={styles.input}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        { backgroundColor: isPhoneValid ? '#3B82F6' : '#9CA3AF' },
                                    ]}
                                    onPress={handleSendOtp}
                                    disabled={!isPhoneValid || loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.buttonText}>Send OTP</Text>
                                    )}
                                </TouchableOpacity>

                                <Text style={styles.subtitle}>
                                    By continuing, you agree to our Terms of Service and Privacy Policy.
                                </Text>
                            </>
                        )}

                        {/* 🔐 OTP INPUT */}
                        {isOtpSent && (
                            <>
                                <Text style={styles.label}>Enter OTP</Text>

                                <View style={styles.otpContainer}>
                                    {otp.map((digit, index) => (
                                        <TextInput
                                            key={index}
                                            ref={el => (otpRefs.current[index] = el)}
                                            style={styles.otpBox}
                                            keyboardType="number-pad"
                                            maxLength={1}
                                            value={digit}
                                            onChangeText={value => handleOtpChange(index, value)}
                                        />
                                    ))}
                                </View>

                                {/* 🔥 SHOW OTP (TEST ONLY) */}
                                {apiOtp ? (
                                    <Text style={{ textAlign: 'center', marginTop: 10, color: 'green' }}>
                                        Test OTP: {apiOtp}
                                    </Text>
                                ) : null}

                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        { backgroundColor: isOtpComplete ? '#3B82F6' : '#9CA3AF' },
                                    ]}
                                    onPress={handleVerifyOtp}
                                    disabled={!isOtpComplete || loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.buttonText}>Verify OTP</Text>
                                    )}
                                </TouchableOpacity>

                                {/* ⏱ TIMER */}
                                {timer > 0 ? (
                                    <Text style={styles.timer}>
                                        Resend OTP in {timer}s
                                    </Text>
                                ) : (
                                    <TouchableOpacity onPress={handleResendOtp}>
                                        <Text style={styles.link}>
                                            Resend OTP
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    card: {
        padding: 20,
        borderRadius: 10,

        // Border
        borderWidth: 1,
        borderColor: '#e5e7eb',

        // Android Shadow
        elevation: 0.5,

        // iOS Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,

        // Background (important)
        backgroundColor: '#fff',
    },
    logo: { fontSize: 40, textAlign: 'center' },
    brand: { textAlign: 'center', color: '#3B82F6', marginBottom: 10, fontFamily: "Poppins-Regular" },
    title: { fontSize: 22, textAlign: 'center', fontFamily: "Poppins-SemiBold" },
    subtitle: { textAlign: 'center', color: '#6B7280', marginVertical: 10, fontFamily: "Poppins-Regular" },

    label: { marginTop: 20, fontFamily: "Poppins-Regular" },
    inputBox: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        marginTop: 8,
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 50,
    },
    code: { marginRight: 8, fontFamily: "Poppins-Regular" },
    input: { flex: 1, fontFamily: "Poppins-Regular" },

    button: {
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    buttonText: { color: '#fff', fontFamily: "Poppins-Regular" },

    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 15,
    },
    otpBox: {
        width: 45,
        height: 50,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 18,
        marginHorizontal: 2,
    },

    timer: {
        textAlign: 'center',
        marginTop: 10,
        color: '#6B7280',
        fontFamily: "Poppins-Regular",
    },
    link: {
        textAlign: 'center',
        marginTop: 10,
        color: '#3B82F6',
        fontFamily: "Poppins-Regular",
    },
});