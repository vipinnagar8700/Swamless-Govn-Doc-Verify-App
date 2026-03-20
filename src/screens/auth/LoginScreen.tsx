import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';

export default function LoginScreen() {
    const [phone, setPhone] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [timer, setTimer] = useState(30);

    // OTP as array of 4 digits
    const [otp, setOtp] = useState(['', '', '', '']);
    const otpRefs = useRef([]);

    const isPhoneValid = phone.length === 10;
    const isOtpComplete = otp.every(d => d !== '');

    // Generate OTP based on date ddmm
    const generateOtp = () => {
        const date = new Date();
        return (
            String(date.getDate()).padStart(2, '0') +
            String(date.getMonth() + 1).padStart(2, '0')
        ).split(''); // returns array ['2','0','0','3']
    };

    const handleSendOtp = () => {
        if (!isPhoneValid) return;
        const generatedOtp = generateOtp();
        setOtp(['', '', '', '']); // clear input
        setIsOtpSent(true);
        setTimer(30);

        Alert.alert('OTP Sent', `Your OTP is: ${generatedOtp.join('')}`);
    };

    // Timer countdown
    useEffect(() => {
        let interval;
        if (isOtpSent && timer > 0) {
            interval = setInterval(() => setTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isOtpSent, timer]);

    const handleOtpChange = (index, value) => {
        if (/^\d?$/.test(value)) {
            const newOtp = [...otp];
            newOtp[index] = value;
            setOtp(newOtp);

            // Auto-focus next input
            if (value && index < 3) {
                otpRefs.current[index + 1].focus();
            }

            // Auto-focus previous input if deleting
            if (!value && index > 0) {
                otpRefs.current[index - 1].focus();
            }
        }
    };

    const handleVerifyOtp = () => {
        const enteredOtp = otp.join('');
        const correctOtp = generateOtp().join('');
        if (enteredOtp === correctOtp) {
            Alert.alert('Success', 'OTP Verified Successfully!');
            setIsOtpSent(false);
            setPhone('');
            setOtp(['', '', '', '']);
        } else {
            Alert.alert('Error', 'Invalid OTP');
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
                        <Text style={styles.title}>Welcome to Zorolegal 2.0</Text>
                        <Text style={styles.subtitle}>
                            Login or sign up to access government services made easy.
                        </Text>

                        {!isOtpSent && (
                            <>
                                <Text style={styles.label}>Phone Number</Text>
                                <View style={styles.inputBox}>
                                    <Text style={styles.code}>+91</Text>
                                    <TextInput
                                        placeholder="0000-000-000"
                                        keyboardType="number-pad"
                                        maxLength={10}
                                        value={phone}
                                        onChangeText={setPhone}
                                        style={styles.input}
                                        placeholderTextColor="#000"
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        { backgroundColor: isPhoneValid ? '#3B82F6' : '#9CA3AF' },
                                    ]}
                                    onPress={handleSendOtp}
                                    disabled={!isPhoneValid}
                                >
                                    <Text style={styles.buttonText}>Send OTP</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {isOtpSent && (
                            <>
                                <Text style={styles.label}>Enter OTP</Text>
                                <View style={styles.otpContainer}>
                                    {otp.map((digit, index) => (
                                        <React.Fragment key={index}>
                                            <TextInput
                                                ref={el => (otpRefs.current[index] = el)}
                                                style={styles.otpBox}
                                                keyboardType="number-pad"
                                                maxLength={1}
                                                value={digit}
                                                onChangeText={value => handleOtpChange(index, value)}
                                            />
                                            {index < 3 && <Text style={styles.dash}>-</Text>}
                                        </React.Fragment>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        { backgroundColor: isOtpComplete ? '#3B82F6' : '#9CA3AF' },
                                    ]}
                                    onPress={handleVerifyOtp}
                                    disabled={!isOtpComplete}
                                >
                                    <Text style={styles.buttonText}>Verify OTP</Text>
                                </TouchableOpacity>

                                {timer > 0 ? (
                                    <Text style={styles.timer}>Resend OTP in {timer}s</Text>
                                ) : (
                                    <TouchableOpacity onPress={handleResendOtp}>
                                        <Text style={[styles.link, { textAlign: 'center', marginTop: 10 }]}>
                                            Resend OTP
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}

                        <Text style={styles.terms}>
                            By continuing, you agree to Zorolegal 2.0's{" "}
                            <Text style={styles.link}>Terms of Service</Text> and{" "}
                            <Text style={styles.link}>Privacy Policy</Text>.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 1 },
    logo: { fontSize: 40, textAlign: 'center' },
    brand: { textAlign: 'center', color: '#3B82F6', fontFamily: 'Poppins-SemiBold', marginBottom: 10 },
    title: { fontSize: 22, textAlign: 'center', fontFamily: 'Poppins-Bold' },
    subtitle: { textAlign: 'center', color: '#6B7280', marginVertical: 10, fontFamily: 'Poppins-Regular' },
    label: { marginTop: 20, fontFamily: 'Poppins-SemiBold' },
    inputBox: { flexDirection: 'row', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, marginTop: 8, alignItems: 'center', paddingHorizontal: 12, height: 50, backgroundColor: '#fff' },
    code: { marginRight: 8, fontFamily: 'Poppins-SemiBold', fontSize: 16, color: '#000' },
    input: { flex: 1, fontFamily: 'Poppins-Regular', fontSize: 16, color: '#000', height: '100%', paddingVertical: 0 },
    button: { backgroundColor: '#3B82F6', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    buttonText: { color: '#fff', fontFamily: 'Poppins-SemiBold' },
    terms: { marginTop: 15, textAlign: 'center', fontSize: 12, color: '#6B7280' },
    link: { color: '#3B82F6' },
    otpContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 15, alignItems: 'center' },
    otpBox: { width: 50, height: 50, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, textAlign: 'center', fontSize: 18, marginHorizontal: 5, color: '#000' },
    dash: { fontSize: 18, marginHorizontal: 5 },
    timer: { textAlign: 'center', marginTop: 10, color: '#6B7280', fontSize: 14 },
});