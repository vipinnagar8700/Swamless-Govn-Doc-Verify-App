import { configureStore } from '@reduxjs/toolkit';
import availabilityReducer from './availabilitySlice';
import workoutReducer from './workoutSlice';

export const store = configureStore({
    reducer: {
        availability: availabilityReducer,
        workout: workoutReducer,
    },
});

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;