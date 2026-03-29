import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import TabBar from './TabBar';
import WorkoutListScreen from './WorkoutListScreen';
import AddWorkoutPlanScreen from './AddWorkoutPlanScreen';

const WorkoutManagementScreen = () => {
    const [tab, setTab] = useState('Workout');
    const [showAdd, setShowAdd] = useState(false);
    const [workoutPlans, setWorkoutPlans] = useState([
        { id: '1', name: "Beginner's Workout - 3 Days" },
        { id: '2', name: "Beginner's Full Body - 1 Day" },
    ]);

    // Add new plan handler
    const handleAddPlan = (plan) => {
        setWorkoutPlans(prev => [
            { ...plan, id: Date.now().toString() },
            ...prev
        ]);
        setShowAdd(false);
    };

    // Remove plan handler
    const handleDeletePlan = (id) => {
        setWorkoutPlans(prev => prev.filter(p => p.id !== id));
    };

    return (
        <View style={styles.container}>
            <TabBar selected={tab} onSelect={setTab} />
            {tab === 'Workout' && (
                showAdd ? (
                    <AddWorkoutPlanScreen
                        onSubmit={handleAddPlan}
                        onCancel={() => setShowAdd(false)}
                    />
                ) : (
                    <WorkoutListScreen
                        workoutPlans={workoutPlans}
                        onAdd={() => setShowAdd(true)}
                        onDelete={handleDeletePlan}
                    />
                )
            )}
            {tab === 'Client' && (
                <View style={styles.placeholder}><Text>Client Tab (Coming Soon)</Text></View>
            )}
            {tab === 'Availability' && (
                <View style={styles.placeholder}><Text>Availability Tab (Coming Soon)</Text></View>
            )}
        </View>
    );
};

export default WorkoutManagementScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5FFF7',
        paddingTop: 32,
    },
    placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
