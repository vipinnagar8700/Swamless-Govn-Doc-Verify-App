import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Image,
} from 'react-native';
// import Icon from 'react-native-vector-icons/Ionicons';

const PrivacyPolicyScreen = ({ navigation }) => {
    return (
        <View style={styles.container}>

            {/* Header */}
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Image
                        source={require('../../assets/back.png')}
                        style={{ width: 22, height: 22 }}
                    />
                </TouchableOpacity>
                <Text style={styles.header}>Privacy Policy</Text>
            </View>

            {/* Content */}
            <ScrollView showsVerticalScrollIndicator={false}>

                <Text style={styles.sectionTitle}>1. Introduction</Text>
                <Text style={styles.text}>
                    At Zorolegal, we value your privacy and are committed to protecting
                    your personal information. This Privacy Policy explains how we
                    collect, use, and safeguard your data.
                </Text>

                <Text style={styles.sectionTitle}>2. Information We Collect</Text>
                <Text style={styles.text}>
                    We may collect personal details such as your name, phone number,
                    email address, Aadhaar details, and other information required to
                    process your applications.
                </Text>

                <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
                <Text style={styles.text}>
                    Your information is used to provide services, process documents,
                    communicate updates, and improve user experience.
                </Text>

                <Text style={styles.sectionTitle}>4. Data Security</Text>
                <Text style={styles.text}>
                    We implement appropriate security measures to protect your data
                    from unauthorized access, misuse, or disclosure.
                </Text>

                <Text style={styles.sectionTitle}>5. Sharing of Information</Text>
                <Text style={styles.text}>
                    We do not sell your personal data. Information may only be shared
                    with government authorities or trusted partners for service
                    processing.
                </Text>

                <Text style={styles.sectionTitle}>6. Cookies & Tracking</Text>
                <Text style={styles.text}>
                    Our app may use cookies or similar technologies to enhance user
                    experience and analyze usage patterns.
                </Text>

                <Text style={styles.sectionTitle}>7. Your Rights</Text>
                <Text style={styles.text}>
                    You have the right to access, update, or request deletion of your
                    personal data at any time.
                </Text>

                <Text style={styles.sectionTitle}>8. Changes to Policy</Text>
                <Text style={styles.text}>
                    We may update this Privacy Policy from time to time. Changes will
                    be reflected within the app.
                </Text>

                <View style={{ height: 20 }} />
            </ScrollView>

            {/* Button */}
            <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
                <Text style={styles.buttonText}>Accept & Continue</Text>
            </TouchableOpacity>

        </View>
    );
};

export default PrivacyPolicyScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F6FA',
        padding: 16,
    },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 50, marginTop: 40
    },

    header: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#222',
    },

    sectionTitle: {
        fontSize: 15,
        fontFamily: 'Poppins-Bold',
        marginTop: 12,
        marginBottom: 6,
        color: '#222',
    },

    text: {
        fontSize: 13,
        color: '#555',
        lineHeight: 20,
        fontFamily: 'Poppins-Regular',
    },

    button: {
        backgroundColor: '#3B6EDC',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },

    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
    },
});