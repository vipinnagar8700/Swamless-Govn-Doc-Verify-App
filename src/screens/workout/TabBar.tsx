import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const TABS = ['Workout', 'Client', 'Availability'];

const TabBar = ({ selected, onSelect }: { selected: string, onSelect: (tab: string) => void }) => (
    <View style={styles.tabBar}>
        {TABS.map(tab => (
            <TouchableOpacity
                key={tab}
                style={[styles.tab, selected === tab && styles.tabSelected]}
                onPress={() => onSelect(tab)}
            >
                <Text style={[styles.tabText, selected === tab && styles.tabTextSelected]}>{tab}</Text>
            </TouchableOpacity>
        ))}
    </View>
);

export default TabBar;

const styles = StyleSheet.create({
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#eee',
        marginBottom: 8,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 2,
        borderColor: 'transparent',
    },
    tabSelected: {
        borderColor: '#28A745',
        borderBottomWidth: 2,
        backgroundColor: '#F5FFF7',
    },
    tabText: {
        color: '#888',
        fontWeight: '600',
        fontSize: 15,
    },
    tabTextSelected: {
        color: '#28A745',
    },
});
