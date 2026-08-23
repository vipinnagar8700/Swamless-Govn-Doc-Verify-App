import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    StatusBar,
    TextInput,
    Platform,
    ScrollView,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MiniCalendar from '../components/MiniCalendar';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomToggle from '../components/CustomToggle';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { addSlot, deleteSlot } from '../../store/availabilitySlice';
import { addWorkout, deleteWorkout, Exercise, Workout } from '../../store/workoutSlice';

const GymWorkScreen: React.FC = () => {

    const [activeTab, setActiveTab] = useState<'Workout' | 'Client' | 'Availability' | 'Book Slots'>('Workout');
    const [showWorkoutForm, setShowWorkoutForm] = useState(false);
    const dispatch = useDispatch<AppDispatch>();
    const workouts = useSelector((state: RootState) => state.workout.workouts);

    const handleDeleteWorkout = (id: number) => {
        dispatch(deleteWorkout(id));
    };

    const renderItem = ({ item }: { item: Workout }) => (
        <View style={styles.item}>
            <Text style={styles.itemText}>{`${item.title} - ${item.days.length} Day${item.days.length > 1 ? 's' : ''}`}</Text>

            <TouchableOpacity onPress={() => handleDeleteWorkout(item.id)}>
                <Image
                    source={require('../../assets/image/delete-icon.png')} // 🔥 your delete icon
                    style={styles.deleteIcon}
                    resizeMode='center'
                />
            </TouchableOpacity>
        </View>
    );
    const [date, setDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [startTime, setStartTime] = useState<Date | null>(null);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);

    const [endTime, setEndTime] = useState<Date | null>(null);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);

    const onChangeDate = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDate(selectedDate);
            setDateError('');
            setAvailabilityError('');
        }
    };

    const onChangeStartTime = (event: any, selectedTime?: Date) => {
        setShowStartTimePicker(Platform.OS === 'ios');
        if (selectedTime) {
            setStartTime(selectedTime);
            setStartTimeError('');
            setAvailabilityError('');

            if (endTime && endTime > selectedTime) {
                setEndTimeError('');
            }
        }
    };

    const onChangeEndTime = (event: any, selectedTime?: Date) => {
        setShowEndTimePicker(Platform.OS === 'ios');
        if (selectedTime) {
            setEndTime(selectedTime);

            if (startTime && selectedTime <= startTime) {
                setEndTimeError('End time must be later than start time.');
            } else {
                setEndTimeError('');
                setAvailabilityError('');
            }
        }
    };


    const addExercise = () => {
        setExercises([
            ...exercises,
            { id: Date.now(), name: '', sets: '', reps: '' },
        ]);
    };

    const deleteExercise = (id: number) => {
        setExercises(exercises.filter(item => item.id !== id));
    };

    const updateField = (id: number, field: string, value: string) => {
        if (exerciseErrors[id]) {
            setExerciseErrors(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }

        setWorkoutError('');

        setExercises(prev =>
            prev.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const [dayEntries, setDayEntries] = useState([{ id: Date.now(), value: '' }]);

    const addDayEntry = () => {
        setDayEntries(prev => [...prev, { id: Date.now() + prev.length, value: '' }]);
    };

    const updateDayEntry = (id: number, value: string) => {
        if (dayErrors[id]) {
            setDayErrors(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }

        setWorkoutError('');

        setDayEntries(prev => prev.map(day => (day.id === id ? { ...day, value } : day)));
    };

    const deleteDayEntry = (id: number) => {
        setDayEntries(prev => (prev.length > 1 ? prev.filter(day => day.id !== id) : prev));
    };

    const [workoutError, setWorkoutError] = useState('');
    const [availabilityError, setAvailabilityError] = useState('');
    const [planNameError, setPlanNameError] = useState('');
    const [notesError, setNotesError] = useState('');
    const [dayErrors, setDayErrors] = useState<Record<number, string>>({});
    const [exerciseErrors, setExerciseErrors] = useState<Record<number, string>>({});
    const [dateError, setDateError] = useState('');
    const [startTimeError, setStartTimeError] = useState('');
    const [endTimeError, setEndTimeError] = useState('');
    const [sessionNameError, setSessionNameError] = useState('');

    const handleSubmitWorkout = () => {
        let hasError = false;
        const nextDayErrors: Record<number, string> = {};
        const nextExerciseErrors: Record<number, string> = {};

        setPlanNameError('');
        setNotesError('');
        setDayErrors({});
        setExerciseErrors({});

        if (!planName.trim()) {
            setPlanNameError('Plan name is required.');
            hasError = true;
        }

        dayEntries.forEach(day => {
            if (!day.value.trim()) {
                nextDayErrors[day.id] = 'Day name is required.';
                hasError = true;
            }
        });

        exercises.forEach(ex => {
            if (!ex.name.trim() || !ex.sets.trim() || !ex.reps.trim()) {
                nextExerciseErrors[ex.id] = 'Exercise name, sets and reps are required.';
                hasError = true;
                return;
            }

            if (!/^\d+$/.test(ex.sets) || !/^\d+$/.test(ex.reps) || Number(ex.sets) <= 0 || Number(ex.reps) <= 0) {
                nextExerciseErrors[ex.id] = 'Sets/Reps must be positive numbers.';
                hasError = true;
            }
        });

        if (!text.trim()) {
            setNotesError('Notes are required.');
            hasError = true;
        }

        if (wordCount > maxWords) {
            setNotesError(`Maximum ${maxWords} words allowed.`);
            hasError = true;
        }

        setDayErrors(nextDayErrors);
        setExerciseErrors(nextExerciseErrors);

        if (hasError) {
            setWorkoutError('Please fix highlighted workout fields.');
            return;
        }

        setWorkoutError('');

        const workout = {
            id: Date.now(),
            title: planName.trim(),
            days: dayEntries.map(day => day.value.trim()),
            exercises,
            notes: text.trim(),
        };

        dispatch(addWorkout(workout));

        // reset form
        setPlanName('');
        setDayEntries([{ id: Date.now(), value: '' }]);
        setExercises([{ id: Date.now(), name: '', sets: '', reps: '' }]);
        setText('');
        setPlanNameError('');
        setNotesError('');
        setDayErrors({});
        setExerciseErrors({});
        setShowWorkoutForm(false);
    };
    const [sessionName, setSessionName] = useState<string>('');
    const [isRepeat, setIsRepeat] = useState<boolean>(false);
    const [slotCreated, setSlotCreated] = useState(false);

    const handleCreateSlot = () => {
        setDateError('');
        setStartTimeError('');
        setEndTimeError('');
        setSessionNameError('');

        let hasError = false;

        if (!date) {
            setDateError('Date is required.');
            hasError = true;
        }

        if (!startTime) {
            setStartTimeError('Start time is required.');
            hasError = true;
        }

        if (!endTime) {
            setEndTimeError('End time is required.');
            hasError = true;
        }

        if (startTime && endTime && endTime <= startTime) {
            setEndTimeError('End time must be later than start time.');
            hasError = true;
        }

        if (!sessionName.trim()) {
            setSessionNameError('Session name is required.');
            hasError = true;
        }

        if (hasError) {
            setAvailabilityError('Please fix highlighted availability fields.');
            return;
        }

        const selectedDate = date as Date;
        const selectedStartTime = startTime as Date;
        const selectedEndTime = endTime as Date;

        setAvailabilityError('');

        const slot = {
            id: Date.now(),
            date: selectedDate.toISOString(),
            startTime: selectedStartTime.toISOString(),
            endTime: selectedEndTime.toISOString(),
            sessionName: sessionName.trim(),
            repeat: isRepeat,
        };

        dispatch(addSlot(slot));
        setSessionName('');
        setDate(null);
        setStartTime(null);
        setEndTime(null);
        setIsRepeat(false);
        setDateError('');
        setStartTimeError('');
        setEndTimeError('');
        setSessionNameError('');
        setSlotCreated(true);
        setTimeout(() => setSlotCreated(false), 3000);
    };
    const slots = useSelector((state: RootState) => state.availability.slots);
    const [planName, setPlanName] = useState<string>('');

    const handlePlanNameChange = (value: string) => {
        setPlanName(value);
        setPlanNameError('');
        setWorkoutError('');
    };

    const handleSessionNameChange = (value: string) => {
        setSessionName(value);
        setSessionNameError('');
        setAvailabilityError('');
    };

    const [exercises, setExercises] = useState<Exercise[]>([
        { id: Date.now(), name: '', sets: '', reps: '' },
    ]);
    const keyboardVerticalOffset = Platform.OS === 'ios' ? 110 : 0;
    const [text, setText] = useState('');
    const maxWords = 50;

    const wordCount = text.trim().length === 0
        ? 0
        : text.trim().split(/\s+/).length;

    const remaining = maxWords - wordCount;

    const handleNotesChange = (value: string) => {
        const words = value.trim().length === 0 ? [] : value.trim().split(/\s+/);

        if (words.length <= maxWords) {
            setText(value);
            setNotesError('');
            setWorkoutError('');
            return;
        }

        setText(words.slice(0, maxWords).join(' '));
        setNotesError(`Maximum ${maxWords} words allowed.`);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity>
                    <Image source={require('../../assets/image/menu-icon.png')} style={styles.icon} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Workout Management</Text>

                <View style={styles.headerRight}>
                    <Image source={require('../../assets/image/refresh-icon.png')} style={styles.icon} />
                    <Image source={require('../../assets/image/back-icon-1.png')} style={[styles.icon, { marginLeft: 10 }]} />
                </View>
            </View>

            {/* TABS */}
            <View
                style={styles.tabs}
            >
                {(['Workout', 'Client', 'Availability', 'Book Slots'] as const).map(tab => (
                    <TouchableOpacity key={tab} style={styles.tabItem} onPress={() => setActiveTab(tab)}>
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab}
                        </Text>
                        {activeTab === tab && <View style={styles.underline} />}
                    </TouchableOpacity>
                ))}
            </View>

            {/* CONTENT */}
            <KeyboardAvoidingView
                style={styles.contentContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={keyboardVerticalOffset}
            >
                {activeTab === 'Workout' && (
                    !showWorkoutForm ? (
                        <View style={styles.workoutListContainer}>
                            <FlatList
                                data={workouts}
                                keyExtractor={item => item.id.toString()}
                                renderItem={renderItem}
                                style={styles.workoutList}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode="on-drag"
                                contentContainerStyle={styles.workoutListContent}
                                ListHeaderComponent={(
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionTitle}>Custom Workout Plans</Text>
                                    </View>
                                )}
                            />

                            <TouchableOpacity
                                style={styles.faba}
                                onPress={() => {
                                    setWorkoutError('');
                                    setShowWorkoutForm(true);
                                }}
                            >
                                <Image
                                    source={require('../../assets/image/plus-icon.png')}
                                    style={styles.plusIcon}
                                />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // 🔥 WORKOUT FORM UI (like your image)
                        <ScrollView
                            style={styles.tabScroll}
                            contentContainerStyle={styles.workoutFormContent}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                            automaticallyAdjustKeyboardInsets
                            showsVerticalScrollIndicator={false}
                        >

                            <Text style={styles.sectionTitleBook}>Add Workout Plan</Text>

                            {/* Plan Name */}
                            <TextInput
                                style={[styles.itemInput, planNameError ? styles.itemInputError : null]}
                                placeholder="Workout plan name"
                                value={planName}
                                onChangeText={handlePlanNameChange}
                            />
                            {planNameError ? <Text style={styles.fieldErrorText}>{planNameError}</Text> : null}

                            {workoutError ? (
                                <View style={styles.errorBanner}>
                                    <Text style={styles.errorText}>{workoutError}</Text>
                                </View>
                            ) : null}

                            {/* Day Button */}
                            {dayEntries.map((day, index) => (
                                <View key={day.id} style={{ flexDirection: 'row', marginTop: 10, gap: 10 }}>
                                    <View style={{
                                        backgroundColor: '#28A745',
                                        padding: 10, borderTopLeftRadius: 25, borderBottomLeftRadius: 25,
                                        width: 80,
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Text style={{ color: '#fff', fontFamily: 'Poppins-Medium' }}>{`Day ${index + 1}`}</Text>
                                    </View>
                                    <TextInput
                                        style={[styles.itemInput, { width: '60%' }, dayErrors[day.id] ? styles.itemInputError : null]}
                                        placeholder="Day name"
                                        value={day.value}
                                        onChangeText={(val) => updateDayEntry(day.id, val)}
                                    />
                                    <TouchableOpacity
                                        style={{
                                            padding: 10,
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        onPress={() => deleteDayEntry(day.id)}
                                    >
                                        <Image
                                            source={require('../../assets/image/delete-icon.png')}
                                            style={{ width: 20, height: 20, tintColor: dayEntries.length === 1 ? '#C4C4C4' : 'red' }}
                                            resizeMode='center'
                                        />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {Object.values(dayErrors).length > 0 ? <Text style={styles.fieldErrorText}>Each day name is required.</Text> : null}

                            {/* Add Day Button */}
                            <TouchableOpacity style={styles.addBtn} onPress={addDayEntry}>
                                <Text style={{ color: '#fff', fontSize: 22 }}>+</Text>
                            </TouchableOpacity>

                            {/* Exercise Row */}
                            <View style={{ padding: 15 }}>
                                {exercises.map((item, index) => (
                                    <View key={item.id} style={styles.card}>
                                        <View style={styles.row}>

                                            <TextInput
                                                style={[styles.titleInput, exerciseErrors[item.id] ? styles.itemInputError : null]}
                                                value={item.name}
                                                onChangeText={(val) => updateField(item.id, 'name', val)}
                                                placeholder="Exercise Name"
                                            />

                                            {/* Sets */}
                                            <View style={styles.inputBox}>
                                                {index === 0 && <Text style={styles.label}>Sets</Text>}
                                                <TextInput
                                                    style={[styles.input, exerciseErrors[item.id] ? styles.itemInputError : null]}
                                                    value={item.sets}
                                                    onChangeText={(val) => updateField(item.id, 'sets', val)}
                                                    placeholder="3"
                                                    keyboardType="numeric"
                                                />
                                            </View>

                                            {/* Reps */}
                                            <View style={styles.inputBox}>
                                                {index === 0 && <Text style={styles.label}>Reps</Text>}
                                                <TextInput
                                                    style={[styles.input, exerciseErrors[item.id] ? styles.itemInputError : null]}
                                                    value={item.reps}
                                                    onChangeText={(val) => updateField(item.id, 'reps', val)}
                                                    placeholder="10"
                                                    keyboardType="numeric"
                                                />
                                            </View>
                                            {/* Delete */}
                                            <TouchableOpacity style={{ marginTop: 10 }} onPress={() => deleteExercise(item.id)}>
                                                <Image
                                                    source={require('../../assets/image/delete-icon.png')}
                                                    style={styles.deleteIcon}
                                                    resizeMode="center"
                                                />
                                            </TouchableOpacity>

                                        </View>
                                        {exerciseErrors[item.id] ? <Text style={styles.fieldErrorText}>{exerciseErrors[item.id]}</Text> : null}
                                    </View>
                                ))}

                                {/* Add Button */}
                                <TouchableOpacity style={styles.addBtn} onPress={addExercise}>
                                    <Text style={{ color: '#fff', fontSize: 22 }}>+</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.containerbox}>
                                <View style={styles.box}>
                                    <TextInput
                                        value={text}
                                        onChangeText={handleNotesChange}
                                        placeholder="Bench Press: www.benchpress.com
Eat Oats"
                                        placeholderTextColor="#999"
                                        multiline
                                        style={[styles.inputbox, notesError ? styles.itemInputError : null]}
                                    />

                                    <Text style={styles.counter}>
                                        {remaining} words remaining
                                    </Text>
                                </View>
                                {notesError ? <Text style={styles.fieldErrorText}>{notesError}</Text> : null}
                            </View>
                            {/* Submit */}
                            <TouchableOpacity style={{
                                marginTop: 30,
                                backgroundColor: '#28A745',
                                padding: 15,
                                borderRadius: 10,
                                alignItems: 'center'
                            }} onPress={handleSubmitWorkout}>
                                <Text style={{ color: '#fff', fontFamily: 'Poppins-Regular' }}>Submit</Text>
                            </TouchableOpacity>

                            {/* Back Button */}
                            <TouchableOpacity
                                onPress={() => setShowWorkoutForm(false)}
                                style={{ marginTop: 15, alignItems: 'center' }}
                            >
                                <Text style={{ color: 'red', fontFamily: 'Poppins-Regular' }}>Cancel</Text>
                            </TouchableOpacity>

                        </ScrollView>
                    )
                )}
                {activeTab === 'Availability' && (
                    <ScrollView
                        style={styles.tabScroll}
                        contentContainerStyle={styles.availabilityContent}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        automaticallyAdjustKeyboardInsets
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.sectionTitleBook}>Set Availability</Text>



                        {/* Date Picker */}
                        <View style={{ width: '100%', paddingHorizontal: 15, marginTop: 10 }}>
                            <Text style={styles.sectionTitle}>Date*</Text>

                            <TouchableOpacity
                                onPress={() => setShowDatePicker(true)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: dateError ? '#DC2626' : '#ccc',
                                    borderRadius: 10,
                                    paddingHorizontal: 10,
                                    height: 45,
                                    backgroundColor: '#fff'
                                }}
                            >
                                <Text style={{ flex: 1, color: '#333' }}>
                                    {date ? date.toLocaleDateString() : 'Select Date'}
                                </Text>
                                <Image
                                    source={require('../../assets/image/calender-icon.png')} // 🔥 your calendar icon
                                    style={{ width: 20, height: 20, tintColor: '#333' }}
                                    resizeMode="contain"
                                />
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={date ?? new Date()}
                                    mode="date"
                                    display="calendar"
                                    onChange={onChangeDate}
                                />
                            )}
                            {dateError ? <Text style={styles.fieldErrorText}>{dateError}</Text> : null}
                        </View>

                        {/* Start & End Time Picker */}
                        <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, marginTop: 10, marginBottom: 20 }}>

                            <View style={{ width: '48%' }}>
                                <Text style={styles.sectionTitle}>Start Time*</Text>
                                <TouchableOpacity onPress={() => setShowStartTimePicker(true)}>
                                    <TextInput
                                        style={[styles.itemInput, startTimeError ? styles.itemInputError : null]}
                                        placeholder='Select Start Time'
                                        value={startTime ? startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        editable={false}
                                    />
                                </TouchableOpacity>
                                {showStartTimePicker && (
                                    <DateTimePicker
                                        value={startTime ?? new Date()}
                                        mode="time"
                                        display="spinner"
                                        onChange={onChangeStartTime}
                                    />
                                )}
                                {startTimeError ? <Text style={styles.fieldErrorText}>{startTimeError}</Text> : null}
                            </View>

                            <View style={{ width: '48%' }}>
                                <Text style={styles.sectionTitle}>End Time*</Text>
                                <TouchableOpacity onPress={() => setShowEndTimePicker(true)}>
                                    <TextInput
                                        style={[styles.itemInput, endTimeError ? styles.itemInputError : null]}
                                        placeholder='Select End Time'
                                        value={endTime ? endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        editable={false}
                                    />
                                </TouchableOpacity>
                                {showEndTimePicker && (
                                    <DateTimePicker
                                        value={endTime ?? new Date()}
                                        mode="time"
                                        display="spinner"
                                        onChange={onChangeEndTime}
                                    />
                                )}
                                {endTimeError ? <Text style={styles.fieldErrorText}>{endTimeError}</Text> : null}
                            </View>
                        </View>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%',
                            paddingHorizontal: 15, marginBottom: 20
                        }}>
                            <Text style={styles.sectionTitleBookAvailibility}>Repeat Sessions</Text>
                            <CustomToggle value={isRepeat} onValueChange={setIsRepeat} />
                        </View>

                        {/* Mini Calendar */}
                        <MiniCalendar selectedDate={date ?? undefined} />

                        {/* Session Name */}
                        <View style={{ width: '100%', paddingHorizontal: 15, marginTop: 10 }}>
                            <Text style={styles.sectionTitle}>Session Name*</Text>
                            <TextInput style={[styles.itemInput, sessionNameError ? styles.itemInputError : null]}
                                placeholder="Session name..."
                                value={sessionName}
                                onChangeText={handleSessionNameChange} />
                            {sessionNameError ? <Text style={styles.fieldErrorText}>{sessionNameError}</Text> : null}
                        </View>
                        {availabilityError ? (
                            <View style={styles.errorBanner}>
                                <Text style={styles.errorText}>{availabilityError}</Text>
                            </View>
                        ) : null}
                        {slotCreated && (
                            <View style={styles.successBanner}>
                                <Text style={styles.successText}>✓ Availability slot created successfully!</Text>
                            </View>
                        )}
                        <TouchableOpacity style={{
                            marginTop: 30,
                            backgroundColor: '#28A745',
                            paddingVertical: 12,
                            borderRadius: 10,
                            alignItems: 'center',
                        }} onPress={handleCreateSlot}   >
                            <Text style={{ color: '#fff', fontFamily: 'Poppins-SemiBold', paddingHorizontal: 60 }}>Create</Text>
                        </TouchableOpacity>
                    </ScrollView>
                )}
                {activeTab === 'Book Slots' && (
                    <ScrollView
                        style={styles.tabScroll}
                        contentContainerStyle={styles.bookSlotsContent}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        automaticallyAdjustKeyboardInsets
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.sectionTitleBook}>Book Client Slots</Text>
                        <MiniCalendar selectedDate={date ?? undefined} />
                        <Text style={styles.sectionTitleBooka}>Available Slots:
                        </Text>

                        <View style={{ width: '100%', paddingHorizontal: 15, borderRadius: 10 }}>
                            <View style={{ width: '100%', paddingHorizontal: 5 }}>
                                {slots.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyStateText}>No slots exist yet.</Text>
                                        <Text style={styles.emptyStateSubText}>Go to Availability tab to create a slot.</Text>
                                    </View>
                                ) : slots.map((item) => (
                                    <View
                                        key={item.id}
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center', marginTop: 3
                                        }}
                                    >
                                        <TextInput
                                            style={[styles.itemInput, { width: '50%' }]}
                                            value={`${new Date(item.startTime).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })} - ${new Date(item.endTime).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}`}
                                            editable={false}
                                        />

                                        <View
                                            style={{
                                                width: 98,
                                                height: 38,
                                                backgroundColor: '#CBF9D7',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Text style={{ color: '#10B981', fontFamily: 'Poppins-SemiBold' }}>
                                                Open
                                            </Text>
                                        </View>

                                        <TouchableOpacity onPress={() => dispatch(deleteSlot(item.id))}>
                                            <Image
                                                source={require('../../assets/image/delete-icon.png')}
                                                style={styles.deleteIcon}
                                                resizeMode='center'
                                            />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Remove duplicate text if not needed */}
                    </ScrollView>
                )}
            </KeyboardAvoidingView>
        </View>

    );
};

export default GymWorkScreen;

const styles = StyleSheet.create({
    containerbox: {
        backgroundColor: '#fff',
        flex: 1,
    },
    box: {
        borderRadius: 12,
        padding: 10,
        minHeight: 180,
        justifyContent: 'space-between', borderWidth: 1, borderColor: '#D9D9D9'
    },
    inputbox: {
        fontSize: 15,
        color: '#666',
        lineHeight: 32,
        textAlignVertical: 'top', // important for multiline
        fontFamily: 'Poppins-Regular',
    },
    counter: {
        textAlign: 'right',
        color: '#FF9933',
        fontSize: 12,
        fontWeight: '500', fontFamily: 'Poppins-Regular',
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        height: 90,
        backgroundColor: '#28A745',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15, paddingTop: 30
    },

    headerTitle: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
    },

    icon: {
        width: 20,
        height: 20,
        tintColor: '#fff',
        resizeMode: 'contain',
    },

    headerRight: {
        flexDirection: 'row',
        alignItems: 'center', gap: 10
    },

    tabs: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 5,
        marginTop: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0', height: 48,  // slight increase for safe tap area
        alignItems: 'center',
    },
    contentContainer: {
        flex: 1,
        minHeight: 0,
    },
    tabScroll: {
        flex: 1,
        width: '100%',
    },

    tabItem: {
        alignItems: 'center',
        paddingVertical: 12,
        marginRight: 30,
    },

    tabText: {
        fontFamily: 'Poppins-SemiBold',
        color: '#6B7280',
    }, card: {
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingVertical: 15,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        flex: 1,
        fontFamily: 'Poppins-Medium',
        fontSize: 14,
    },
    inputBox: {
        alignItems: 'center',
        marginHorizontal: 5,
    },
    label: {
        fontSize: 12,
        marginBottom: 5,
        fontFamily: 'Poppins-Medium',
    },
    input: {
        width: 50,
        height: 40,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 6,
        textAlign: 'center',        // ✅ horizontal center
        textAlignVertical: 'center' // ✅ vertical center (Android)
    }, titleInput: {
        flex: 1,
        fontFamily: 'Poppins-Medium',
        fontSize: 14,
        color: '#333',
        paddingVertical: 6,
        marginTop: 0,
        minHeight: 40,
    },
    deleteIcon: {
        width: 20,
        height: 20,
        tintColor: 'red',
        marginLeft: 10,
    },
    addBtn: {
        marginTop: 20,
        alignSelf: 'center',
        backgroundColor: '#28A745',
        width: 30,
        height: 30,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },

    activeTabText: {
        color: '#28A745',
    },

    underline: {
        position: 'absolute',
        bottom: -1,          // overlaps the container's bottom border
        left: 0,
        right: 0,
        height: 3,
        borderRadius: 2,
        backgroundColor: '#28A745'
    },

    // remove activeTab style entirely

    sectionHeader: {
        backgroundColor: '#F6F6F8',
        margin: 10,
        padding: 12,
        borderRadius: 10,

        // Shadow
        elevation: 3,                          // Android
        shadowColor: '#737373',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 3, marginTop: 50
    },
    sectionTitle: {
        fontFamily: 'Poppins-SemiBold',
        color: '#333',
    },
    sectionTitleBook: {
        fontFamily: 'Poppins-SemiBold',
        color: '#333', fontSize: 18, marginBottom: 20, marginTop: 50
    },
    sectionTitleBooka: {
        fontFamily: 'Poppins-SemiBold',
        color: '#333', fontSize: 18, margin: 20, textAlign: 'left', alignSelf: 'flex-start'
    },
    sectionTitleBookAvailibility: {
        fontFamily: 'Poppins-Medium',
        color: '#333', fontSize: 18,
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#D1D5DB',
        marginHorizontal: 10
    },
    workoutListContainer: {
        flex: 1,
        width: '100%',
    },
    workoutList: {
        flex: 1,
    },
    workoutListContent: {
        paddingTop: 12,
        paddingBottom: 24,
    },
    workoutFormContent: {
        padding: 15,
        paddingBottom: 140,
    },
    availabilityContent: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingVertical: 8,
        paddingBottom: 140,
    },
    bookSlotsContent: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingVertical: 8,
        paddingBottom: 120,
    },

    itemText: {
        fontFamily: 'Poppins-Regular',
        color: '#333',
    },
    itemInput: {
        borderWidth: 1, borderColor: '#28A745', borderRadius: 8, padding: 10, width: '100%', fontFamily: 'Poppins-Regular',
        color: '#333',
    },
    itemInputError: {
        borderColor: '#DC2626',
    },
    fieldErrorText: {
        color: '#DC2626',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        marginTop: 4,
    },

    fab: {
        position: 'absolute',
        right: 20,
        bottom: 24,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#28A745',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    faba: {
        position: 'absolute',
        bottom: 24,

        left: '50%',
        transform: [{ translateX: -25 }], // center perfectly

        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },

    plusIcon: {
        width: 38,
        height: 38,
    },
    errorBanner: {
        width: '100%',
        backgroundColor: '#FEE2E2',
        borderLeftWidth: 4,
        borderLeftColor: '#DC2626',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginTop: 12,
    },
    errorText: {
        fontFamily: 'Poppins-Medium',
        color: '#991B1B',
        fontSize: 13,
    },
    successBanner: {
        width: '100%',
        backgroundColor: '#D1FAE5',
        borderLeftWidth: 4,
        borderLeftColor: '#28A745',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 15,
        marginBottom: 15, marginHorizontal: 15
    },
    successText: {
        fontFamily: 'Poppins-SemiBold',
        color: '#065F46',
        fontSize: 14,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        fontFamily: 'Poppins-SemiBold',
        color: '#6B7280',
        fontSize: 16,
    },
    emptyStateSubText: {
        fontFamily: 'Poppins-Regular',
        color: '#9CA3AF',
        fontSize: 13,
        marginTop: 6,
        textAlign: 'center',
    },
});