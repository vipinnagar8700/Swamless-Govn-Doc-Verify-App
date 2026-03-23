import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Image,
} from 'react-native';

const PersonalDetailsScreen = ({ navigation }) => {

    const [form, setForm] = useState({
        fullName: 'Rakesh Kumar Sharma',
        dob: '15/03/1990',
        aadhaar: 'XXXX XXXX 1234',
        email: 'rakesh.sharma@example.com',
        phone: '+91 98765 43210',
        flat: 'B-205',
        street: 'Green Valley Apartments, MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
    });

    const handleChange = (key, value) => {
        setForm({ ...form, [key]: value });
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Image
                        source={require('../../assets/back.png')}
                        style={{ width: 22, height: 22 }}
                    />
                </TouchableOpacity>
                <Text style={styles.header}>Confirm Application</Text>
            </View>
            {/* Header with Back Icon */}

            <Text style={styles.subText}>
                Please review the auto-filled information below carefully. You can edit
                any incorrect details before proceeding.
            </Text>

            {/* Personal Details */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Personal Details</Text>

                <Field label="Full Name" value={form.fullName} onChange={(v) => handleChange('fullName', v)} />
                <Field label="Date of Birth" value={form.dob} onChange={(v) => handleChange('dob', v)} />
                <Field label="Aadhaar Number" value={form.aadhaar} onChange={(v) => handleChange('aadhaar', v)} />
                <Field label="Email Address" value={form.email} onChange={(v) => handleChange('email', v)} />
                <Field label="Phone Number" value={form.phone} onChange={(v) => handleChange('phone', v)} />
            </View>

            {/* Address Details */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Address Details</Text>

                <Field label="Flat No. / House Name" value={form.flat} onChange={(v) => handleChange('flat', v)} />
                <Field label="Street / Locality" value={form.street} onChange={(v) => handleChange('street', v)} />
                <Field label="City" value={form.city} onChange={(v) => handleChange('city', v)} />
                <Field label="State" value={form.state} onChange={(v) => handleChange('state', v)} />
                <Field label="Pincode" value={form.pincode} onChange={(v) => handleChange('pincode', v)} />
            </View>

            {/* Button */}
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("PaymentDetailsScreen")}>
                <Text style={styles.buttonText}>Confirm & Proceed</Text>
            </TouchableOpacity>

        </ScrollView>
    );
};

const Field = ({ label, value, onChange }) => (
    <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
            value={value}
            onChangeText={onChange}
            style={styles.input}
            placeholder={label}
            placeholderTextColor="#999"
        />
    </View>
);

export default PersonalDetailsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F6FA',
        padding: 16,
    },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 40, marginTop: 30
    },

    header: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#222',
    },

    subText: {
        fontSize: 13,
        color: '#666',
        marginBottom: 16,
        fontFamily: 'Poppins-Regular',
    },

    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 14,
        marginBottom: 16,
    },

    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
        marginBottom: 10,
        color: '#222',
    },

    fieldContainer: {
        marginBottom: 10,
    },

    label: {
        fontSize: 12,
        color: '#777',
        marginBottom: 4,
        fontFamily: 'Poppins-Regular',
    },

    input: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 6,
        padding: 10,
        fontSize: 14,
        color: '#333',
        backgroundColor: '#fff', // editable feel
        fontFamily: 'Poppins-Regular',
    },

    button: {
        backgroundColor: '#3B6EDC',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 50,
    },

    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
    },
});