import { configureStore } from '@reduxjs/toolkit';
import workoutReducer from './workoutSlice';
import availabilityReducer from './availabilitySlice';

export const store = configureStore({
    reducer: {
        workout: workoutReducer,
        availability: availabilityReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;