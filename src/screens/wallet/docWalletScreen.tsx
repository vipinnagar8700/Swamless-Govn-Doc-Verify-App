import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    TextInput,
    Modal,
    Linking,
    StatusBar,
    Platform,
} from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";

import {
    uploadDocumentApi,
    getDocumentsApi,
    deleteDocumentApi,
} from "../../services/docWalletService";

// ─── Icon helper (react-native-vector-icons/Ionicons assumed) ──────────────────
// If you use a different icon library, replace "Ionicons" accordingly.


const DocWalletScreen = ({ navigation }: { navigation: any }) => {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showPickerModal, setShowPickerModal] = useState(false);
    const [docName, setDocName] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);

    /* ─── LOAD ─────────────────────────────────────────────────────────────── */
    const loadDocs = async () => {
        setLoading(true);
        const res = await getDocumentsApi();
        if (res?.status === "success") setDocs(res.data);
        setLoading(false);
    };

    useEffect(() => {
        loadDocs();
    }, []);

    /* ─── PICK ──────────────────────────────────────────────────────────────── */
    const pickImage = (type = "gallery") => {
        setShowPickerModal(false);
        const fn = type === "camera" ? launchCamera : launchImageLibrary;
        fn({ mediaType: "photo" }, (res) => {
            if (res.didCancel || res.errorCode) return;
            setSelectedFile(res.assets[0]);
            setShowModal(true);
        });
    };

    /* ─── UPLOAD ────────────────────────────────────────────────────────────── */
    const handleUpload = async () => {
        if (!docName || !selectedFile) {
            Alert.alert("Missing Info", "Please enter a document name.");
            return;
        }
        setLoading(true);
        const res = await uploadDocumentApi(docName, selectedFile);
        if (res?.status === "success") {
            Alert.alert("Uploaded!", res.message);
            setShowModal(false);
            setDocName("");
            loadDocs();
        } else {
            Alert.alert("Error", "Upload failed. Please try again.");
        }
        setLoading(false);
    };

    /* ─── DELETE ────────────────────────────────────────────────────────────── */
    const handleDelete = (id) => {
        Alert.alert("Delete Document", "This action cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    const res = await deleteDocumentApi(id);
                    if (res?.status === "success") loadDocs();
                },
            },
        ]);
    };

    /* ─── VIEW ──────────────────────────────────────────────────────────────── */
    const handleView = (url) => {
        Alert.alert("Open Document", "View in browser?", [
            { text: "Cancel", style: "cancel" },
            { text: "Open", onPress: () => Linking.openURL(url) },
        ]);
    };

    /* ─── RENDER ────────────────────────────────────────────────────────────── */
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
                <Text style={styles.header}>Upload & Verify Documents</Text>
            </View>
            {/* ── LOADING ── */}
            {loading && (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color="#6C63FF" />
                    <Text style={styles.loadingText}>Please wait…</Text>
                </View>
            )}

            {/* ── LIST ── */}
            <ScrollView
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            >
                {docs.length === 0 && !loading && (
                    <View style={styles.emptyWrap}>
                        {/* <Ionicons name="folder-open-outline" size={64} color="#C5C8E8" /> */}
                        <Text style={styles.emptyTitle}>No Documents Yet</Text>
                        <Text style={styles.emptySub}>
                            Tap the + button to upload your first document.
                        </Text>
                    </View>
                )}

                {docs.map((item) => (
                    <View key={item._id} style={styles.card}>
                        {/* thumbnail */}
                        <View style={styles.thumbWrap}>
                            <Image
                                source={{ uri: item.doc_url }}
                                style={styles.thumb}
                                resizeMode="cover"
                            />
                        </View>

                        {/* info */}
                        <View style={styles.cardBody}>
                            <Text style={styles.cardTitle} numberOfLines={1}>
                                {item.doc_name}
                            </Text>
                            <Text style={styles.cardDate}>Uploaded recently</Text>

                            <View style={styles.cardActions}>
                                <TouchableOpacity
                                    style={styles.viewBtn}
                                    onPress={() => handleView(item.doc_url)}
                                    activeOpacity={0.8}
                                >
                                    {/* <Ionicons name="eye-outline" size={14} color="#fff" /> */}
                                    <Text style={styles.actionText}>View</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.deleteBtn}
                                    onPress={() => handleDelete(item._id)}
                                    activeOpacity={0.8}
                                >
                                    {/* <Ionicons name="trash-outline" size={14} color="#fff" /> */}
                                    <Text style={styles.actionText}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* share shortcut */}
                        <TouchableOpacity style={styles.shareIcon} activeOpacity={0.7}>
                            {/* <Ionicons name="share-social-outline" size={18} color="#6C63FF" /> */}
                        </TouchableOpacity>
                    </View>
                ))}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* ── FAB ── */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setShowPickerModal(true)}
                activeOpacity={0.85}
            >
                {/* <Ionicons name="add" size={28} color="#fff" /> */}<Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            {/* ── SOURCE PICKER MODAL ── */}
            <Modal
                visible={showPickerModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPickerModal(false)}
            >
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={() => setShowPickerModal(false)}
                >
                    <View style={styles.pickerSheet}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>Add Document</Text>
                        <Text style={styles.sheetSub}>Choose how to add your document</Text>

                        <TouchableOpacity
                            style={styles.sheetOption}
                            onPress={() => pickImage("camera")}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.sheetIcon, { backgroundColor: "#EEF0FF" }]}>
                                {/* <Ionicons name="camera-outline" size={24} color="#6C63FF" /> */}
                            </View>
                            <View>
                                <Text style={styles.sheetOptionTitle}>Camera</Text>
                                <Text style={styles.sheetOptionSub}>Take a photo now</Text>
                            </View>
                            {/* <Ionicons name="chevron-forward" size={18} color="#C5C8E8" style={{ marginLeft: "auto" }} /> */}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.sheetOption}
                            onPress={() => pickImage("gallery")}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.sheetIcon, { backgroundColor: "#FFF0F0" }]}>
                                {/* <Ionicons name="images-outline" size={24} color="#EF4444" /> */}
                            </View>
                            <View>
                                <Text style={styles.sheetOptionTitle}>Gallery</Text>
                                <Text style={styles.sheetOptionSub}>Pick from your photos</Text>
                            </View>
                            {/* <Ionicons name="chevron-forward" size={18} color="#C5C8E8" style={{ marginLeft: "auto" }} /> */}
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ── UPLOAD MODAL ── */}
            <Modal
                visible={showModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.overlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Name your Document</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                {/* <Ionicons name="close-circle" size={26} color="#C5C8E8" /> */}
                            </TouchableOpacity>
                        </View>

                        {selectedFile && (
                            <Image
                                source={{ uri: selectedFile.uri }}
                                style={styles.preview}
                                resizeMode="cover"
                            />
                        )}

                        <View style={styles.inputWrap}>
                            {/* <Ionicons name="document-outline" size={18} color="#6C63FF" style={{ marginRight: 8 }} /> */}
                            <TextInput
                                placeholder="e.g. Passport, Aadhar Card…"
                                placeholderTextColor="#AAAACC"
                                value={docName}
                                onChangeText={setDocName}
                                style={styles.input}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.uploadBtn, loading && { opacity: 0.6 }]}
                            onPress={handleUpload}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    {/* <Ionicons name="cloud-upload-outline" size={18} color="#fff" style={{ marginRight: 6 }} /> */}
                                    <Text style={styles.uploadBtnText}>Upload Document</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => setShowModal(false)}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default DocWalletScreen;

