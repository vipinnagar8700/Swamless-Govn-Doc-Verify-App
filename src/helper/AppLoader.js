import React from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';

export default function AppLoader() {
    return (
        <View style={styles.container}>
            {/* 🔥 Logo */}
            <Image
                source={require('../assets/logo.png')} // apna logo path daalo
                style={styles.logo}
                resizeMode="contain"
            />

            {/* 🔄 Loader */}
            <ActivityIndicator size="large" color="#2563eb" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 20,
    },
});