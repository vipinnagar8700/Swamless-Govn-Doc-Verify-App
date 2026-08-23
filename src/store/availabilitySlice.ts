import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Slot {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    sessionName: string;
    repeat: boolean;
}

interface AvailabilityState {
    slots: Slot[];
}

const initialState: AvailabilityState = {
    slots: [],
};

const availabilitySlice = createSlice({
    name: 'availability',
    initialState,
    reducers: {
        addSlot: (state, action: PayloadAction<Slot>) => {
            state.slots.push(action.payload);
        },
        deleteSlot: (state, action: PayloadAction<number>) => {
            state.slots = state.slots.filter(item => item.id !== action.payload);
        },
    },
});

export const { addSlot, deleteSlot } = availabilitySlice.actions;
export default availabilitySlice.reducer;