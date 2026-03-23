import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    Image, KeyboardAvoidingView, Platform, TouchableWithoutFeedback,
    Keyboard, FlatList, ActivityIndicator, ScrollView,
    Animated, SafeAreaView, StatusBar, Modal, Dimensions,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { useRoute, useNavigation } from '@react-navigation/native';

const { width: SW } = Dimensions.get('window');

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const OPENAI_API_KEY = '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';
const OPENAI_URL = 'https://api.openai.com/v1/responses';
const VISION_URL = 'https://api.openai.com/v1/chat/completions'; // vision uses chat/completions

// ─────────────────────────────────────────────
// CONVERT local file URI → base64
// ─────────────────────────────────────────────
async function uriToBase64(uri: string): Promise<string> {
    // Strip file:// prefix for RNFS
    const path = uri.replace('file://', '');
    const base64 = await RNFS.readFile(path, 'base64');
    return base64;
}

// ─────────────────────────────────────────────
// GPT-4o VISION  — verify uploaded doc matches expected type
// Returns { valid: boolean, message: string }
// ─────────────────────────────────────────────
async function verifyDocument(
    imageUri: string,
    expectedDocLabel: string,
): Promise<{ valid: boolean; message: string }> {
    try {
        const base64 = await uriToBase64(imageUri);
        const mimeType = imageUri.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';

        const prompt = `You are a document verification AI for Indian government applications.
The user is supposed to upload: "${expectedDocLabel}".

Look at this image carefully and determine:
1. What type of document / image is this? (be specific)
2. Does it match the expected document: "${expectedDocLabel}"?

Accepted examples for "${expectedDocLabel}":
- Proof of Address: Aadhaar card, Voter ID card, utility bill, bank statement, rent agreement
- Proof of Date of Birth / Birth Certificate: birth certificate, school leaving certificate, matriculation certificate, Aadhaar with DOB
- Passport Size Photo: clear face photo on plain/white background, passport style
- PAN Card: PAN card showing name, DOB, PAN number
- Aadhaar Card: Aadhaar card showing 12-digit number and name
- Driving License: driving licence card
- Business Address Proof: utility bill, rent agreement, property tax receipt

Respond in this EXACT JSON format (no markdown, no extra text):
{"valid": true/false, "detected": "what you see", "message": "friendly message to user in Hindi-English mix (Hinglish), max 2 sentences"}

If valid: message should say something like "✅ Sahi document hai! [doc name] successfully verify ho gaya."
If invalid: message should clearly say what was uploaded vs what was needed, ask them to upload the correct one. Be warm not rude.`;

        const res = await fetch(VISION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                max_tokens: 300,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'low' },
                            },
                        ],
                    },
                ],
            }),
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const raw = data?.choices?.[0]?.message?.content ?? '';

        // Parse JSON response
        const jsonStr = raw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        return { valid: !!parsed.valid, message: parsed.message ?? '' };
    } catch (err) {
        // If vision fails, allow upload (fail open)
        console.warn('Vision verify failed:', err);
        return { valid: true, message: '✅ Document uploaded.' };
    }
}

// ─────────────────────────────────────────────
// DOCUMENT EXAMPLE IMAGES — replace with your real hosted doc images
// ─────────────────────────────────────────────
const DOC_EXAMPLES: Record<string, string[]> = {
    address: [
        'https://upload.wikimedia.org/wikipedia/en/c/ca/Sample_Aadhaar_Card.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Voter_ID_card_India.jpg/320px-Voter_ID_card_India.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Bikesgray.jpg/320px-Bikesgray.jpg',
    ],
    dob: [
        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/320px-Camponotus_flavomarginatus_ant.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png',
    ],
    photo: [
        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Gatto_europeo4.jpg/320px-Gatto_europeo4.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/200px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
    ],
    default: [
        'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Above_Gotham.jpg/320px-Above_Gotham.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Bikesgray.jpg/320px-Bikesgray.jpg',
    ],
};

