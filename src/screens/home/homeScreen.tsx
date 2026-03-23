import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ScrollView,
    TouchableOpacity,
    Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getServicesApi } from '../../services/servicesApi';

export default function HomeScreen() {
    const navigation = useNavigation();

    const [search, setSearch] = useState('');
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);

    // ✅ Fetch API
    const fetchServices = async (searchText = "") => {
        try {
            setLoading(true);

            const res = await getServicesApi({
                page: 1,
                limit: 10,
                search: searchText
            });
            setServices(res?.data?.services || []);
        } catch (err) {
            console.log("Service API Error:", err);
        } finally {
            setLoading(false);
        }
    };

    // ✅ Initial Load
    useEffect(() => {
        fetchServices();
    }, []);

    // ✅ Debounce search
    useEffect(() => {
        const delay = setTimeout(() => {
            fetchServices(search);
        }, 400);

        return () => clearTimeout(delay);
    }, [search]);

    return (
        <ScrollView style={styles.container}>

            {/* Header */}
            <Text style={styles.title}>Zorolegal 2.0</Text>

            {/* Search */}
            <View style={styles.searchBox}>
                <TextInput
                    placeholder="What service do you need today?"
                    placeholderTextColor="#999"
                    style={styles.input}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {/* Services */}
            <Text style={styles.sectionTitle}>Our Services</Text>

            <View style={styles.grid}>

                {/* 🔥 Skeleton Loader */}
                {loading ? (
                    [...Array(6)].map((_, index) => (
                        <View key={index} style={styles.card}>
                            <View style={styles.skeletonIcon} />
                            <View style={styles.skeletonText} />
                        </View>
                    ))
                ) : services.length > 0 ? (
                    services.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.card}
                            onPress={() =>
                                navigation.navigate("AiAssistScreen", {
                                    item: {
                                        title: item.name,
                                        desc: item.description,
                                        intro: item.description,
                                        aiPrompt: item.aiPrompt,
                                    }
                                })
                            }
                        >
                            <Image
                                source={require('../../assets/document.png')}
                                style={styles.iconImg}
                            />
                            <Text style={styles.cardText}>
                                {item?.name}
                            </Text>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.emptyBox}>
                        <Text style={styles.noServiceText}>
                            No service available 😕
                        </Text>
                    </View>
                )}
            </View>

            {/* Continue Section */}
            <Text style={styles.sectionTitle}>Continue Your Application</Text>

            <View style={styles.progressCard}>
                <View style={styles.row}>
                    <Text style={styles.progressTitle}>Passport Renewal</Text>
                    <Text style={styles.badge}>In Progress</Text>
                </View>

                <View style={styles.progressBar}>
                    <View style={styles.progressFill} />
                </View>

                <Text style={styles.percent}>70%</Text>

                <TouchableOpacity
                    style={styles.resumeBtn}
                    onPress={() => navigation.navigate("DocumentVerifyScreen")}
                >
                    <Text style={styles.resumeText}>Resume Application</Text>
                </TouchableOpacity>
            </View>

            {/* Verification */}
            <View style={styles.verifyCard}>
                <Text style={styles.verifyTitle}>
                    Free Document Verification
                </Text>
                <Text style={styles.verifyDesc}>
                    Our AI can help verify your documents for free before submission.
                </Text>

                <TouchableOpacity
                    style={styles.verifyBtn}
                    onPress={() => navigation.navigate("DocumentVerifyScreen")}
                >
                    <Text style={styles.verifyBtnText}>
                        Start Verification
                    </Text>
                </TouchableOpacity>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FA',
        padding: 16,
    },

    title: {
        fontSize: 22,
        fontFamily: 'Poppins-Bold',
        textAlign: 'center',
        marginBottom: 12,
        marginTop: 20
    },

    searchBox: {
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#eee',
    },

    input: {
        height: 45,
        fontFamily: 'Poppins-Regular',
        color: '#000'
    },

    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
        marginBottom: 12,
    },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },

    card: {
        width: '48%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 14,
        marginBottom: 12,
        alignItems: 'center',
    },

    iconImg: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
        marginBottom: 20
    },

    cardText: {
        fontSize: 13,
        fontFamily: 'Poppins-Medium',
        textAlign: 'center',
    },

    // 🔥 Skeleton styles
    skeletonIcon: {
        width: 24,
        height: 24,
        backgroundColor: '#E5E7EB',
        borderRadius: 6,
        marginBottom: 20
    },

    skeletonText: {
        width: '80%',
        height: 10,
        backgroundColor: '#E5E7EB',
        borderRadius: 6
    },

    emptyBox: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 30,
    },

    noServiceText: {
        fontSize: 14,
        color: '#777',
        fontFamily: 'Poppins-Regular',
    },

    progressCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 14,
        marginBottom: 20,
    },

    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    progressTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 14,
    },

    badge: {
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        fontSize: 11,
    },

    progressBar: {
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 10,
        marginVertical: 10,
    },

    progressFill: {
        width: '70%',
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 10,
    },

    percent: {
        textAlign: 'right',
        fontSize: 12,
    },

    resumeBtn: {
        borderWidth: 1,
        borderColor: '#3B82F6',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },

    resumeText: {
        color: '#3B82F6',
        fontFamily: 'Poppins-Bold',
    },

    verifyCard: {
        backgroundColor: '#EEF2FF',
        padding: 16,
        borderRadius: 14,
        marginBottom: 30
    },

    verifyTitle: {
        fontSize: 15,
        fontFamily: 'Poppins-Bold',
        marginBottom: 6,
    },

    verifyDesc: {
        fontSize: 12,
        color: '#555',
        marginBottom: 12,
    },

    verifyBtn: {
        backgroundColor: '#3B82F6',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center'
    },

    verifyBtnText: {
        color: '#fff',
        fontFamily: 'Poppins-Bold',
    },
});