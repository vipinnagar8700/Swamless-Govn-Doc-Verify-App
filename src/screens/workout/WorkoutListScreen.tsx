import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';

const WorkoutListScreen = ({ workoutPlans, onAdd, onDelete }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.header}>Custom Workout Plans</Text>
            <FlatList
                data={workoutPlans}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.planRow}>
                        <Text style={styles.planName}>{item.name}</Text>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item.id)}>
                            <Text style={styles.deleteText}>🗑️</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
            <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
                <Text style={styles.addBtnText}>＋</Text>
            </TouchableOpacity>
        </View>
    );
};

export default WorkoutListScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
    },
    header: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
        color: '#333',
        backgroundColor: '#F5F5F5',
        padding: 10,
        borderRadius: 8,
    },
    planRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    planName: {
        fontSize: 15,
        color: '#222',
    },
    deleteBtn: {
        padding: 6,
    },
    deleteText: {
        fontSize: 18,
        color: '#E53935',
    },
    addBtn: {
        backgroundColor: '#28A745',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginTop: 24,
        elevation: 2,
    },
    addBtnText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: -2,
    },
});
