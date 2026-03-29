import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getCalendarCells(year: number, month: number): (number | null)[] {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
}

const SimpleCalendar = () => {
    const today = new Date();

    // ✅ state for current view
    const [currentDate, setCurrentDate] = useState(today);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const todayDate = today.getDate();

    const cells = getCalendarCells(year, month);

    // ✅ go to previous month
    const goToPrevMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    // ✅ go to next month
    const goToNextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    return (
        <View style={styles.container}>

            {/* Header */}
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={goToPrevMonth}>
                    <Text style={styles.arrow}>{'‹'}</Text>
                </TouchableOpacity>

                <Text style={styles.title}>
                    {MONTH_NAMES[month]} {year}
                </Text>

                <TouchableOpacity onPress={goToNextMonth}>
                    <Text style={styles.arrow}>{'›'}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Day labels */}
            <View style={styles.row}>
                {DAY_LABELS.map((d, i) => (
                    <View key={i} style={styles.cell}>
                        <Text style={styles.dayLabel}>{d}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.divider} />

            {/* Dates */}
            {Array.from({ length: cells.length / 7 }).map((_, rowIdx) => (
                <View key={rowIdx} style={styles.row}>
                    {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
                        const isToday =
                            day === todayDate &&
                            month === today.getMonth() &&
                            year === today.getFullYear();

                        return (
                            <View key={colIdx} style={styles.cell}>
                                <View style={[
                                    styles.circle,
                                    isToday && styles.todayCircle
                                ]}>
                                    <Text style={[
                                        styles.dateText,
                                        isToday && styles.todayText,
                                        !day && styles.hiddenText
                                    ]}>
                                        {day ?? 0}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            ))}
        </View>
    );
};

export default SimpleCalendar;

const GREEN = '#2EA44F';

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 18,
        width: 320, borderWidth: 1, borderColor: '#D9D9D9'
    },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    arrow: {
        fontSize: 26,
        color: '#444',
        paddingHorizontal: 10,
    },

    title: {
        fontSize: 18,
        fontWeight: '600', fontFamily: 'Poppins-Medium', color: '#333',
    },

    divider: {
        height: 1,
        backgroundColor: '#737373',
        marginVertical: 10,
    },

    row: {
        flexDirection: 'row',
        marginBottom: 10,
    },

    cell: {
        flex: 1,
        alignItems: 'center',
    },

    dayLabel: {
        fontSize: 15,
        color: '#8F8F8F',
        fontWeight: '600',
        fontFamily: 'Poppins-Medium',
    },

    circle: {
        width: 42,
        height: 42,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },

    todayCircle: {
        backgroundColor: GREEN,
    },

    dateText: {
        fontSize: 18,
        color: '#737373',
        fontFamily: 'Poppins-Medium',
    },

    todayText: {
        color: '#fff',
        fontWeight: '700',
        fontFamily: 'Poppins-Medium',
    },

    hiddenText: {
        opacity: 0,
    },
});