import React, { useContext, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { AuthContext } from '../../context/AuthContext';

const ProfileScreen = ({ navigation }: { navigation: any }) => {
    const { user, getMe, updateProfile, logout, uploadImage, deleteImage, loading } = useContext(AuthContext);
    console.log("User:", user);
    const [isEdit, setIsEdit] = useState(false);

    const [profile, setProfile] = useState({
        name: '',
        email: '',
        image: null as any,
    });

    // ✅ Load user
    useEffect(() => {
        if (!user) {
            getMe();
        } else {
            setProfile({
                name: user?.name || '',
                email: user?.email || '',
                image: user?.image || null,
            });
        }
    }, [user]);

    // 📷 Pick Image
    const pickImage = async () => {
        const result = await launchImageLibrary({
            mediaType: 'photo',
            quality: 0.7,
        });

        if (result?.assets?.length > 0) {
            const imageFile = result.assets[0];

            // ✅ Show instant preview while uploading
            setProfile(prev => ({
                ...prev,
                image: imageFile.uri
            }));

            try {
                console.log("Uploading image:", imageFile);
                const data = await uploadImage(imageFile);
                console.log("Upload response:", data);
                Alert.alert("Success", "Profile image updated successfully");
            } catch (e: any) {
                // Revert to original image on error
                setProfile(prev => ({
                    ...prev,
                    image: user?.image || null
                }));
                Alert.alert("Error", e.message || "Failed to upload image");
            }
        }
    };

    // 🗑️ Remove Image
    const removeImage = async () => {
        try {
            await deleteImage();
            Alert.alert("Success", "Profile image removed");
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to remove image");
        }
    };

    // ✅ Save Profile
    const handleSave = async () => {
        if (isEdit) {
            try {
                await updateProfile(profile);
                Alert.alert("Success", "Profile updated");
            } catch (e) {
                console.log("Update error", e);
            }
        }
        setIsEdit(prev => !prev);
    };

    // ✅ Logout Fix
    const handleLogout = async () => {
        await logout();
        navigation.replace("Login");
    };

    // � Real-time Image URI Logic
    const getImageUri = () => {
        // Show preview during upload (local file)
        if (profile.image?.startsWith('file://')) return profile.image;

        // Show Cloudinary image from user state
        if (user?.image) return user.image;

        // Fallback to null (shows default avatar)
        return null;
    };

    // � Documents
    const renderDoc = (title, status) => {
        const isValid = status === 'Valid';

        return (
            <TouchableOpacity style={styles.row}>
                <Text style={styles.icon}>📄</Text>
                <Text style={styles.rowText}>{title}</Text>

                <View style={isValid ? styles.validBadge : styles.expiredBadge}>
                    <Text style={isValid ? styles.validText : styles.expiredText}>
                        {status}
                    </Text>
                </View>

                <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
        );
    };

    // ⏰ Reminder
    const renderReminder = (title, due) => (
        <TouchableOpacity style={styles.row}>
            <Text style={styles.icon}>⏰</Text>
            <Text style={styles.rowText}>{title}</Text>
            <Text style={styles.dueText}>{due}</Text>
            <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
    );

    // ⚙️ Menu
    const renderMenu = (title, isLogout = false) => (
        <TouchableOpacity
            style={styles.row}
            onPress={isLogout ? handleLogout : () => navigation.navigate("Settings")}
        >
            <Text style={styles.icon}>{title.split(' ')[0]}</Text>
            <Text style={[styles.rowText, isLogout && { color: 'red' }]}>
                {title.replace(title.split(' ')[0], '')}
            </Text>
            <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Profile & Documents</Text>

            {/* Profile Card */}
            <View style={styles.profileCard}>
                <View style={styles.profileRow}>
                    {/* Avatar */}
                    <View style={styles.avatarWrapper}>
                        <Image
                            source={
                                getImageUri()
                                    ? { uri: getImageUri() }
                                    : require('../../assets/avatar.png')
                            }
                            style={styles.avatar}
                        />

                        {isEdit && (
                            <>
                                <TouchableOpacity style={styles.editOverlay} onPress={pickImage}>
                                    <Image
                                        source={require('../../assets/edit-text.png')}
                                        style={styles.overlayIcon}
                                    />
                                </TouchableOpacity>
                                {user?.image && (
                                    <TouchableOpacity style={styles.deleteOverlay} onPress={removeImage}>
                                        <Text style={styles.deleteIcon}>×</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}

                        {/* 🔥 Loading Indicator */}
                        {loading && (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="small" color="#3B82F6" />
                            </View>
                        )}
                    </View>

                    {/* Name + Email */}
                    <View style={{ flex: 1 }}>
                        {isEdit ? (
                            <>
                                <TextInput
                                    value={profile.name}
                                    onChangeText={(text) =>
                                        setProfile(prev => ({ ...prev, name: text }))
                                    }
                                    style={styles.input}
                                />
                                <TextInput
                                    value={profile.email}
                                    onChangeText={(text) =>
                                        setProfile(prev => ({ ...prev, email: text }))
                                    }
                                    style={styles.input}
                                />
                            </>
                        ) : (
                            <>
                                <Text style={styles.name}>{profile.name || "No Name"}</Text>
                                <Text style={styles.email}>{profile.email || "No Email"}</Text>
                            </>
                        )}
                    </View>
                </View>

                {/* Edit Button */}
                <TouchableOpacity style={styles.editBtn} onPress={handleSave}>
                    <Text style={styles.editText}>
                        {isEdit ? 'Save Profile' : 'Edit Profile'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Documents */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Saved Documents</Text>
                {renderDoc('Passport', 'Valid')}
                {renderDoc('Aadhaar Card', 'Valid')}
                {renderDoc('PAN Card', 'Valid')}
                {renderDoc('Driving License', 'Expired')}
            </View>

            {/* Reminders */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Renewals & Reminders</Text>
                {renderReminder('Driving License Renewal', 'Due in 30 days')}
                {renderReminder('Vehicle Insurance', 'Due 2024-04-01')}
            </View>

            {/* Menu */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Preferences & Support</Text>
                {renderMenu('⚙️ Account Settings')}
                {renderMenu('❓ Help Center')}
                {renderMenu('🚪 Logout', true)}
            </View>
        </ScrollView>
    );
};

export default ProfileScreen;

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
        marginTop: 30,
        marginBottom: 15,
    },

    profileCard: {
        backgroundColor: '#EEF2F7',
        padding: 16,
        borderRadius: 14,
        marginBottom: 15,
    },

    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },

    avatarWrapper: {
        position: 'relative',
        marginRight: 12,
    },

    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },

    editOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
    },

    overlayIcon: {
        width: 20,
        height: 20,
        tintColor: '#fff',
    },

    deleteOverlay: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#EF4444',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },

    deleteIcon: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },

    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 50,
    },

    name: {
        fontFamily: 'Poppins-Bold',
        fontSize: 16,
    },

    email: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#666',
    },

    input: {
        borderBottomWidth: 1,
        borderColor: '#ccc',
        marginBottom: 5,
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#000'
    },

    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#999',
        padding: 10,
        borderRadius: 10,
    },

    btnIcon: {
        width: 18,
        height: 18,
        marginRight: 6,
    },

    editText: {
        fontFamily: 'Poppins-Medium',
        fontSize: 13,
    },

    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
    },

    sectionTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 15,
        marginBottom: 10,
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderColor: '#eee',
    },

    icon: {
        fontSize: 18,
        marginRight: 10,
    },

    rowText: {
        flex: 1,
        fontFamily: 'Poppins-Medium',
        fontSize: 13,
    },

    arrow: {
        fontSize: 18,
        color: '#999',
    },

    validBadge: {
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
        marginRight: 10,
    },

    validText: {
        color: '#10B981',
        fontSize: 11,
        fontFamily: 'Poppins-Medium',
    },

    expiredBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
        marginRight: 10,
    },

    expiredText: {
        color: '#EF4444',
        fontSize: 11,
        fontFamily: 'Poppins-Medium',
    },

    dueText: {
        fontSize: 12,
        color: '#666',
        marginRight: 10,
        fontFamily: 'Poppins-Regular',
    },
});