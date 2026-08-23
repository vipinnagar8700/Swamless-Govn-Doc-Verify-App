import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';

interface CustomToggleProps {
    value?: boolean;
    onValueChange?: (value: boolean) => void;
}

const CustomToggle = ({ value, onValueChange }: CustomToggleProps) => {
    const [internalValue, setInternalValue] = useState(false);
    const isOn = value ?? internalValue;
    const translateX = useState(new Animated.Value(isOn ? 26 : 2))[0];

    useEffect(() => {
        Animated.timing(translateX, {
            toValue: isOn ? 26 : 2,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [isOn, translateX]);

    const toggleSwitch = () => {
        const nextValue = !isOn;

        Animated.timing(translateX, {
            toValue: nextValue ? 26 : 2,
            duration: 200,
            useNativeDriver: true,
        }).start();

        if (value === undefined) {
            setInternalValue(nextValue);
        }

        onValueChange?.(nextValue);
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