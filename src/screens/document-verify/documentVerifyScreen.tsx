import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const DocumentVerifyScreen = ({ navigation }) => {

    const [docs, setDocs] = useState({
        passport: null,
        aadhaar: null,
        license: null,
    });

    // 📂 Pick from gallery
    const pickImage = (key) => {
        launchImageLibrary({ mediaType: 'photo' }, (res) => {
            if (res.didCancel || res.errorCode) return;

            const uri = res.assets[0].uri;
            setDocs((prev) => ({ ...prev, [key]: uri }));
        });
    };

    // 📷 Open camera
    const openCamera = (key) => {
        launchCamera({ mediaType: 'photo' }, (res) => {
            if (res.didCancel || res.errorCode) return;

            const uri = res.assets[0].uri;
            setDocs((prev) => ({ ...prev, [key]: uri }));
        });
    };

    const renderDocCard = (title, status, key, isError = false) => {
        return (
            <View style={styles.card}>

                {/* Title Row */}
                <View style={styles.rowBetween}>
                    <Text style={styles.title}>{title}</Text>

                    <View style={isError ? styles.errorBadge : styles.validBadge}>
                        <Text style={isError ? styles.errorText : styles.validText}>
                            {status}
                        </Text>
                    </View>
                </View>

                {/* Image Preview */}
                <Image
                    source={
                        docs[key]
                            ? { uri: docs[key] }
                            : require('../../assets/demo-image.png') // 👈 add placeholder image
                    }
                    style={styles.image}
                />

                {/* Buttons */}
                <View style={styles.btnRow}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => pickImage(key)}
                    >
                        <Image
                            source={require('../../assets/upload.png')}
                            style={styles.btnIcon}
                        />
                        <Text style={styles.btnText}>Replace</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => openCamera(key)}
                    >
                        <Image
                            source={require('../../assets/camera.png')}
                            style={styles.btnIcon}
                        />
                        <Text style={styles.btnText}>Retake</Text>
                    </TouchableOpacity>
                </View>

            </View>
        );
    };

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
                <Text style={styles.header}>Upload & Verify Documents</Text>
            </View>

            {renderDocCard('Passport Scan', 'Valid', 'passport')}
            {renderDocCard('Aadhaar Card (Front)', 'Needs Correction', 'aadhaar', true)}
            {renderDocCard('Driving License', 'Valid', 'license')}

            {/* Add Document */}
            <TouchableOpacity style={styles.addBtn}>
                <Text style={styles.addText}>＋ Add Another Document</Text>
            </TouchableOpacity>

            {/* Confirm */}
            <TouchableOpacity style={styles.confirmBtn} onPress={() => navigation.navigate('PersonalDetailsScreen')}>
                <Text style={styles.confirmText}>Confirm & Proceed</Text>
            </TouchableOpacity>

        </ScrollView>
    );
};

export default DocumentVerifyScreen;
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FA',
        padding: 16,
    },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15, marginTop: 30, gap: 30
    },

    back: {
        fontSize: 20,
        marginRight: 10,
    },

    header: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
    },

    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 15,
    },

    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    title: {
        fontFamily: 'Poppins-Bold',
        fontSize: 14,
    },

    image: {
        width: '100%',
        height: 150,
        borderRadius: 10,
        marginVertical: 10,
        backgroundColor: '#eee',
    },

    btnRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    actionBtn: {
        flexDirection: 'row',       // ✅ icon + text in row
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingVertical: 10,
        flex: 1,
        marginHorizontal: 5,
    },
    btnIcon: {
        width: 18,
        height: 18,
        marginRight: 6,             // space between icon & text
    },

    btnText: {
        fontFamily: 'Poppins-Medium',
        fontSize: 13,
    },
    validBadge: {
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
    },

    validText: {
        color: '#10B981',
        fontSize: 11,
        fontFamily: 'Poppins-Medium',
    },

    errorBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
    },

    errorText: {
        color: '#EF4444',
        fontSize: 11,
        fontFamily: 'Poppins-Medium',
    },

    addBtn: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 15,
    },

    addText: {
        fontFamily: 'Poppins-Medium',
    },

    confirmBtn: {
        backgroundColor: '#3B82F6',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center', marginBottom: 50
    },

    confirmText: {
        color: '#fff',
        fontFamily: 'Poppins-Bold',
    },
});