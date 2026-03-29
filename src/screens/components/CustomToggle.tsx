import React, { useState } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';

const CustomToggle = () => {
    const [isOn, setIsOn] = useState(true);
    const translateX = useState(new Animated.Value(isOn ? 26 : 2))[0];

    const toggleSwitch = () => {
        Animated.timing(translateX, {
            toValue: isOn ? 2 : 26,
            duration: 200,
            useNativeDriver: true,
        }).start();

        setIsOn(!isOn);
    };

    return (
        <TouchableOpacity activeOpacity={0.8} onPress={toggleSwitch}>
            <View style={[styles.track, { backgroundColor: isOn ? '#28A745' : '#ccc' }]}>
                <Animated.View
                    style={[
                        styles.thumb,
                        { transform: [{ translateX }] }
                    ]}
                />
            </View>
        </TouchableOpacity>
    );
};

export default CustomToggle;

const styles = StyleSheet.create({
    track: {
        width: 60,
        height: 30,
        borderRadius: 20,
        justifyContent: 'center',
        padding: 2,
    },
    thumb: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#fff',
        elevation: 3,
    },
});