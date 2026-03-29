import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Exercise {
    id: string;
    name: string;
    sets: string;
    reps: string;
}

interface Day {
    id: string;
    title: string;
    muscle: string;
    exercises: Exercise[];
}

interface WorkoutState {
    planName: string;
    days: Day[];
    notes: string;
}

const initialState: WorkoutState = {
    planName: "Beginner's Workout - 3 days",
    days: [
        {
            id: '1',
            title: 'Day 1',
            muscle: 'Chest',
            exercises: [
                { id: 'e1', name: 'Chest', sets: '', reps: '' },
                { id: 'e2', name: 'Bench Press', sets: '8', reps: '3' },
                { id: 'e3', name: 'Bench Press', sets: '8', reps: '5' },
                { id: 'e4', name: 'Planks', sets: '3', reps: '30 secs' },
            ],
        },
    ],
    notes: 'Bench Press: www.benchpress.com\nEat Oats',
};

const workoutSlice = createSlice({
    name: 'workout',
    initialState,
    reducers: {
        updatePlanName(state, action: PayloadAction<string>) {
            state.planName = action.payload;
        },
        addDay(state) {
            const newId = Date.now().toString();
            state.days.push({
                id: newId,
                title: `Day ${state.days.length + 1}`,
                muscle: '',
                exercises: [],
            });
        },
        deleteDay(state, action: PayloadAction<string>) {
            state.days = state.days.filter(d => d.id !== action.payload);
        },
        updateMuscle(state, action: PayloadAction<{ dayId: string; value: string }>) {
            const day = state.days.find(d => d.id === action.payload.dayId);
            if (day) day.muscle = action.payload.value;
        },
        addExercise(state, action: PayloadAction<{ dayId: string }>) {
            const day = state.days.find(d => d.id === action.payload.dayId);
            if (day) {
                day.exercises.push({
                    id: Date.now().toString(),
                    name: '',
                    sets: '',
                    reps: '',
                });
            }
        },
        updateExercise(
            state,
            action: PayloadAction<{
                dayId: string;
                exerciseId: string;
                field: keyof Exercise;
                value: string;
            }>
        ) {
            const { dayId, exerciseId, field, value } = action.payload;
            const day = state.days.find(d => d.id === dayId);
            const exercise = day?.exercises.find(e => e.id === exerciseId);
            if (exercise) exercise[field] = value;
        },
        deleteExercise(
            state,
            action: PayloadAction<{ dayId: string; exerciseId: string }>
        ) {
            const day = state.days.find(d => d.id === action.payload.dayId);
            if (day) {
                day.exercises = day.exercises.filter(e => e.id !== action.payload.exerciseId);
            }
        },
        updateNotes(state, action: PayloadAction<string>) {
            state.notes = action.payload;
        },
    },
});

export const {
    updatePlanName,
    addDay,
    deleteDay,
    updateMuscle,
    addExercise,
    updateExercise,
    deleteExercise,
    updateNotes,
} = workoutSlice.actions;

export default workoutSlice.reducer;