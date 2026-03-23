import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';

const StatusScreen = () => {
    return (
        <ScrollView style={styles.container}>

            {/* Header */}
            <Text style={styles.header}>Application Status</Text>

            {/* Application ID */}
            <View style={styles.card}>
                <Text style={styles.label}>Application ID:</Text>
                <Text style={styles.appId}>ZRL2024-PASS-00123</Text>
            </View>

            {/* Progress Card */}
            <View style={styles.progressCard}>
                <Text style={styles.sectionTitle}>Application Progress</Text>

                {/* Step 1 */}
                <View style={styles.stepRow}>
                    <Text style={{ marginRight: 15 }}>✔</Text>
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Application Submitted</Text>
                        <Text style={styles.date}>July 1, 2024 - 10:30 AM</Text>

                        <View style={styles.completedBtn}>
                            <Text style={styles.completedText}>Completed</Text>
                        </View>
                    </View>
                </View>

                {/* Step 2 */}
                <View style={styles.stepRow}>
                    <View style={styles.radioActive} />
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Documents Under Verification</Text>
                        <Text style={styles.date}>July 3, 2024 - 02:15 PM</Text>

                        <View style={styles.inProgressBtn}>
                            <Text style={styles.inProgressText}>In Progress</Text>
                        </View>
                    </View>
                </View>

                {/* Step 3 */}
                <View style={styles.stepRow}>
                    <View style={styles.radioInactive} />
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Processing by Government Authority</Text>

                        <View style={styles.pendingBtn}>
                            <Text style={styles.pendingText}>Pending</Text>
                        </View>
                    </View>
                </View>

                {/* Step 4 */}
                <View style={styles.stepRow}>
                    <View style={styles.radioInactive} />
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Application Approved & Dispatched</Text>

                        <View style={styles.pendingBtn}>
                            <Text style={styles.pendingText}>Pending</Text>
                        </View>
                    </View>
                </View>

            </View>

            {/* Expected Timeline */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Expected Timeline</Text>
                <Text style={styles.text}>
                    Your passport application is estimated to be completed and dispatched by{' '}
                    <Text style={styles.highlight}>July 20, 2024</Text>. We will send you real-time updates via SMS and in-app notifications.
                </Text>
            </View>

            {/* Support */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Support & Updates</Text>
                <Text style={styles.text}>
                    Your documents are currently undergoing verification by the Passport Authority of India.
                    This process typically takes 3-5 business days. We will notify you immediately once the verification is complete.
                </Text>

                <TouchableOpacity style={styles.button}>
                    <Text style={styles.buttonText}>📞 Contact Support</Text>
                </TouchableOpacity>
            </View>

        </ScrollView>
    );
};

export default StatusScreen;


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FA',
        padding: 16,
    },

    header: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        textAlign: 'center',
        marginBottom: 15, marginTop: 30
    },

    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 30,
    },

    label: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#666',
    },

    appId: {
        fontFamily: 'Poppins-Bold',
        fontSize: 14,
        marginTop: 4,
    },

    progressCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 15,
    },

    sectionTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 15,
        marginBottom: 10,
    },

    stepRow: {
        flexDirection: 'row',
        marginBottom: 15, gap: 10
    },

    iconActive: {
        fontSize: 16,
        color: '#3B82F6',
        marginRight: 10,
        marginTop: 2,
    },

    iconInactive: {
        fontSize: 16,
        color: '#ccc',
        marginRight: 10,
        marginTop: 2,
    },

    stepContent: {
        flex: 1,
    },

    stepTitle: {
        fontFamily: 'Poppins-Medium',
        fontSize: 13,
    },

    date: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#777',
        marginVertical: 3,
    },

    completed: {
        fontFamily: 'Poppins-Medium',
        fontSize: 12,
        color: '#555',
    },

    statusBar: {
        backgroundColor: '#E5E7EB',
        borderRadius: 10,
        paddingVertical: 4,
        marginTop: 5,
        alignItems: 'center',
    },

    statusBarGrey: {
        backgroundColor: '#F0F0F0',
        borderRadius: 10,
        paddingVertical: 4,
        marginTop: 5,
        alignItems: 'center',
    },

    inProgress: {
        fontFamily: 'Poppins-Medium',
        fontSize: 11,
        color: '#333',
    },

    pending: {
        fontFamily: 'Poppins-Medium',
        fontSize: 11,
        color: '#999',
    },

    text: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#444',
        marginTop: 5,
    },

    highlight: {
        color: '#3B82F6',
        fontFamily: 'Poppins-Bold',
    },

    button: {
        borderWidth: 1,
        borderColor: '#3B82F6',
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
        alignItems: 'center',
    },

    buttonText: {
        color: '#3B82F6',
        fontFamily: 'Poppins-Bold',
    },

    // 
    // RADIO BUTTONS
    radioCompleted: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#3B82F6',
        marginRight: 10,
        marginTop: 3,
    },

    radioActive: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 3,
        borderColor: '#3B82F6',
        marginRight: 10,
        marginTop: 3,
    },

    radioInactive: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#ccc',
        marginRight: 10,
        marginTop: 3,
    },

    // STATUS BUTTONS
    completedBtn: {
        backgroundColor: '#E6F0FF',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginTop: 5, width: '100%'
    },

    completedText: {
        color: '#3B82F6',
        fontSize: 11,
        fontFamily: 'Poppins-Medium', textAlign: 'center'
    },

    inProgressBtn: {
        backgroundColor: '#EEF2FF',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginTop: 5, width: '100%'
    },

    inProgressText: {
        color: '#3B82F6',
        fontSize: 11,
        fontFamily: 'Poppins-Medium', textAlign: 'center'
    },

    pendingBtn: {
        backgroundColor: '#F3F4F6',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginTop: 5, width: '100%'
    },

    pendingText: {
        color: '#999',
        fontSize: 11,
        fontFamily: 'Poppins-Medium', textAlign: 'center'
    },
});