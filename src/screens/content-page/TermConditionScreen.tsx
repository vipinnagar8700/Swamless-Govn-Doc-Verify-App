import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Image,
} from 'react-native';

const TermConditionScreen = ({ navigation }) => {
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
                <Text style={styles.header}>Terms & Conditions</Text>
            </View>

            {/* Content */}
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>1. Introduction</Text>
                <Text style={styles.text}>
                    Welcome to Zorolegal. By accessing or using our services, you agree
                    to be bound by these terms and conditions.
                </Text>

                <Text style={styles.sectionTitle}>2. Services</Text>
                <Text style={styles.text}>
                    We provide legal and documentation services such as Passport,
                    Aadhaar updates, PAN services, and more. All services are subject
                    to verification and approval by respective authorities.
                </Text>

                <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
                <Text style={styles.text}>
                    You agree to provide accurate and complete information. Any
                    incorrect or misleading details may result in rejection of your
                    application.
                </Text>

                <Text style={styles.sectionTitle}>4. Payments</Text>
                <Text style={styles.text}>
                    All payments made are non-refundable unless explicitly stated.
                    Government fees and service charges are clearly mentioned before
                    payment.
                </Text>

                <Text style={styles.sectionTitle}>5. Privacy</Text>
                <Text style={styles.text}>
                    Your personal data is सुरक्षित and handled according to our
                    privacy policy. We do not share your data without consent.
                </Text>

                <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
                <Text style={styles.text}>
                    Zorolegal is not responsible for delays or rejections caused by
                    government authorities or incorrect user input.
                </Text>

                <Text style={styles.sectionTitle}>7. Changes to Terms</Text>
                <Text style={styles.text}>
                    We reserve the right to update these terms at any time without
                    prior notice.
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

export default TermConditionScreen;

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
        gap: 10,
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