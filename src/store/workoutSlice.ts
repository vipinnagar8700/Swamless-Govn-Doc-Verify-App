import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Exercise {
    id: number;
    name: string;
    sets: string;
    reps: string;
}

export interface Workout {
    id: number;
    title: string;
    days: string[];
    exercises: Exercise[];
    notes: string;
}

interface WorkoutState {
    workouts: Workout[];
}

const initialState: WorkoutState = {
    workouts: [],
};

const workoutSlice = createSlice({
    name: 'workout',
    initialState,
    reducers: {
        addWorkout: (state, action: PayloadAction<Workout>) => {
            state.workouts.push(action.payload);
        },
        deleteWorkout: (state, action: PayloadAction<number>) => {
            state.workouts = state.workouts.filter(w => w.id !== action.payload);
        },
    },
});

export const { addWorkout, deleteWorkout } = workoutSlice.actions;
export default workoutSlice.reducer;