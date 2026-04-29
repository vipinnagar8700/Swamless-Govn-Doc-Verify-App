import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, SafeAreaView, StatusBar,
    FlatList,
    Image,
    RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getServicesApi } from '../../services/servicesApi';


// ─────────────────────────────────────────────
// CATEGORY CARD
// ─────────────────────────────────────────────
const CategoryCard = ({ item, onSelect }: { item: any; onSelect: (item: any) => void }) => {
    return (
        <TouchableOpacity
            style={cat.card}
            onPress={() => onSelect(item)}
            activeOpacity={0.8}
        >
            <View style={cat.header}>
                <View style={cat.iconBox}>
                    <Image
                        style={cat.iconImage}
                        source={{ uri: item.image }}
                    />
                </View>
                <View style={cat.titleBox}>
                    <Text style={cat.title}>{item.name}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};


// ─────────────────────────────────────────────
// BUILD AI PROMPT (FULLY DYNAMIC)
// ─────────────────────────────────────────────
function inferDocs(serviceName: string, subTitle: string) {
    const text = `${serviceName} ${subTitle}`.toLowerCase();

    if (text.includes('aadhaar')) {
        return [
            'Aadhaar Card',
            'Proof of Identity',
            'Proof of Address',
            'Passport Size Photo',
        ];
    }
    if (text.includes('pan')) {
        return [
            'Aadhaar Card',
            'Existing PAN (if update/reprint)',
            'Passport Size Photo',
            'Signature Proof',
        ];
    }
    if (text.includes('passport')) {
        return [
            'Aadhaar Card',
            'Address Proof',
            'Birth Proof / DOB Proof',
            'Passport Size Photo',
        ];
    }
    if (text.includes('voter')) {
        return [
            'Aadhaar Card',
            'Address Proof',
            'Passport Size Photo',
        ];
    }
    if (text.includes('driving') || text.includes('license') || text.includes('vehicle') || text.includes('rc')) {
        return [
            'Aadhaar Card',
            'Address Proof',
            'Passport Size Photo',
            'Existing RC / DL (if update/duplicate)',
        ];
    }
    if (text.includes('gst') || text.includes('tax')) {
        return [
            'Aadhaar Card',
            'PAN Card',
            'Business Address Proof',
            'Bank Details',
        ];
    }
    if (text.includes('property') || text.includes('legal') || text.includes('company')) {
        return [
            'Aadhaar Card',
            'PAN Card',
            'Address Proof',
            'Supporting Legal Documents',
        ];
    }

    return [
        'Aadhaar Card',
        'Supporting Documents (as per selected service)',
        'Passport Size Photo',
    ];
}

function inferRequiredDetails(serviceName: string, subTitle: string) {
    const text = `${serviceName} ${subTitle}`.toLowerCase();

    const base = [
        'Full Name',
        'Date of Birth',
        'Aadhaar Number',
        'Mobile Number',
        'Email Address',
        'Flat/House No',
        'Street/Locality',
        'City',
        'State',
        'Pincode',
    ];

    if (text.includes('passport')) {
        return [...base, 'Place of Birth', 'Father/Mother Name', 'Marital Status'];
    }
    if (text.includes('pan') || text.includes('tax') || text.includes('gst')) {
        return [...base, 'PAN Number (if available)', 'Occupation/Business Type'];
    }
    if (text.includes('vehicle') || text.includes('rc') || text.includes('driving') || text.includes('license')) {
        return [...base, 'Vehicle Number (if available)', 'Existing DL/RC Number (if available)'];
    }
    if (text.includes('company') || text.includes('legal') || text.includes('property')) {
        return [...base, 'Applicant Type (Individual/Business)', 'Purpose of Service'];
    }

    return base;
}

function normalizeSubServices(serviceItem: any) {
    const rawSub = Array.isArray(serviceItem?.sub)
        ? serviceItem.sub
        : (Array.isArray(serviceItem?.subServices) ? serviceItem.subServices : []);

    return rawSub.map((s: any) => ({
        title: s?.title ?? s?.name ?? '',
        desc: s?.desc ?? s?.description ?? '',
        fee: s?.fee ?? (s?.price !== undefined ? `₹${s.price}` : '₹0'),
        time: s?.time ?? s?.processingTime ?? '',
        docs: Array.isArray(s?.docs) ? s.docs : (Array.isArray(s?.documents) ? s.documents : []),
    })).filter((s: any) => s.title);
}

function buildCategoryPrompt(catItem: any) {
    const normalizedSub = normalizeSubServices(catItem);
    const effectiveSub = normalizedSub.length
        ? normalizedSub
        : [{
            title: catItem.name,
            desc: catItem.description || `${catItem.name} service`,
            fee: '₹0',
            time: '',
            docs: inferDocs(catItem.name, catItem.name),
        }];

    const servicesList = effectiveSub.map((s: any) => s.title).join(', ');

    const serviceInfo = effectiveSub.map((s: any) => {

        const docs = s.docs?.length ? s.docs : inferDocs(catItem.name, s.title);
        const details = Array.isArray(s.details) && s.details.length
            ? s.details
            : inferRequiredDetails(catItem.name, s.title);

        const allDocs = ['Aadhaar Card (for DOB Verification)', ...docs];

        return `SERVICE: ${s.title}
DESC: ${s.desc}
FEE: ${s.fee}
TIME: ${s.time}
DOCS: ${allDocs.join(', ')}
DETAILS_REQUIRED: ${details.join(', ')}`;
    }).join('\n\n');

    return `
You are a highly strict Indian Government AI Assistant for "${catItem.name}".

━━━━━━━━━━━━━━━━━━━
AVAILABLE SERVICES
━━━━━━━━━━━━━━━━━━━
${servicesList}

━━━━━━━━━━━━━━━━━━━
INTERNAL DATA (HIDDEN)
━━━━━━━━━━━━━━━━━━━
${serviceInfo}

━━━━━━━━━━━━━━━━━━━
STRICT FLOW (MANDATORY)
━━━━━━━━━━━━━━━━━━━

STEP 1:
Say ONLY:
"Hi there! 😊 I'm your AI Assistant, here to help you with ${catItem.name}. What would you like to do today?"

WAIT.

━━━━━━━━━━━━━━━━━━━

STEP 2:
Match user intent to ONE service ONLY.

Reply:
"Got it! I'll help you with [Service Name]. [short desc]. Fee: [fee] | Processing: [time]. 😊"

Then ask:
"Please share your Full Name and Date of Birth to get started."

WAIT.

━━━━━━━━━━━━━━━━━━━

STEP 3:
After name + DOB:

Say:
"To verify your Date of Birth, please upload your Aadhaar card."

Output:
[UPLOAD: Aadhaar Card (for DOB Verification)]

WAIT.

━━━━━━━━━━━━━━━━━━━

STEP 4:
After Aadhaar verified:

Say:
"DOB verified via Aadhaar ✅"

Then:
"Now I'll need the remaining required documents."

👉 Output ALL remaining docs for selected service:

FORMAT STRICT:
[UPLOAD: Document Name]

(one per line)

WAIT until ALL uploaded.

━━━━━━━━━━━━━━━━━━━

STEP 5:
After docs:

Read DETAILS_REQUIRED for the selected service and ensure all details are collected.

Say:
"Great! All your documents are verified. Now I need your remaining details."

Ask clearly for all missing fields from DETAILS_REQUIRED.

Output:
[SHOW_FORM]

Use strict format with explicit fields only:
[SHOW_FORM: full name, date of birth, aadhaar number, phone number, email, flat no, street, city, state, pincode]

If only some fields are missing, include ONLY missing fields in the tag.

WAIT.

━━━━━━━━━━━━━━━━━━━

STEP 6:
After form:

Extract numeric fee.

Output:
[SHOW_PAYMENT: amount]

━━━━━━━━━━━━━━━━━━━

STEP 7:
After payment:

Output:
[APPLICATION_COMPLETE]

━━━━━━━━━━━━━━━━━━━

STRICT RULES:

- NEVER show all services list
- ALWAYS pick closest service
- NEVER skip steps
- NEVER ask docs before Aadhaar
- NEVER include Aadhaar again in STEP 4
- ALWAYS collect ALL fields listed in DETAILS_REQUIRED before payment
- ALWAYS output SHOW_FORM with explicit field names inside tag
- ALWAYS output exact tags
- Keep replies SHORT
- Use 😊
- English only
`;
}


// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
const HomeScreen = () => {
    const navigation = useNavigation();

    const [search, setSearch] = useState('');
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    console.log(services, "services")

    const fetchServices = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const res = await getServicesApi();

            const formatted = res?.data?.services?.map((item: any) => ({
                ...item,
                title: item.name,
                sub: normalizeSubServices(item),
            })) || [];

            setServices(formatted);
            console.log('[HomeScreen] services fetched:', formatted.length);

        } catch (err) {
            console.log("Error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // ✅ FETCH FROM API
    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    // ✅ SEARCH FILTER
    const filtered = search.trim()
        ? services.filter((c: any) =>
            c.name?.toLowerCase().includes(search.toLowerCase()) ||
            c.sub?.some((s: any) =>
                s.title?.toLowerCase().includes(search.toLowerCase())
            )
        )
        : services;

    // ✅ NAVIGATION
    const handleSelectCat = (catItem: any) => {
        console.log('[HomeScreen] selected service:', {
            id: catItem?._id,
            name: catItem?.name,
            subCount: catItem?.sub?.length || 0,
        });

        (navigation as any).navigate('AiAssistScreen', {
            item: {
                id: catItem._id,
                title: catItem.name,
                category: catItem.name,
                color: "#4CAF50",
                subServices: catItem.sub || [],
                aiPrompt: buildCategoryPrompt(catItem),
                openFrom: 'home',
            },
        });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FB' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* HEADER */}
            <View style={{ marginHorizontal: 15 }}>
                <Text style={{
                    fontSize: 22,
                    fontFamily: 'Poppins-Bold',
                    textAlign: 'center',
                    marginBottom: 12,
                    marginTop: 40
                }}>
                    Zorolegal 2.0
                </Text>

                {/* SEARCH */}
                <View style={{
                    backgroundColor: '#fff',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    marginBottom: 20,
                    borderWidth: 1,
                    borderColor: '#eee',
                }}>
                    <TextInput
                        placeholder="What service do you need today?"
                        placeholderTextColor="#999"
                        style={{
                            height: 45,
                            fontFamily: 'Poppins-Regular',
                            color: '#000'
                        }}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                <Text style={{
                    fontSize: 16,
                    fontFamily: 'Poppins-Bold',
                    marginBottom: 12,
                }}>
                    Our Services
                </Text>
            </View>

            {/* LIST */}
            <FlatList
                data={filtered}
                keyExtractor={(item: any) => item._id}
                numColumns={2}
                columnWrapperStyle={{
                    justifyContent: 'space-between',
                    marginBottom: 16
                }}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: 40,
                    paddingTop: 8
                }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchServices(true)}
                        colors={['#4CAF50']}
                        tintColor="#4CAF50"
                    />
                }
                renderItem={({ item }) => (
                    <CategoryCard
                        item={item}
                        onSelect={handleSelectCat}
                    />
                )}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 60 }}>
                        <Text style={{ fontSize: 40 }}>🔍</Text>
                        <Text style={{
                            fontSize: 16,
                            color: '#6B7280',
                            marginTop: 12
                        }}>
                            No services found for "{search}"
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};


// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const cat = StyleSheet.create({
    card: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        borderColor: '#ccc'
    },
    header: {
        alignItems: 'center',
        padding: 16
    },
    iconBox: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8
    },
    titleBox: {
        flex: 1
    },
    title: {
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        color: '#111827',
        textAlign: 'center'
    },
    iconImage: {
        width: 40,
        height: 40,
        resizeMode: 'contain'
    }
});

export default HomeScreen;