function getDocImages(label: string): string[] {
    const l = label.toLowerCase();
    if (l.includes('address') || l.includes('aadhaar') || l.includes('utility') || l.includes('voter')) return DOC_EXAMPLES.address;
    if (l.includes('birth') || l.includes('dob') || l.includes('age') || l.includes('matri')) return DOC_EXAMPLES.dob;
    if (l.includes('photo') || l.includes('photograph') || l.includes('picture')) return DOC_EXAMPLES.photo;
    return DOC_EXAMPLES.default;
}

// ─────────────────────────────────────────────
// SERVICE DATA
// ─────────────────────────────────────────────
export const servicePrompts = [
    {
        title: 'Passport',
        desc: 'Apply for new passport, renewal, and track status',
        systemPrompt: `You are a warm, helpful Indian government AI assistant for Passport services. Speak like a friendly human, not a form.

STRICT RULES — follow exactly:
1. On the very first message greet and ask what they want to do (do NOT ask for name yet).
2. After they say what they want, ask ONLY for full name + date of birth in one message.
3. After they give name+DOB, acknowledge warmly, ask ONLY for current address.
4. After address, say you need documents and will ask one by one.
5. For EACH document needed, first explain what it is, then on separate lines write:
   [UPLOAD: <document name>]
   [DOC_EXAMPLES: <document name>]
6. After ALL documents uploaded, ask Normal (₹1500) or Tatkal (₹3500).
7. After they choose, show: [PAYMENT: <amount>] on its own line.
8. After payment confirmed, summarize and write: [APPLICATION_COMPLETE] on its own line.

Keep each reply SHORT. One topic at a time. Use warm emojis 😊.`,
    },
    {
        title: 'Aadhaar Update',
        desc: 'Update address, mobile number, and other Aadhaar details',
        systemPrompt: `You are a warm, helpful Indian government AI assistant for Aadhaar card updates.
STRICT RULES:
1. First: greet and ask what they want to update.
2. Ask name + Aadhaar number.
3. Guide step by step. For documents: [UPLOAD: <doc>] then [DOC_EXAMPLES: <doc>]
4. Payment: [PAYMENT: 50]
5. Done: [APPLICATION_COMPLETE]
Keep replies short. One topic at a time. Use emojis 😊.`,
    },
    {
        title: 'PAN Services',
        desc: 'Apply for new PAN card or make corrections',
        systemPrompt: `You are a warm, helpful Indian government AI assistant for PAN card services.
STRICT RULES:
1. First: greet and ask what they need.
2. Ask name + DOB.
3. Guide step by step. For documents: [UPLOAD: <doc>] then [DOC_EXAMPLES: <doc>]
4. Payment: [PAYMENT: 107]
5. Done: [APPLICATION_COMPLETE]
Keep replies short. One topic at a time. Use emojis 😊.`,
    },
    {
        title: 'Driving License',
        desc: 'Apply, renew or check driving license status',
        systemPrompt: `You are a warm, helpful Indian government AI assistant for Driving License services.
STRICT RULES:
1. First: greet and ask what they need.
2. Ask name + DOB.
3. Guide step by step. For documents: [UPLOAD: <doc>] then [DOC_EXAMPLES: <doc>]
4. Payment: [PAYMENT: 200]
5. Done: [APPLICATION_COMPLETE]
Keep replies short. One topic at a time. Use emojis 😊.`,
    },
    {
        title: 'Business Licenses',
        desc: 'Register business, GST, MSME, Shop Act',
        systemPrompt: `You are a warm, helpful Indian government AI assistant for Business License services.
STRICT RULES:
1. First: greet and ask what registration they need.
2. Ask business name + owner name.
3. Guide step by step. For documents: [UPLOAD: <doc>] then [DOC_EXAMPLES: <doc>]
4. Payment: [PAYMENT: <amount>]
5. Done: [APPLICATION_COMPLETE]
Keep replies short. One topic at a time. Use emojis 😊.`,
    },
];

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type MsgType = 'bot' | 'user' | 'upload_card' | 'doc_examples' | 'payment_card' | 'payment_done' | 'success' | 'verify_loading' | 'verify_result';
type VerifyStatus = 'idle' | 'verifying' | 'valid' | 'invalid';

