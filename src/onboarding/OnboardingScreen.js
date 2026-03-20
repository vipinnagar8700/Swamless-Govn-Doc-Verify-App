import { useNavigation } from '@react-navigation/native';
import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    FlatList,
    Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

// ✅ Slides Data
const slides = [
    {
        id: '1',
        title: 'Seamless Government Services',
        description: 'Your guide to hassle-free applications.',
        long_des: "Complete your Passport, Aadhaar, PAN,\nand more with intelligent AI assistance\nand guided steps.",
        image: require('../assets/onboard1.jpg'),
    },
    {
        id: '2',
        title: 'Simplify Your Applications',
        description: '',
        long_des: " Navigate complex government processes with ease.Our Al assistant guides you step- by - step, ensuring accuracy and efficiency.",
        image: require('../assets/onboard1.jpg'),
    },
    {
        id: '3',
        title: 'All Your Government Services, Simplified',
        description: '',
        long_des: "From passport to licenses, experience a seamless application process poweredby Al assistance, secure document management, and real- time status tracking.",
        image: require('../assets/onboard1.jpg'),
    },
];

export default function OnboardingScreen() {
    const flatListRef = useRef();
    const [index, setIndex] = useState(0);
    const navigation = useNavigation();
    const handleNext = () => {
        if (index < slides.length - 1) {
            flatListRef.current.scrollToIndex({ index: index + 1 });
        } else {
            console.log('Go to Home/Login');
            navigation.navigate("Login")
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <FlatList
                ref={flatListRef}
                data={slides}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                onMomentumScrollEnd={(e) => {
                    const i = Math.round(
                        e.nativeEvent.contentOffset.x / width
                    );
                    setIndex(i);
                }}
                renderItem={({ item }) => (
                    <View style={{ width }}>

                        {/* BACKGROUND IMAGE */}
                        <Image source={item.image} style={styles.bgImage} />

                        {/* FULL OVERLAY */}
                        <View style={styles.fullOverlay} />

                        {/* CONTENT */}
                        <View style={styles.content}>

                            {/* IMAGE CARD */}
                            <View style={styles.imageContainer}>
                                <Image source={item.image} style={styles.image} />
                                <View style={styles.imageOverlay} />
                            </View>

                            {/* TEXT */}
                            <View style={styles.textWrapper}>
                                <Text style={styles.title}>{item.title}</Text>
                                <Text style={styles.subtitle}>
                                    {item.description}
                                </Text>
                            </View>

                            {/* DESCRIPTION */}
                            <Text style={styles.description}>
                                {item.long_des}
                            </Text>

                            <View style={styles.bottomContainer}>

                                <Text style={styles.pagination}>
                                    {index + 1} of {slides.length}
                                </Text>

                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={handleNext}
                                >
                                    <Text style={styles.buttonText}>
                                        {index === slides.length - 1
                                            ? 'Get Started'
                                            : 'Next'}
                                    </Text>
                                </TouchableOpacity>

                            </View>
                        </View>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    bgImage: {
        ...StyleSheet.absoluteFillObject,
        resizeMode: 'cover',
    },

    fullOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)',
    },

    content: {
        flex: 1,
        alignItems: 'center',
    },

    imageContainer: {
        width: '100%',
        height: 360,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },

    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },

    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)',
    },

    textWrapper: {
        width: '90%',
        marginTop: -120,
    },

    // ✅ FONT APPLIED
    title: {
        fontSize: 25,
        fontFamily: 'Poppins-SemiBold',
        color: '#111827',
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: '#111827',
        marginTop: 5,
    },

    description: {
        fontSize: 16,
        fontFamily: 'Poppins-Regular',
        color: '#000',
        textAlign: 'center',
        marginTop: 80,
        lineHeight: 24,
        paddingHorizontal: 20,
        marginBottom: 40,
    },

    bottomContainer: {
        position: 'absolute',
        bottom: 30, // 👈 yaha adjust kar sakte ho (B -30)
        width: '100%',
        alignItems: 'center',
    },

    pagination: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: '#2a2d31',
        marginBottom: 10,
    },

    button: {
        backgroundColor: '#3B82F6',
        width: '90%',
        paddingVertical: 12,
        borderRadius: 18,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
    },
});