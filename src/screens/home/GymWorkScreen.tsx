import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    Image,
    StatusBar,
    TextInput,
    Platform,
    ScrollView,
} from 'react-native';
import MiniCalendar from '../components/MiniCalendar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Switch } from 'react-native';
import CustomToggle from '../components/CustomToggle';
interface Workout {
    id: string;
    title: string;
}

const GymWorkScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'Workout' | 'Client' | 'Availability' | 'Book Slots'>('Workout');
    // state
    const [showWorkoutForm, setShowWorkoutForm] = useState(false);
    const [workouts, setWorkouts] = useState<Workout[]>([
        { id: '1', title: "Beginner's Workout - 3 Days" },
        { id: '2', title: "Beginner's Full Body - 1 Day" },
    ]);

    const handleDelete = (id: string) => {
        setWorkouts(prev => prev.filter(item => item.id !== id));
    };

    const renderItem = ({ item }: { item: Workout }) => (
        <View style={styles.item}>
            <Text style={styles.itemText}>{item.title}</Text>

            <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Image
                    source={require('../../assets/image/delete-icon.png')} // 🔥 your delete icon
                    style={styles.deleteIcon}
                    resizeMode='center'
                />
            </TouchableOpacity>
        </View>
    );
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [startTime, setStartTime] = useState(new Date());
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);

    const [endTime, setEndTime] = useState(new Date());
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);

    const onChangeDate = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) setDate(selectedDate);
    };

    const onChangeStartTime = (event: any, selectedTime?: Date) => {
        setShowStartTimePicker(Platform.OS === 'ios');
        if (selectedTime) setStartTime(selectedTime);
    };

    const onChangeEndTime = (event: any, selectedTime?: Date) => {
        setShowEndTimePicker(Platform.OS === 'ios');
        if (selectedTime) setEndTime(selectedTime);
    };
    const [exercises, setExercises] = useState([
        { id: Date.now(), name: 'Bench Press', sets: '', reps: '', weight: '' },
    ]);

    const addExercise = () => {
        setExercises([
            ...exercises,
            { id: Date.now(), name: 'Bench Press', sets: '', reps: '', weight: '' },
        ]);
    };

    const deleteExercise = (id) => {
        setExercises(exercises.filter(item => item.id !== id));
    };

    const updateField = (id, field, value) => {
        setExercises(prev =>
            prev.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };
    return (
        <SafeAreaProvider style={styles.container}>

            {/* HEADER */}
            <StatusBar barStyle="light-content"
                backgroundColor="#a71313" />
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
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabs}
            >
                {(['Workout', 'Client', 'Availability', 'Book Slots'] as const).map(tab => (
                    <TouchableOpacity key={tab} style={styles.tabItem} onPress={() => setActiveTab(tab)}>
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab}
                        </Text>
                        {activeTab === tab && <View style={styles.underline} />}
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* CONTENT */}
            {activeTab === 'Workout' && (
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: 'flex-start',
                        paddingVertical: 20, width: '100%',
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    {!showWorkoutForm ? (
                        <View style={styles.workoutListContainer}>
                            <FlatList
                                data={workouts}
                                keyExtractor={item => item.id}
                                renderItem={renderItem}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.workoutListContent}
                                ListHeaderComponent={(
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionTitle}>Custom Workout Plans</Text>
                                    </View>
                                )}
                            />

                            <TouchableOpacity
                                style={styles.faba}
                                onPress={() => setShowWorkoutForm(true)}
                            >
                                <Image
                                    source={require('../../assets/image/plus-icon.png')}
                                    style={styles.plusIcon}
                                />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // 🔥 WORKOUT FORM UI (like your image)
                        <ScrollView style={{ flex: 1, padding: 15 }}>

                            <Text style={styles.sectionTitleBook}>Add Workout Plan</Text>

                            {/* Plan Name */}
                            <TextInput
                                style={styles.itemInput}
                                placeholder="Beginner's Workout - 3 days"
                            />

                            {/* Day Button */}
                            <View style={{ flexDirection: 'row', marginTop: 10, gap: 10 }}>
                                <TouchableOpacity style={{
                                    backgroundColor: '#28A745',
                                    padding: 10, borderTopLeftRadius: 25, borderBottomLeftRadius: 25,
                                    width: 80,
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Text style={{ color: '#fff', fontFamily: 'Poppins-Medium' }}>Day 1</Text>
                                </TouchableOpacity>
                                <TextInput style={[styles.itemInput, { width: '60%' }]} placeholder="3" />
                                <TouchableOpacity style={{
                                    padding: 10,
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Image
                                        source={require('../../assets/image/delete-icon.png')}
                                        style={{ width: 20, height: 20, tintColor: 'red' }}
                                        resizeMode='center'
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Exercise Row */}
                            <View style={{ padding: 15 }}>
                                {exercises.map((item, index) => (
                                    <View key={item.id} style={styles.card}>
                                        <View style={styles.row}>

                                            <TextInput
                                                style={styles.titleInput}
                                                value={item.name}
                                                onChangeText={(val) => updateField(item.id, 'name', val)}
                                                placeholder="Exercise Name"
                                            />

                                            {/* Sets */}
                                            <View style={styles.inputBox}>
                                                {index === 0 && <Text style={styles.label}>Sets</Text>}
                                                <TextInput
                                                    style={styles.input}
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
                                                    style={styles.input}
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
                                    </View>
                                ))}

                                {/* Add Button */}
                                <TouchableOpacity style={styles.addBtn} onPress={addExercise}>
                                    <Text style={{ color: '#fff', fontSize: 22 }}>+</Text>
                                </TouchableOpacity>
                            </View>
                            {/* Submit */}
                            <TouchableOpacity style={{
                                marginTop: 30,
                                backgroundColor: '#28A745',
                                padding: 15,
                                borderRadius: 10,
                                alignItems: 'center'
                            }}>
                                <Text style={{ color: '#fff' }}>Submit</Text>
                            </TouchableOpacity>

                            {/* Back Button */}
                            <TouchableOpacity
                                onPress={() => setShowWorkoutForm(false)}
                                style={{ marginTop: 15, alignItems: 'center' }}
                            >
                                <Text style={{ color: 'red' }}>Cancel</Text>
                            </TouchableOpacity>

                        </ScrollView>
                    )}
                </ScrollView>
            )}
            {activeTab === 'Availability' && (
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        paddingVertical: 20,
                    }}
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
                                borderColor: '#ccc',
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
                                value={date}
                                mode="date"
                                display="calendar"
                                onChange={onChangeDate}
                            />
                        )}
                    </View>

                    {/* Start & End Time Picker */}
                    <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, marginTop: 10, marginBottom: 20 }}>

                        <View style={{ width: '48%' }}>
                            <Text style={styles.sectionTitle}>Start Time*</Text>
                            <TouchableOpacity onPress={() => setShowStartTimePicker(true)}>
                                <TextInput
                                    style={styles.itemInput}
                                    placeholder='Select Start Time'
                                    value={startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    editable={false}
                                />
                            </TouchableOpacity>
                            {showStartTimePicker && (
                                <DateTimePicker
                                    value={startTime}
                                    mode="time"
                                    display="spinner"
                                    onChange={onChangeStartTime}
                                />
                            )}
                        </View>

                        <View style={{ width: '48%' }}>
                            <Text style={styles.sectionTitle}>End Time*</Text>
                            <TouchableOpacity onPress={() => setShowEndTimePicker(true)}>
                                <TextInput
                                    style={styles.itemInput}
                                    placeholder='Select End Time'
                                    value={endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    editable={false}
                                />
                            </TouchableOpacity>
                            {showEndTimePicker && (
                                <DateTimePicker
                                    value={endTime}
                                    mode="time"
                                    display="spinner"
                                    onChange={onChangeEndTime}
                                />
                            )}
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
                        <CustomToggle />
                    </View>

                    {/* Mini Calendar */}
                    <MiniCalendar />

                    {/* Session Name */}
                    <View style={{ width: '100%', paddingHorizontal: 15, marginTop: 10 }}>
                        <Text style={styles.sectionTitle}>Session Name*</Text>
                        <TextInput style={styles.itemInput} placeholder='Session name...' />
                    </View>
                    <TouchableOpacity style={{
                        marginTop: 30,
                        backgroundColor: '#28A745',
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                    }}>
                        <Text style={{ color: '#fff', fontFamily: 'Poppins-SemiBold', paddingHorizontal: 60 }}>Create</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}
            {activeTab === 'Book Slots' && (
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        alignItems: 'center',         // horizontal centering
                        justifyContent: 'flex-start', // top alignment
                        paddingVertical: 20,    // spacing from top
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.sectionTitleBook}>Book Client Slots</Text>
                    <MiniCalendar />
                    <Text style={styles.sectionTitleBooka}>Available Slots:
                    </Text>

                    <View style={{ width: '100%', paddingHorizontal: 15, borderRadius: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <TextInput style={[styles.itemInput, { width: '50%' }]} placeholder='10:00 AM - 11:00 AM' readOnly />
                            <View style={{ width: 98, height: 38, backgroundColor: '#CBF9D7', borderRadius: 0, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#10B981', fontFamily: 'Poppins-SemiBold' }}>Open</Text>
                            </View>
                            <TouchableOpacity>
                                <View style={{ borderRadius: 0, alignItems: 'center', justifyContent: 'center' }}>
                                    <Image
                                        source={require('../../assets/image/delete-icon.png')} // 🔥 your delete icon
                                        style={styles.deleteIcon}
                                        resizeMode='center'
                                    />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={{ width: '100%', paddingHorizontal: 15, borderRadius: 10, marginTop: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <TextInput style={[styles.itemInput, { width: '50%' }]} placeholder='10:00 AM - 11:00 AM' readOnly />
                            <View style={{ width: 98, height: 38, backgroundColor: '#CBF9D7', borderRadius: 0, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#10B981', fontFamily: 'Poppins-SemiBold' }}>Open</Text>
                            </View>
                            <TouchableOpacity>
                                <View style={{ borderRadius: 0, alignItems: 'center', justifyContent: 'center' }}>
                                    <Image
                                        source={require('../../assets/image/delete-icon.png')} // 🔥 your delete icon
                                        style={styles.deleteIcon}
                                        resizeMode='center'
                                    />
                                </View>
                            </TouchableOpacity>
                        </View>

                    </View>
                    {/* Remove duplicate text if not needed */}
                </ScrollView>
            )}

        </SafeAreaProvider>

    );
};

export default GymWorkScreen;

const styles = StyleSheet.create({
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
        paddingHorizontal: 15,
        marginTop: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0', height: 45
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
        paddingVertical: 2, marginTop: 30
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
        shadowRadius: 3,
    },
    sectionTitle: {
        fontFamily: 'Poppins-SemiBold',
        color: '#333',
    },
    sectionTitleBook: {
        fontFamily: 'Poppins-SemiBold',
        color: '#333', fontSize: 18, marginBottom: 20,
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
    },
    workoutListContent: {
        paddingTop: 20,
        paddingBottom: 100,
    },

    itemText: {
        fontFamily: 'Poppins-Regular',
        color: '#333',
    },
    itemInput: {
        borderWidth: 1, borderColor: '#28A745', borderRadius: 8, padding: 10, width: '100%', fontFamily: 'Poppins-Regular',
        color: '#333',
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
});