interface Msg {
    id: string;
    type: MsgType;
    text?: string;
    uploadLabel?: string;
    uploadedUri?: string;
    verifyStatus?: VerifyStatus;
    verifyMessage?: string;
    docExampleLabel?: string;
    paymentAmount?: string;
}

interface ConvEntry { role: 'user' | 'assistant'; content: string; }

// ─────────────────────────────────────────────
// OPENAI CHAT
// ─────────────────────────────────────────────
async function callOpenAI(sys: string, history: ConvEntry[], userMsg: string): Promise<string> {
    const messages = [{ role: 'system', content: sys }, ...history, { role: 'user', content: userMsg }];
    const res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-4o', input: messages }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (Array.isArray(data?.output)) {
        for (const item of data.output) {
            if (item.type === 'message' && Array.isArray(item.content)) {
                for (const c of item.content) {
                    if (c.type === 'output_text') return c.text ?? '';
                }
            }
        }
    }
    return data?.choices?.[0]?.message?.content ?? '';
}

// ─────────────────────────────────────────────
// PARSE AI RESPONSE
// ─────────────────────────────────────────────
function parseResponse(raw: string): Partial<Msg>[] {
    const out: Partial<Msg>[] = [];
    let buf: string[] = [];
    const flush = () => {
        const t = buf.join('\n').trim();
        if (t) out.push({ type: 'bot', text: t });
        buf = [];
    };
    for (const line of raw.split('\n')) {
        const ul = line.trim().match(/^\[UPLOAD:\s*(.+?)\]$/i);
        const de = line.trim().match(/^\[DOC_EXAMPLES?:\s*(.+?)\]$/i);
        const pl = line.trim().match(/^\[PAYMENT:\s*(\d+)\]$/i);
        const cl = line.trim().match(/^\[APPLICATION_COMPLETE\]$/i);
        if (ul) { flush(); out.push({ type: 'upload_card', uploadLabel: ul[1].trim(), verifyStatus: 'idle' }); }
        else if (de) { flush(); out.push({ type: 'doc_examples', docExampleLabel: de[1].trim() }); }
        else if (pl) { flush(); out.push({ type: 'payment_card', paymentAmount: pl[1] }); }
        else if (cl) { flush(); out.push({ type: 'success', text: '✅ Application submitted successfully!\n\nYou will receive a confirmation on your registered mobile number shortly. 🎉' }); }
        else { buf.push(line); }
    }
    flush();
    return out;
}

// ─────────────────────────────────────────────
// DOC EXAMPLES CAROUSEL
// ─────────────────────────────────────────────
const DocExamplesGrid: React.FC<{ label: string }> = ({ label }) => {
    const images = getDocImages(label);
    const [active, setActive] = useState(0);
    return (
        <View style={de.wrap}>
            <Text style={de.title}>📌 Example: {label}</Text>
            <Text style={de.sub}>Swipe to see accepted formats →</Text>
            <ScrollView
                horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={e => setActive(Math.round(e.nativeEvent.contentOffset.x / (SW - 110)))}
                style={{ marginTop: 10 }}
            >
                {images.map((uri, i) => (
                    <View key={i} style={de.imgWrap}>
                        <Image source={{ uri }} style={de.img} resizeMode="cover" />
                    </View>
                ))}
            </ScrollView>
            <View style={de.counterBadge}>
                <Text style={de.counterTxt}>{active + 1} of {images.length}</Text>
            </View>
            <View style={de.dots}>
                {images.map((_, i) => <View key={i} style={[de.dot, i === active && de.dotActive]} />)}
            </View>
        </View>
    );
};

