import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';

const AddWorkoutPlanScreen = ({ onSubmit, onCancel }) => {
    const [name, setName] = useState("");
    const [notes, setNotes] = useState("");

    // For simplicity, just one day and one exercise for now
    const [dayName, setDayName] = useState("Day 1");
    const [dayLabel, setDayLabel] = useState("");
    const [exercise, setExercise] = useState({ name: '', sets: '', reps: '' });

    const handleSubmit = () => {
        if (!name) return;
        onSubmit({
            name,
            notes,
            days: [
                {
                    dayName,
                    label: dayLabel,
                    exercises: [exercise],
                },
            ],
        });
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Add Workout Plan</Text>
            <TextInput
                style={styles.input}
                placeholder="Beginner's Workout - 3 days"
                placeholderTextColor="#aaa"
                value={name}
                onChangeText={setName}
            />
            <View style={styles.dayRow}>
                <TouchableOpacity style={styles.dayBtn}>
                    <Text style={styles.dayBtnText}>{dayName}</Text>
                </TouchableOpacity>
                <TextInput
                    style={styles.dayInput}
                    placeholder="Chest"
                    placeholderTextColor="#aaa"
                    value={dayLabel}
                    onChangeText={setDayLabel}
                />
                <TouchableOpacity style={styles.deleteDayBtn}>
                    <Text style={styles.deleteText}>🗑️</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.exerciseRow}>
                <Text style={styles.exerciseName}>Exercise</Text>
                <TextInput
                    style={styles.setsInput}
                    placeholder="Name"
                    placeholderTextColor="#aaa"
                    value={exercise.name}
                    onChangeText={v => setExercise(e => ({ ...e, name: v }))}
                />
                <TextInput
                    style={styles.setsInput}
                    placeholder="Sets"
                    placeholderTextColor="#aaa"
                    value={exercise.sets}
                    onChangeText={v => setExercise(e => ({ ...e, sets: v }))}
                />
                <TextInput
                    style={styles.repsInput}
                    placeholder="Reps"
                    placeholderTextColor="#aaa"
                    value={exercise.reps}
                    onChangeText={v => setExercise(e => ({ ...e, reps: v }))}
                />
                <TouchableOpacity style={styles.deleteExerciseBtn}>
                    <Text style={styles.deleteText}>🗑️</Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.addExerciseBtn}>
                <Text style={styles.addBtnText}>＋</Text>
            </TouchableOpacity>
            <TextInput
                style={styles.notesInput}
                placeholder="Notes (e.g. www.benchpress.com)\nEat Oats"
                placeholderTextColor="#aaa"
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#aaa', marginTop: 8 }]} onPress={onCancel}>
                <Text style={styles.submitText}>Cancel</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

export default AddWorkoutPlanScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
    },
    header: {
        fontSize: 18,
        fontWeight: '700',
        color: '#28A745',
        marginBottom: 16,
        alignSelf: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
        fontSize: 15,
        color: '#222',
    },
    dayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    dayBtn: {
        backgroundColor: '#28A745',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 6,
        marginRight: 8,
    },
    dayBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    dayInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        padding: 8,
        fontSize: 14,
        color: '#222',
        marginRight: 8,
    },
    deleteDayBtn: { padding: 4 },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    exerciseName: {
        width: 80,
        fontSize: 14,
        color: '#222',
    },
    setsInput: {
        width: 40,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        padding: 6,
        marginHorizontal: 4,
        fontSize: 13,
        color: '#222',
        textAlign: 'center',
    },
    repsInput: {
        width: 60,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        padding: 6,
        marginHorizontal: 4,
        fontSize: 13,
        color: '#222',
        textAlign: 'center',
    },
    deleteExerciseBtn: { padding: 4 },
    addExerciseBtn: {
        backgroundColor: '#28A745',
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginVertical: 10,
    },
    addBtnText: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: -2,
    },
    notesInput: {
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        color: '#222',
        marginBottom: 16,
        minHeight: 60,
    },
    submitBtn: {
        backgroundColor: '#28A745',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    submitText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    deleteText: {
        fontSize: 18,
        color: '#E53935',
    },
});