/* ─── STYLES ─────────────────────────────────────────────────────────────────── */
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
    /* HEADER */
    back: {
        fontSize: 20,
        marginRight: 10,
    },

    header: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
    },

    /* LOADING */
    loadingWrap: {
        alignItems: "center",
        paddingVertical: 30,
        gap: 8,
    },
    loadingText: {
        fontFamily: "Poppins-Regular",
        fontSize: 13,
        color: "#6C63FF",
    },
    fabText: {
        fontFamily: 'Poppins-Regular',
        fontSize: 28,
        color: '#fff', paddingTop: 5
    },
    /* LIST */
    list: {
    },

    /* EMPTY */
    emptyWrap: {
        alignItems: "center",
        marginTop: 80,
        gap: 10,
    },
    emptyTitle: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 18,
        color: "#3B3F72",
    },
    emptySub: {
        fontFamily: "Poppins-Regular",
        fontSize: 13,
        color: "#9EA3C8",
        textAlign: "center",
        paddingHorizontal: 32,
    },

    /* CARD */
    card: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        alignItems: "center",
    },
    thumbWrap: {
        position: "relative",
        marginRight: 14,
    },
    thumb: {
        width: 150,
        height: 100,
        backgroundColor: "#EEF0FF", borderRadius: 14
    },
    thumbBadge: {
        position: "absolute",
        bottom: -4,
        right: -4,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#6C63FF",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#fff",
    },
    cardBody: {
        flex: 1,
    },
    cardTitle: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 14,
        color: "#1A1F3C",
        marginBottom: 2,
    },
    cardDate: {
        fontFamily: "Poppins-Regular",
        fontSize: 11,
        color: "#9EA3C8",
        marginBottom: 10,
    },
    cardActions: {
        flexDirection: "row",
        gap: 8,
    },
    viewBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "#6C63FF",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    deleteBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "#EF4444",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    actionText: {
        fontFamily: "Poppins-Medium",
        fontSize: 12,
        color: "#fff",
    },
    shareIcon: {
        marginLeft: 10,
        padding: 6,
    },

    /* FAB */
    fab: {
        position: "absolute",
        bottom: 32,
        right: 22,
        width: 50,
        height: 50,
        borderRadius: 10,
        backgroundColor: "#6C63FF",
        justifyContent: "center",
        alignItems: "center",
    },

    /* OVERLAY */
    overlay: {
        flex: 1,
        backgroundColor: "rgba(10,12,30,0.55)",
        justifyContent: "flex-end",
    },

    /* PICKER SHEET */
    pickerSheet: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingBottom: 40,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#E0E0F0",
        alignSelf: "center",
        marginBottom: 20,
    },
    sheetTitle: {
        fontFamily: "Poppins-Bold",
        fontSize: 18,
        color: "#1A1F3C",
    },
    sheetSub: {
        fontFamily: "Poppins-Regular",
        fontSize: 13,
        color: "#9EA3C8",
        marginBottom: 20,
    },
    sheetOption: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F1FA",
    },
    sheetIcon: {
        width: 50,
        height: 50,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
    },
    sheetOptionTitle: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 14,
        color: "#1A1F3C",
    },
    sheetOptionSub: {
        fontFamily: "Poppins-Regular",
        fontSize: 12,
        color: "#9EA3C8",
    },

    /* UPLOAD MODAL */
    modalBox: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    modalTitle: {
        fontFamily: "Poppins-Bold",
        fontSize: 18,
        color: "#1A1F3C",
    },
    preview: {
        width: "100%",
        height: 140,
        borderRadius: 16,
        marginBottom: 16,
        backgroundColor: "#EEF0FF",
    },
    inputWrap: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#E0E0F0",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 2,
        marginBottom: 16,
        backgroundColor: "#FAFAFF",
    },
    input: {
        flex: 1,
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        color: "#1A1F3C",
        paddingVertical: 10,
    },
    uploadBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#6C63FF",
        paddingVertical: 15,
        borderRadius: 14,
        marginBottom: 10,
        elevation: 4,
        shadowColor: "#6C63FF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    uploadBtnText: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 15,
        color: "#fff",
    },
    cancelBtn: {
        alignItems: "center",
        paddingVertical: 10,
    },
    cancelText: {
        fontFamily: "Poppins-Medium",
        fontSize: 14,
        color: "#9EA3C8",
    },
});