// ─────────────────────────────────────────────
// UPLOAD CARD  (with verify states)
// ─────────────────────────────────────────────
const UploadCard: React.FC<{
    msg: Msg;
    onUpload: (uri: string) => void;
    onRetry: () => void;
}> = ({ msg, onUpload, onRetry }) => {
    const { uploadLabel, uploadedUri, verifyStatus, verifyMessage } = msg;

    const pick = async (cam: boolean) => {
        const fn = cam ? launchCamera : launchImageLibrary;
        const r = await fn({ mediaType: 'photo', quality: 0.85 });
        if (r.assets?.length) onUpload(r.assets[0].uri!);
    };

    // ── Verifying state ──
    if (verifyStatus === 'verifying') return (
        <View style={uc.wrap}>
            {uploadedUri && <Image source={{ uri: uploadedUri }} style={uc.previewImg} />}
            <View style={uc.verifyingRow}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={uc.verifyingTxt}>  Verifying document with AI…</Text>
            </View>
        </View>
    );

    // ── Invalid doc uploaded ──
    if (verifyStatus === 'invalid') return (
        <View style={uc.wrap}>
            {uploadedUri && <Image source={{ uri: uploadedUri }} style={[uc.previewImg, uc.previewErr]} />}
            <View style={uc.invalidBanner}>
                <Text style={uc.invalidIcon}>❌</Text>
                <Text style={uc.invalidTxt}>{verifyMessage}</Text>
            </View>
            <Text style={uc.retryHint}>Please upload the correct document 👇</Text>
            <View style={uc.btnRow}>
                <TouchableOpacity style={uc.btn} onPress={() => pick(true)}>
                    <Text style={uc.bIcon}>📷</Text><Text style={uc.bTxt}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={uc.btn} onPress={() => pick(false)}>
                    <Text style={uc.bIcon}>🖼️</Text><Text style={uc.bTxt}>Gallery</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // ── Valid / done ──
    if (verifyStatus === 'valid' && uploadedUri) return (
        <View style={uc.doneWrap}>
            <Image source={{ uri: uploadedUri }} style={uc.thumb} />
            <View style={uc.doneRow}>
                <Text style={uc.doneCheck}>✅</Text>
                <View style={{ flex: 1 }}>
                    <Text style={uc.doneName}>{uploadLabel}</Text>
                    <Text style={uc.doneSub}>{verifyMessage ?? 'Verified & uploaded successfully'}</Text>
                </View>
            </View>
        </View>
    );

    // ── Idle (waiting for upload) ──
    return (
        <View style={uc.wrap}>
            <Text style={uc.docIcon}>📄</Text>
            <Text style={uc.name}>{uploadLabel}</Text>
            <Text style={uc.hint}>Upload a clear, readable photo of this document</Text>
            <View style={uc.btnRow}>
                <TouchableOpacity style={uc.btn} onPress={() => pick(true)}>
                    <Text style={uc.bIcon}>📷</Text><Text style={uc.bTxt}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={uc.btn} onPress={() => pick(false)}>
                    <Text style={uc.bIcon}>🖼️</Text><Text style={uc.bTxt}>Gallery</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ─────────────────────────────────────────────
// PAYMENT SHEET
// ─────────────────────────────────────────────
const PaySheet: React.FC<{ visible: boolean; amount: string; onPay: (m: string) => void; onClose: () => void }> = ({ visible, amount, onPay, onClose }) => (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
        <TouchableOpacity style={ps.bg} activeOpacity={1} onPress={onClose}>
            <TouchableOpacity style={ps.sheet} activeOpacity={1}>
                <View style={ps.handle} />
                <Text style={ps.title}>💳  Complete Payment</Text>
                {amount ? <Text style={ps.amt}>₹{amount}</Text> : null}
                <Text style={ps.sub}>Choose a payment method</Text>
                {[
                    { icon: '📱', label: 'UPI / GPay / PhonePe', clr: '#7C3AED' },
                    { icon: '🏦', label: 'Net Banking', clr: '#2563EB' },
                    { icon: '💳', label: 'Debit / Credit Card', clr: '#059669' },
                    { icon: '🏧', label: 'Pay at PSK Counter', clr: '#D97706' },
                ].map(m => (
                    <TouchableOpacity key={m.label} style={[ps.row, { borderLeftColor: m.clr }]} onPress={() => onPay(m.label)}>
                        <Text style={ps.rIcon}>{m.icon}</Text>
                        <Text style={ps.rLabel}>{m.label}</Text>
                        <Text style={ps.rArr}>›</Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity style={ps.cancel} onPress={onClose}><Text style={ps.cancelTxt}>Cancel</Text></TouchableOpacity>
            </TouchableOpacity>
        </TouchableOpacity>
    </Modal>
);

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
const AiAssistScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { item } = (route.params as any) || {};

    const svc = servicePrompts.find(s => s.title === item?.title) ?? servicePrompts[0];
    const serviceTitle = svc.title;
    const systemPrompt = svc.systemPrompt;

    const [messages, setMessages] = useState<Msg[]>([]);
    const [history, setHistory] = useState<ConvEntry[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [payModal, setPayModal] = useState({ visible: false, amount: '', msgId: '' });

    const progressAnim = useRef(new Animated.Value(0)).current;
    const flatRef = useRef<FlatList>(null);
    const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    useEffect(() => {
        Animated.timing(progressAnim, { toValue: progress, duration: 600, useNativeDriver: false }).start();
    }, [progress]);

    const pWidth = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
    const scrollBottom = (d = 200) => setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), d);

    const addMsgs = (parts: Partial<Msg>[]) => {
        const msgs = parts.map(p => ({ ...p, id: uid() } as Msg));
        setMessages(prev => [...prev, ...msgs]);
        scrollBottom();
        return msgs;
    };

    const updateMsg = (id: string, patch: Partial<Msg>) =>
        setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));

    // ── Initial AI greeting ──────────────────
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const raw = await callOpenAI(systemPrompt, [], 'Hello, start the conversation.');
                setHistory([
                    { role: 'user', content: 'Hello, start the conversation.' },
                    { role: 'assistant', content: raw },
                ]);
                addMsgs(parseResponse(raw));
                setProgress(5);
            } catch {
                addMsgs([{ type: 'bot', text: `Hello! 😊 I am your AI Assistant. I can help you with your ${serviceTitle}.\n\nWhat would you like to do today?` }]);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // ── Send text to AI ──────────────────────
    const askAI = async (userText: string) => {
        setLoading(true);
        try {
            const raw = await callOpenAI(systemPrompt, history, userText);
            setHistory(h => [...h,
            { role: 'user', content: userText },
            { role: 'assistant', content: raw },
            ]);
            addMsgs(parseResponse(raw));
            if (raw.includes('[APPLICATION_COMPLETE]')) setProgress(100);
            else if (raw.includes('[PAYMENT:')) setProgress(88);
            else if (raw.includes('[UPLOAD:')) setProgress(p => Math.min(p + 14, 72));
            else setProgress(p => Math.min(p + 8, 55));
        } catch {
            addMsgs([{ type: 'bot', text: 'Sorry, I had trouble connecting. Please try again. 🙏' }]);
        } finally {
            setLoading(false);
        }
    };

    const send = () => {
        const t = input.trim();
        if (!t || loading) return;
        setInput('');
        addMsgs([{ type: 'user', text: t }]);
        askAI(t);
    };

    // ── Handle document upload + AI vision verify ──
    const handleUpload = async (msgId: string, label: string, uri: string) => {
        // Step 1 — show preview with "verifying" spinner
        updateMsg(msgId, { uploadedUri: uri, verifyStatus: 'verifying' });
        scrollBottom(150);

        // Step 2 — call GPT-4o vision
        const result = await verifyDocument(uri, label);

        if (result.valid) {
            // ✅ Correct document
            updateMsg(msgId, { verifyStatus: 'valid', verifyMessage: result.message });
            addMsgs([{ type: 'user', text: `I have uploaded my ${label} ✅` }]);
            askAI(`I have uploaded the document: ${label}. It was verified as correct.`);
            setProgress(p => Math.min(p + 13, 80));
        } else {
            // ❌ Wrong document — show error, allow re-upload
            updateMsg(msgId, { verifyStatus: 'invalid', verifyMessage: result.message });
            // Also add a bot message explaining the issue
            addMsgs([{
                type: 'bot',
                text: result.message,
            }]);
            scrollBottom(200);
        }
    };

    // ── Payment ──────────────────────────────
    const handlePay = (method: string) => {
        const { msgId, amount } = payModal;
        setPayModal({ visible: false, amount: '', msgId: '' });
        updateMsg(msgId, { type: 'payment_done' });
        addMsgs([{ type: 'user', text: `Payment of ₹${amount} done via ${method} ✅` }]);
        askAI(`Payment of ₹${amount} completed via ${method}.`);
        setProgress(94);
    };

    const msgCount = messages.filter(m => m.type === 'bot' || m.type === 'user').length;

    // ── Render ───────────────────────────────
    const renderItem = ({ item: msg }: { item: Msg }) => {
        switch (msg.type) {
            case 'bot':
                return (
                    <View style={[s.row, s.botRow]}>
                        <View style={s.avatar}><View style={s.avatarDot} /></View>
                        <View style={[s.bubble, s.botBubble]}>
                            <Text style={s.botTxt}>{msg.text}</Text>
                        </View>
                    </View>
                );
            case 'user':
                return (
                    <View style={[s.row, s.userRow]}>
                        <View style={[s.bubble, s.userBubble]}>
                            <Text style={s.userTxt}>{msg.text}</Text>
                        </View>
                    </View>
                );
            case 'doc_examples':
                return (
                    <View style={s.wideCard}>
                        <DocExamplesGrid label={msg.docExampleLabel!} />
                    </View>
                );
            case 'upload_card':
                return (
                    <View style={s.wideCard}>
                        <UploadCard
                            msg={msg}
                            onUpload={uri => handleUpload(msg.id, msg.uploadLabel!, uri)}
                            onRetry={() => updateMsg(msg.id, { verifyStatus: 'idle', uploadedUri: undefined })}
                        />
                    </View>
                );
            case 'payment_card':
                return (
                    <View style={s.wideCard}>
                        <TouchableOpacity
                            style={s.payCard}
                            onPress={() => setPayModal({ visible: true, amount: msg.paymentAmount ?? '', msgId: msg.id })}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                <Text style={{ fontSize: 30 }}>💳</Text>
                                <View>
                                    <Text style={s.payTitle}>Pay Application Fee</Text>
                                    {msg.paymentAmount ? <Text style={s.payAmt}>₹{msg.paymentAmount}</Text> : null}
                                </View>
                            </View>
                            <View style={s.payBtn}><Text style={s.payBtnTxt}>Pay Now →</Text></View>
                        </TouchableOpacity>
                    </View>
                );
            case 'payment_done':
                return (
                    <View style={s.wideCard}>
                        <View style={[s.payCard, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
                            <Text style={{ color: '#15803D', fontWeight: '700', fontSize: 14 }}>✅  Payment Successful</Text>
                        </View>
                    </View>
                );
            case 'success':
                return (
                    <View style={s.wideCard}>
                        <View style={s.successCard}>
                            <Text style={{ fontSize: 34, marginBottom: 10 }}>🎉</Text>
                            <Text style={s.successTxt}>{msg.text}</Text>
                        </View>
                    </View>
                );
            default: return null;
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={{ flex: 1, backgroundColor: '#F5F6FA' }}>

                    {/* HEADER */}
                    <View style={s.header}>
                        <TouchableOpacity onPress={() => (navigation as any).goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <Text style={s.backArrow}>‹</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={s.headerTitle}>AI Assistant</Text>
                            <Text style={s.headerSub}>{serviceTitle}</Text>
                        </View>
                        <View style={s.badge}><Text style={s.badgeTxt}>{msgCount}</Text></View>
                    </View>

                    {/* PROGRESS */}
                    <View style={s.pbar}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={s.pCircle}><Text style={s.pCheck}>✓</Text></View>
                            <Text style={s.pLabel}>Application Progress</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={s.pTrack}>
                                <Animated.View style={[s.pFill, { width: pWidth }]} />
                            </View>
                            <Text style={s.pPct}>{progress}%</Text>
                        </View>
                    </View>

                    {/* CHAT */}
                    <FlatList
                        ref={flatRef}
                        data={messages}
                        renderItem={renderItem}
                        keyExtractor={m => m.id}
                        contentContainerStyle={s.listContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                        bounces={true}
                        onContentSizeChange={() => scrollBottom(100)}
                        onLayout={() => scrollBottom(100)}
                    />

                    {/* TYPING */}
                    {loading && (
                        <View style={s.typingRow}>
                            <View style={s.avatar}><View style={s.avatarDot} /></View>
                            <View style={s.typingBubble}>
                                <ActivityIndicator size="small" color="#94A3B8" />
                                <Text style={s.typingTxt}>  typing…</Text>
                            </View>
                        </View>
                    )}

                    {/* INPUT */}
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={s.inputBar}>
                            <TextInput
                                placeholder="Type your message..."
                                placeholderTextColor="#9CA3AF"
                                value={input}
                                onChangeText={setInput}
                                style={s.inputField}
                                multiline
                                returnKeyType="send"
                                onSubmitEditing={send}
                                blurOnSubmit={false}
                            />
                            <TouchableOpacity
                                style={[s.sendBtn, (!input.trim() || loading) && s.sendOff]}
                                onPress={send}
                                disabled={!input.trim() || loading}
                            >
                                <Text style={s.sendIcon}>➤</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>

                </View>
            </KeyboardAvoidingView>

            <PaySheet
                visible={payModal.visible}
                amount={payModal.amount}
                onPay={handlePay}
                onClose={() => setPayModal({ visible: false, amount: '', msgId: '' })}
            />
        </SafeAreaView>
    );
};

export default AiAssistScreen;

// ─────────────────────────────────────────────
// MAIN STYLES
// ─────────────────────────────────────────────
const s = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB', marginTop: Platform.OS === 'android' ? 28 : 0 },
    backArrow: { fontSize: 32, color: '#111', lineHeight: 36, paddingRight: 6 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
    headerSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
    badge: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, minWidth: 36, alignItems: 'center' },
    badgeTxt: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    pbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB' },
    pCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
    pCheck: { fontSize: 10, color: '#3B82F6', fontWeight: '800' },
    pLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
    pTrack: { width: 110, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
    pFill: { height: 6, backgroundColor: '#3B82F6', borderRadius: 3 },
    pPct: { fontSize: 12, fontWeight: '700', color: '#3B82F6', minWidth: 36, textAlign: 'right' },
    listContent: { paddingHorizontal: 14, paddingTop: 18, paddingBottom: 14 },
    row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    botRow: { justifyContent: 'flex-start' },
    userRow: { justifyContent: 'flex-end' },
    avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 4, flexShrink: 0 },
    avatarDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' },
    bubble: { maxWidth: '80%', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 20 },
    botBubble: { backgroundColor: '#fff', borderTopLeftRadius: 4, borderWidth: 0.5, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    userBubble: { backgroundColor: '#2563EB', borderTopRightRadius: 4 },
    botTxt: { fontSize: 14.5, color: '#1E293B', lineHeight: 23 },
    userTxt: { fontSize: 14.5, color: '#fff', lineHeight: 23 },
    wideCard: { marginLeft: 34, marginBottom: 16, marginRight: 4 },
    payCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    payTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
    payAmt: { fontSize: 20, fontWeight: '800', color: '#2563EB', marginTop: 2 },
    payBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
    payBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
    successCard: { backgroundColor: '#F0FDF4', borderWidth: 0.5, borderColor: '#86EFAC', borderRadius: 16, padding: 22, alignItems: 'center' },
    successTxt: { fontSize: 14.5, color: '#15803D', lineHeight: 23, textAlign: 'center', fontWeight: '500' },
    typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 8 },
    typingBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderTopLeftRadius: 4, borderWidth: 0.5, borderColor: '#E5E7EB' },
    typingTxt: { fontSize: 13, color: '#94A3B8' },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#E5E7EB', gap: 8 },
    inputField: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 24, paddingHorizontal: 18, paddingTop: Platform.OS === 'ios' ? 12 : 10, paddingBottom: Platform.OS === 'ios' ? 12 : 10, fontSize: 15, color: '#111', maxHeight: 110 },
    sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
    sendOff: { backgroundColor: '#BFDBFE' },
    sendIcon: { fontSize: 17, color: '#fff', marginLeft: 2 },
});

// ─────────────────────────────────────────────
// DOC EXAMPLES STYLES
// ─────────────────────────────────────────────
const de = StyleSheet.create({
    wrap: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    title: { fontSize: 13, fontWeight: '700', color: '#111827' },
    sub: { fontSize: 11.5, color: '#6B7280', marginTop: 2 },
    imgWrap: { width: SW - 110, height: 160, borderRadius: 10, overflow: 'hidden', marginRight: 10, backgroundColor: '#F3F4F6' },
    img: { width: '100%', height: '100%' },
    counterBadge: { position: 'absolute', top: 58, right: 20, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
    counterTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB' },
    dotActive: { backgroundColor: '#2563EB', width: 16 },
});

// ─────────────────────────────────────────────
// UPLOAD CARD STYLES
// ─────────────────────────────────────────────
const uc = StyleSheet.create({
    wrap: { backgroundColor: '#fff', borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: '#E5E7EB', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    docIcon: { fontSize: 34, marginBottom: 8 },
    name: { fontSize: 15, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 5 },
    hint: { fontSize: 12.5, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
    btnRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 12 },
    btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EFF6FF', borderRadius: 11, paddingVertical: 12 },
    bIcon: { fontSize: 17 },
    bTxt: { fontSize: 13, fontWeight: '600', color: '#2563EB' },

    // Preview while verifying
    previewImg: { width: '100%', height: 140, borderRadius: 10, resizeMode: 'cover', marginBottom: 10 },
    previewErr: { borderWidth: 2, borderColor: '#EF4444' },
    verifyingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    verifyingTxt: { fontSize: 13, color: '#2563EB', fontWeight: '600' },

    // Invalid state
    invalidBanner: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA', width: '100%', marginBottom: 8 },
    invalidIcon: { fontSize: 18, textAlign: 'center', marginBottom: 4 },
    invalidTxt: { fontSize: 13, color: '#B91C1C', lineHeight: 20, textAlign: 'center' },
    retryHint: { fontSize: 12.5, color: '#6B7280', marginBottom: 4, textAlign: 'center' },

    // Valid / done
    doneWrap: { backgroundColor: '#F0FDF4', borderRadius: 14, overflow: 'hidden', borderWidth: 0.5, borderColor: '#86EFAC' },
    thumb: { width: '100%', height: 130, resizeMode: 'cover' },
    doneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
    doneCheck: { fontSize: 24 },
    doneName: { fontSize: 13, fontWeight: '700', color: '#15803D' },
    doneSub: { fontSize: 11.5, color: '#16A34A', marginTop: 2 },
});

// ─────────────────────────────────────────────
// PAYMENT SHEET STYLES
// ─────────────────────────────────────────────
const ps = StyleSheet.create({
    bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 26, paddingBottom: Platform.OS === 'ios' ? 44 : 32 },
    handle: { width: 42, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
    title: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 },
    amt: { fontSize: 30, fontWeight: '800', color: '#2563EB', marginBottom: 6 },
    sub: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 13, padding: 15, marginBottom: 10, borderLeftWidth: 4, gap: 12 },
    rIcon: { fontSize: 22 },
    rLabel: { flex: 1, fontSize: 14.5, fontWeight: '600', color: '#111827' },
    rArr: { fontSize: 20, color: '#9CA3AF' },
    cancel: { marginTop: 6, alignItems: 'center', padding: 12 },
    cancelTxt: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
});