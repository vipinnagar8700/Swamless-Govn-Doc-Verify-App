import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export default function OnboardingItem({ item }) {
    return (
        <View style={styles.container}>
            <Image source={item.image} style={styles.image} />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.description}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { alignItems: 'center', padding: 20 },
    image: { width: 250, height: 250, resizeMode: 'contain' },
    title: { fontSize: 22, fontWeight: 'bold', marginTop: 20 },
    desc: { fontSize: 14, textAlign: 'center', marginTop: 10 },
});