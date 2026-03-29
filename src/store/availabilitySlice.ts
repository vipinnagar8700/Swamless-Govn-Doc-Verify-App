import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Slot {
    id: string;
    start: string;
    end: string;
}

interface AvailabilityState {
    date: string;
    startTime: string;
    endTime: string;
    repeat: boolean;
    sessionName: string;
    slots: Slot[];
    currentYear: number;
    currentMonth: number;
    selectedDay: number;
}

const initialState: AvailabilityState = {
    date: '24 July 2024',
    startTime: '11:30 AM',
    endTime: '11:45 AM',
    repeat: true,
    sessionName: 'PT',
    slots: [
        { id: 's1', start: '11:00 AM', end: '11:45 AM' },
        { id: 's2', start: '5:00 PM', end: '5:30 PM' },
    ],
    currentYear: 2025,
    currentMonth: 1, // 0-based, 1 = February
    selectedDay: 7,
};

const availabilitySlice = createSlice({
    name: 'availability',
    initialState,
    reducers: {
        setDate(state, action: PayloadAction<string>) {
            state.date = action.payload;
        },
        setStartTime(state, action: PayloadAction<string>) {
            state.startTime = action.payload;
        },
        setEndTime(state, action: PayloadAction<string>) {
            state.endTime = action.payload;
        },
        toggleRepeat(state) {
            state.repeat = !state.repeat;
        },
        setSessionName(state, action: PayloadAction<string>) {
            state.sessionName = action.payload;
        },
        addSlot(state) {
            state.slots.push({
                id: Date.now().toString(),
                start: state.startTime,
                end: state.endTime,
            });
        },
        deleteSlot(state, action: PayloadAction<string>) {
            state.slots = state.slots.filter(s => s.id !== action.payload);
        },
        prevMonth(state) {
            if (state.currentMonth === 0) {
                state.currentMonth = 11;
                state.currentYear -= 1;
            } else {
                state.currentMonth -= 1;
            }
        },
        nextMonth(state) {
            if (state.currentMonth === 11) {
                state.currentMonth = 0;
                state.currentYear += 1;
            } else {
                state.currentMonth += 1;
            }
        },
        selectDay(state, action: PayloadAction<number>) {
            state.selectedDay = action.payload;
        },
    },
});

export const {
    setDate,
    setStartTime,
    setEndTime,
    toggleRepeat,
    setSessionName,
    addSlot,
    deleteSlot,
    prevMonth,
    nextMonth,
    selectDay,
} = availabilitySlice.actions;

export default availabilitySlice.reducer;