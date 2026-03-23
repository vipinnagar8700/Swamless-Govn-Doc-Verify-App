import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
} from 'react-native';

const paymentDetailsScreen = ({ navigation }) => {
    const [selected, setSelected] = useState('upi');

    const PaymentOption = ({ id, title, subtitle, icon }) => (
        <TouchableOpacity
            style={[
                styles.optionCard,
                selected === id && styles.selectedCard,
            ]}
            onPress={() => setSelected(id)}
        >
            <View style={styles.optionRow}>
                {/* Radio */}
                <View style={styles.radioOuter}>
                    {selected === id && <View style={styles.radioInner} />}
                </View>

                {/* Icon */}
                {/* <Icon name={icon} size={22} color="#555" style={{ marginHorizontal: 10 }} /> */}

                {/* Text */}
                <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>{title}</Text>
                    <Text style={styles.optionSubtitle}>{subtitle}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container}>

            {/* Header */}
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Image
                        source={require('../../assets/back.png')}
                        style={{ width: 22, height: 22 }}
                    />
                </TouchableOpacity>
                <Text style={styles.header}>Summary &  Payment</Text>
            </View>

            {/* Fee Summary */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Fee Summary</Text>

                <View style={styles.row}>
                    <Text style={styles.label}>Government Fee</Text>
                    <Text style={styles.amount}>₹1500.00</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Zorolegal Service Fee</Text>
                    <Text style={styles.amount}>₹250.00</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.row}>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    <Text style={styles.totalAmount}>₹1750.00</Text>
                </View>
            </View>

            {/* Payment Method */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Select Payment Method</Text>

                <PaymentOption
                    id="upi"
                    title="UPI (Unified Payments Interface)"
                    subtitle="Pay directly from your bank account."
                    icon="qr-code-outline"
                />

                <PaymentOption
                    id="card"
                    title="Debit/Credit Card"
                    subtitle="Visa, MasterCard, RuPay, etc."
                    icon="card-outline"
                />

                <PaymentOption
                    id="netbanking"
                    title="Net Banking"
                    subtitle="All major Indian banks supported."
                    icon="business-outline"
                />

                <PaymentOption
                    id="wallet"
                    title="Mobile Wallets"
                    subtitle="Pay via Paytm, PhonePe, Google Pay."
                    icon="wallet-outline"
                />
            </View>

            {/* Button */}
            <TouchableOpacity style={styles.button} onPress={() => {
                Alert.alert(
                    'Payment Successful 🎉',
                    'Your payment has been completed successfully.',
                    [
                        {
                            text: 'OK',
                            onPress: () => navigation.navigate('MainApp'),
                        },
                    ]
                );
            }}>
                <Text style={styles.buttonText}>Make Payment</Text>
            </TouchableOpacity>

            <Text style={styles.supportText}>
                Need assistance? Contact Support
            </Text>

        </ScrollView>
    );
};

export default paymentDetailsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F6FA',
        padding: 16,
    },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10, marginTop: 30
    },

    header: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#222',
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
        marginBottom: 12,
        color: '#222',
    },

    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },

    label: {
        fontSize: 14,
        color: '#555',
        fontFamily: 'Poppins-Regular',
    },

    amount: {
        fontSize: 14,
        color: '#333',
        fontFamily: 'Poppins-Regular',
    },

    divider: {
        height: 1,
        backgroundColor: '#E5E5E5',
        marginVertical: 10,
    },

    totalLabel: {
        fontSize: 15,
        fontFamily: 'Poppins-Bold',
        color: '#222',
    },

    totalAmount: {
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
        color: '#222',
    },

    optionCard: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
    },

    selectedCard: {
        borderColor: '#3B6EDC',
        backgroundColor: '#F4F7FF',
    },

    optionRow: {
        flexDirection: 'row',
        alignItems: 'center', gap: 10
    },

    optionTitle: {
        fontSize: 14,
        fontFamily: 'Poppins-Medium',
        color: '#222',
    },

    optionSubtitle: {
        fontSize: 12,
        color: '#777',
        fontFamily: 'Poppins-Regular',
    },

    radioOuter: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#3B6EDC',
        alignItems: 'center',
        justifyContent: 'center',
    },

    radioInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3B6EDC',
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

    supportText: {
        textAlign: 'center',
        marginTop: 16,
        fontSize: 12,
        color: '#777',
        fontFamily: 'Poppins-Regular', marginBottom: 50
    },
});