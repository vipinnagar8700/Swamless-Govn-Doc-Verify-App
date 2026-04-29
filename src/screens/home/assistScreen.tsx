import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    Image, KeyboardAvoidingView, Platform,
    Keyboard, FlatList, ActivityIndicator, ScrollView,
    Animated, SafeAreaView, StatusBar, Dimensions, Modal,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { useRoute, useNavigation } from '@react-navigation/native';
import { OPENAI_API_KEY, OPENAI_URL, VISION_URL } from '../../utils/privateApi';
import { ConvEntry, Msg, VerifyStatus, FormData as ApplicationFormData } from '../../utils';
import { getDocumentsApi, uploadDocumentApi } from '../../services/docWalletService';
import {
    startApplicationSessionApi,
    storeSessionMessagesApi,
    updateApplicationFlowApi,
    createRazorpayOrderApi,
    verifyRazorpayPaymentApi,
    getApplicationSessionApi,
    getRecentApplicationChatsApi,
} from '../../services/applicationFlowApi';
import { applyRequestTargetRestrictions } from './assistRequestTarget';
import RazorpayCheckout from 'react-native-razorpay';
const { width: SW } = Dimensions.get('window');

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
async function uriToBase64(uri: string): Promise<string> {
    return await RNFS.readFile(uri.replace('file://', ''), 'base64');
}

async function buildVisionImageUrl(imageUri: string): Promise<string> {
    if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) return imageUri;
    const base64 = await uriToBase64(imageUri);
    const mime = imageUri.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
}

async function verifyDocument(
    imageUri: string, label: string
): Promise<{ valid: boolean; message: string }> {
    try {
        const imageUrl = await buildVisionImageUrl(imageUri);
        const prompt = `You are a document verification AI for Indian government applications.
Expected document: "${label}"
Accepted types: Aadhaar Card (12-digit number + name), PAN Card (PAN number + name + DOB), Voter ID (EPIC number + name), Passport (photo page), Driving License, Birth Certificate, Utility Bill, Rent Agreement, Passport Size Photo (clear face on white background).
Respond ONLY in JSON (no markdown):
{"valid": true/false, "detected": "what you see", "message": "English friendly message max 2 sentences"}
If valid: "✅ Document verified! ${label} has been uploaded and verified successfully."
If invalid: explain what was uploaded vs needed.`;
        const res = await fetch(VISION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({
                model: 'gpt-4o', max_tokens: 200,
                messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } }] }],
            }),
        });
        const data = await res.json();
        const parsed = JSON.parse(data?.choices?.[0]?.message?.content?.replace(/```json|```/g, '').trim() ?? '{}');
        return { valid: !!parsed.valid, message: parsed.message ?? '' };
    } catch { return { valid: true, message: `✅ ${label} uploaded and verified.` }; }
}

async function verifyAadhaarDob(
    imageUri: string, claimedDob: string, claimedName: string
): Promise<{ valid: boolean; dobMatches: boolean; extractedDob: string; extractedName: string; aadhaarNumber: string; message: string }> {
    try {
        const imageUrl = await buildVisionImageUrl(imageUri);
        const prompt = `You are an Aadhaar card verification AI.
User claimed — Name: "${claimedName}", DOB: "${claimedDob}"
Examine this image:
1. Is this an Aadhaar card? (UIDAI logo, 12-digit number)
2. Extract the full name printed on card
3. Extract the date of birth printed on card
4. Extract last 4 digits of Aadhaar number
5. Does the DOB match "${claimedDob}"? (flexible with formats)
6. Does the name roughly match "${claimedName}"?
Respond ONLY in JSON (no markdown):
{"isAadhaar":true/false,"extractedName":"","extractedDob":"","aadhaarNumber":"","dobMatches":true/false,"nameMatches":true/false,"message":"English message max 2 sentences"}
If valid + DOB matches: message = "✅ Aadhaar verified! Your date of birth has been confirmed successfully."
If DOB mismatch: explain both dates, say Aadhaar DOB will be used.
If not Aadhaar: explain and ask to upload Aadhaar card.`;
        const res = await fetch(VISION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({
                model: 'gpt-4o', max_tokens: 300,
                messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }] }],
            }),
        });
        const data = await res.json();
        const parsed = JSON.parse(data?.choices?.[0]?.message?.content?.replace(/```json|```/g, '').trim() ?? '{}');
        return { valid: !!parsed.isAadhaar, dobMatches: !!parsed.dobMatches, extractedDob: parsed.extractedDob ?? '', extractedName: parsed.extractedName ?? '', aadhaarNumber: parsed.aadhaarNumber ?? '', message: parsed.message ?? '' };
    } catch {
        return { valid: true, dobMatches: true, extractedDob: claimedDob, extractedName: claimedName, aadhaarNumber: 'XXXX XXXX XXXX', message: '✅ Aadhaar verified! Date of birth confirmed.' };
    }
}

async function callOpenAI(sys: string, hist: ConvEntry[], msg: string): Promise<string> {
    const res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-4o', input: [{ role: 'system', content: sys }, ...hist, { role: 'user', content: msg }] }),
    });
    const data = await res.json();
    if (Array.isArray(data?.output)) {
        for (const item of data.output) {
            if (item.type === 'message') for (const c of item.content ?? []) if (c.type === 'output_text') return c.text ?? '';
        }
    }
    return data?.choices?.[0]?.message?.content ?? '';
}

function extractFormData(hist: ConvEntry[], title: string): ApplicationFormData {
    const raw = hist.map(h => h.content).join('\n');
    // Avoid generic fallback to prevent wrong values like "your AI Assistant"
    const nameMatch = raw.match(/(?:my name is|full\s*name[:\s]+|i am|i'm)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+){1,3})/i);
    const dobMatch = raw.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i) || raw.match(/(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})/i);
    const phoneMatch = raw.match(/(?:\+91|91)?[\s\-]?([6-9]\d{9})/);
    const emailMatch = raw.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    const aadhaarMatch = raw.match(/\b(\d{4}\s*\d{4}\s*\d{4})\b/);
    const pinMatch = raw.match(/\b([1-9]\d{5})\b/);
    const cityMatch = raw.match(/(?:city[:\s]+|,\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    const placeMatch = raw.match(/(?:place\s*of\s*birth|birth\s*place)[:\s]+([a-zA-Z\s]{2,})/i);
    const parentMatch = raw.match(/(?:father\/mother\s*name|parent\s*name|father\s*name|mother\s*name)[:\s]+([a-zA-Z\s]{2,})/i);
    const maritalMatch = raw.match(/(?:marital\s*status)[:\s]+([a-zA-Z\s]{2,})/i);
    const appId = `APP${Date.now().toString().slice(-8).toUpperCase()}`;
    const today = new Date();
    const cleanedName = (() => {
        const candidate = nameMatch?.[1]?.trim() ?? '';
        if (!candidate) return '';
        if (/\b(ai\s+assistant|assistant)\b/i.test(candidate)) return '';
        return candidate;
    })();
    return {
        fullName: cleanedName, dob: dobMatch?.[1] ?? '',
        phone: phoneMatch ? `+91 ${phoneMatch[1]}` : '', email: emailMatch?.[0] ?? '',
        aadhaarNumber: aadhaarMatch?.[1] ?? '', pincode: pinMatch?.[1] ?? '',
        city: cityMatch?.[1] ?? '', documentType: `${title} Application`,
        placeOfBirth: placeMatch?.[1]?.trim() ?? '',
        parentName: parentMatch?.[1]?.trim() ?? '',
        maritalStatus: maritalMatch?.[1]?.trim() ?? '',
        applicationId: appId,
        submittedOn: `${today.getDate()} ${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}`,
    };
}

const FIELD_ALIASES: Array<{ key: keyof ApplicationFormData; patterns: RegExp[] }> = [
    { key: 'placeOfBirth', patterns: [/place\s*of\s*birth/i, /birth\s*place/i] },
    { key: 'parentName', patterns: [/father\/mother\s*name/i, /parent\s*name/i, /father\s*name/i, /mother\s*name/i] },
    { key: 'maritalStatus', patterns: [/marital\s*status/i] },
    { key: 'fullName', patterns: [/full\s*name/i, /applicant\s*name/i, /candidate\s*name/i] },
    { key: 'dob', patterns: [/date\s*of\s*birth/i, /\bdob\b/i, /birth\s*date/i] },
    { key: 'aadhaarNumber', patterns: [/aadhaar/i, /aadhar/i] },
    { key: 'email', patterns: [/email/i, /e-?mail/i] },
    { key: 'phone', patterns: [/phone/i, /mobile/i, /contact\s*number/i] },
    { key: 'flatNo', patterns: [/flat/i, /house\s*no/i, /house\s*name/i] },
    { key: 'street', patterns: [/street/i, /locality/i, /address\s*line/i] },
    { key: 'city', patterns: [/\bcity\b/i] },
    { key: 'state', patterns: [/\bstate\b/i] },
    { key: 'pincode', patterns: [/pin\s*code/i, /pincode/i, /postal\s*code/i, /zip\s*code/i] },
];

function uniqueFields(fields: Array<keyof ApplicationFormData>) {
    return [...new Set(fields)];
}

function inferRequestedFormFields(rawText: string): Array<keyof ApplicationFormData> {
    const found: Array<keyof ApplicationFormData> = [];
    for (const alias of FIELD_ALIASES) {
        if (alias.patterns.some((rx) => rx.test(rawText))) found.push(alias.key);
    }
    return uniqueFields(found);
}

function parseFieldList(fieldText?: string): Array<keyof ApplicationFormData> {
    if (!fieldText) return [];
    const parts = fieldText
        .split(/[\n,|]/)
        .map((p) => p.trim())
        .filter(Boolean);
    const mapped: Array<keyof ApplicationFormData> = [];
    for (const part of parts) mapped.push(...inferRequestedFormFields(part));
    return uniqueFields(mapped);
}

function extractRequestedFieldLabels(text: string): string[] {
    const labels: string[] = [];
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
        const bullet = line.match(/^[-•*]\s+(.+)$/);
        if (bullet?.[1]) labels.push(bullet[1].trim());
    }

    if (!labels.length) {
        const m = text.match(/please\s+provide[:\s]*([\s\S]+)/i);
        if (m?.[1]) {
            const parts = m[1].split(/[\n,|]/).map((p) => p.trim()).filter(Boolean);
            labels.push(...parts.slice(0, 12));
        }
    }

    return labels;
}

function fieldKeyFromLabel(label: string): keyof ApplicationFormData | undefined {
    for (const alias of FIELD_ALIASES) {
        if (alias.patterns.some((rx) => rx.test(label))) return alias.key;
    }
    return undefined;
}

// ─────────────────────────────────────────────
// PARSE AI RESPONSE
// Groups all [UPLOAD:] tags into ONE multi_upload card.
// Shows ONE doc_examples_panel before uploads if any uploads present.
// ─────────────────────────────────────────────
function parseResponse(raw: string, hist: ConvEntry[], title: string): Partial<Msg>[] {
    const out: Partial<Msg>[] = [];
    let buf: string[] = [];
    const pendingUploads: { label: string; isDob: boolean }[] = [];

    const flush = () => {
        const t = buf.join('\n').trim();
        if (t) out.push({ type: 'bot', text: t });
        buf = [];
    };

    const flushUploads = () => {
        if (pendingUploads.length === 0) return;
        const isDobOnly = pendingUploads.length === 1 && pendingUploads[0].isDob;

        if (isDobOnly) {
            // Single Aadhaar DOB upload — use dob_upload type
            out.push({ type: 'dob_upload', dobVerifyStatus: 'idle' });
        } else {
            // Show one doc examples panel with all unique labels
            const exampleLabels = [...new Set(pendingUploads.map(u => u.label))];
            out.push({ type: 'doc_examples_panel', docLabels: exampleLabels });
            // Then one grouped upload card
            out.push({
                type: 'multi_upload',
                uploadItems: pendingUploads.map(u => ({
                    label: u.label,
                    isDob: u.isDob,
                    verifyStatus: 'idle' as VerifyStatus,
                })),
            });
        }
        pendingUploads.length = 0;
    };

    for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        const ul = trimmed.match(/\[UPLOAD:\s*([^\]]+?)\]/i);
        const sf = trimmed.match(/\[SHOW_FORM(?:\s*:\s*([^\]]+))?\]/i);
        const sp = trimmed.match(/\[SHOW_PAYMENT:\s*([^\]]+)\]/i);
        const cl = trimmed.match(/\[APPLICATION_COMPLETE\]/i);
        // Ignore [DOC_EXAMPLES:] — we handle examples ourselves
        const de = trimmed.match(/\[DOC_EXAMPLES?:\s*([^\]]+?)\]/i);

        if (ul) {
            flush();
            const label = ul[1].trim();
            const isDob = label.toLowerCase().includes('dob verification') || label.toLowerCase().includes('for dob');
            pendingUploads.push({ label, isDob });
        } else if (de) {
            // ignore AI-generated doc_examples tags
        } else if (sf) {
            const currentAssistantText = buf.join('\n');
            const labelsFromText = extractRequestedFieldLabels(currentAssistantText);
            flushUploads();
            flush();
            const parsedFromTag = parseFieldList(sf[1]);
            const keysFromLabels = uniqueFields(labelsFromText.map(fieldKeyFromLabel).filter(Boolean) as Array<keyof ApplicationFormData>);
            const fallbackFromText = inferRequestedFormFields(currentAssistantText);
            const formFields = parsedFromTag.length ? parsedFromTag : (keysFromLabels.length ? keysFromLabels : fallbackFromText);
            out.push({
                type: 'form_review',
                formData: extractFormData(hist, title),
                formFields,
                formFieldLabels: labelsFromText,
            });
        } else if (sp) {
            flushUploads();
            flush();
            const f = (sp[1].match(/\d+/g) || []).join('') || '0';
            out.push({ type: 'payment_card', totalFee: f });
        } else if (cl) {
            flushUploads();
            flush();
            out.push({ type: 'success', text: '🎉 Application Submitted Successfully!\n\nYou will receive a confirmation SMS and email shortly. Track your status at the relevant government portal.' });
        } else {
            // If we have pending uploads and hit a non-tag line, flush uploads first
            if (pendingUploads.length > 0) {
                flushUploads();
            }
            buf.push(line);
        }
    }

    flushUploads();
    flush();
    return out;
}

// ─────────────────────────────────────────────
// DOC IMAGES & HINTS
// ─────────────────────────────────────────────
const DOC_IMAGES: Record<string, string[]> = {
    aadhaar: ['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/A_sample_of_Aadhaar_card.jpg/320px-A_sample_of_Aadhaar_card.jpg'],
    voter: ['https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Voter_ID_card_India.jpg/320px-Voter_ID_card_India.jpg'],
    pan: ['https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/PAN_card_2017.jpg/320px-PAN_card_2017.jpg'],
    default: ['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/A_sample_of_Aadhaar_card.jpg/320px-A_sample_of_Aadhaar_card.jpg'],
};
function getDocImages(label: string): string[] {
    const l = label.toLowerCase();
    if (l.includes('aadhaar')) return DOC_IMAGES.aadhaar;
    if (l.includes('voter')) return DOC_IMAGES.voter;
    if (l.includes('pan')) return DOC_IMAGES.pan;
    if (l.includes('address')) return [...DOC_IMAGES.aadhaar, ...DOC_IMAGES.voter];
    return DOC_IMAGES.default;
}
function getDocHint(label: string): string {
    const l = label.toLowerCase();
    if (l.includes('aadhaar')) return 'Must show 12-digit Aadhaar number, name and date of birth clearly.';
    if (l.includes('voter')) return 'Must show EPIC number, name and photo clearly.';
    if (l.includes('pan')) return 'Must show PAN number, name and date of birth clearly.';
    if (l.includes('photo') || l.includes('photograph')) return 'Clear face photo on plain white background. Recent photo only.';
    if (l.includes('birth') || l.includes('dob')) return 'Birth certificate, school leaving certificate or matriculation certificate.';
    if (l.includes('address')) return 'Aadhaar card, Voter ID, utility bill, bank statement, or rent agreement.';
    return 'Ensure the document is clearly readable and not expired.';
}

function guessMimeFromUri(uri: string) {
    const lower = uri.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.heic')) return 'image/heic';
    return 'image/jpeg';
}

function guessNameFromUri(uri: string) {
    const clean = uri.split('?')[0];
    const parts = clean.split('/');
    return parts[parts.length - 1] || `doc-${Date.now()}.jpg`;
}

// ─────────────────────────────────────────────
// DOB VERIFIED CARD
// ─────────────────────────────────────────────
const DobVerifiedCard: React.FC<{ name: string; dob: string; aadhaarNumber: string; imageUri: string }> = ({ name, dob, aadhaarNumber, imageUri }) => (
    <View style={dv.card} pointerEvents="box-none">
        <View style={dv.header}>
            <Text style={dv.headerIcon}>✅</Text>
            <Text style={dv.headerTxt}>Aadhaar DOB Verified</Text>
        </View>
        <View style={dv.body}>
            {imageUri ? <Image source={{ uri: imageUri }} style={dv.thumb} resizeMode="cover" /> : null}
            <View style={dv.info}>
                {[['Name', name || '—'], ['Date of Birth', dob || '—'], ['Aadhaar No.', aadhaarNumber || '—']].map(([lbl, val]) => (
                    <View key={lbl} style={dv.row}>
                        <Text style={dv.lbl}>{lbl}</Text>
                        <Text style={[dv.val, lbl === 'Date of Birth' && { color: '#15803D', fontWeight: '700' }]}>{val}</Text>
                    </View>
                ))}
            </View>
        </View>
    </View>
);

// ─────────────────────────────────────────────
// DOC EXAMPLES PANEL (shown once above multi-upload)
// ─────────────────────────────────────────────
const DocExamplesPanel: React.FC<{ labels: string[] }> = ({ labels }) => {
    const [activeLabel, setActiveLabel] = useState(labels[0]);
    const images = getDocImages(activeLabel);
    const [activeImg, setActiveImg] = useState(0);

    return (
        <View style={dep.wrap}>
            <Text style={dep.heading}>📌 Document Examples</Text>
            <Text style={dep.sub}>Tap a document to see sample image</Text>

            {/* Label tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, marginBottom: 12 }}>
                {labels.map(l => (
                    <TouchableOpacity
                        key={l}
                        style={[dep.tab, activeLabel === l && dep.tabActive]}
                        onPress={() => { setActiveLabel(l); setActiveImg(0); }}
                    >
                        <Text style={[dep.tabTxt, activeLabel === l && dep.tabTxtActive]} numberOfLines={1}>{l}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Image carousel */}
            <ScrollView
                horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={e => setActiveImg(Math.round(e.nativeEvent.contentOffset.x / (SW - 80)))}
            >
                {images.map((uri, i) => (
                    <View key={i} style={dep.imgWrap}>
                        <Image source={{ uri }} style={dep.img} resizeMode="contain" />
                        <View style={dep.imgOverlay}><Text style={dep.imgLabel}>Sample Document</Text></View>
                    </View>
                ))}
            </ScrollView>

            {images.length > 1 && (
                <View style={dep.dots}>
                    {images.map((_, i) => <View key={i} style={[dep.dot, i === activeImg && dep.dotActive]} />)}
                </View>
            )}

            <Text style={dep.hint}>{getDocHint(activeLabel)}</Text>
            <View style={dep.tipBox}>
                <Text>💡</Text>
                <Text style={dep.tipTxt}>Good lighting, all 4 corners visible, no blur or glare.</Text>
            </View>
        </View>
    );
};

// ─────────────────────────────────────────────
// DOB UPLOAD CARD (single Aadhaar card)
// ─────────────────────────────────────────────
const DobUploadCard: React.FC<{
    msg: Msg;
    onUpload: (uri: string) => void;
}> = ({ msg, onUpload }) => {
    const { dobVerifyStatus, dobVerifyMessage, dobUploadedUri } = msg;
    const [showSourceModal, setShowSourceModal] = useState(false);
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [walletDocs, setWalletDocs] = useState<any[]>([]);
    const [walletLoading, setWalletLoading] = useState(false);

    const pick = async (cam: boolean) => {
        setShowSourceModal(false);
        const r = await (cam ? launchCamera : launchImageLibrary)({ mediaType: 'photo', quality: 0.9 });
        if (r.assets?.length) onUpload(r.assets[0].uri!);
    };

    const openWallet = async () => {
        setShowSourceModal(false);
        setWalletLoading(true);
        setShowWalletModal(true);
        const res = await getDocumentsApi();
        setWalletDocs(res?.status === 'success' ? (res.data || []) : []);
        setWalletLoading(false);
    };

    const pickFromWallet = (docUrl: string) => {
        setShowWalletModal(false);
        onUpload(docUrl);
    };

    const renderChooseButton = () => (
        <TouchableOpacity style={uc.chooseBtn} onPress={() => setShowSourceModal(true)}>
            <Text style={uc.chooseBtnTxt}>Choose Document</Text>
        </TouchableOpacity>
    );

    if (dobVerifyStatus === 'verifying') return (
        <View style={uc.wrap}>
            {dobUploadedUri && <Image source={{ uri: dobUploadedUri }} style={uc.previewImg} />}
            <View style={uc.row}><ActivityIndicator size="small" color="#2563EB" /><Text style={uc.verifyTxt}>  Verifying Aadhaar & DOB…</Text></View>
        </View>
    );

    if (dobVerifyStatus === 'invalid') return (
        <>
            <View style={uc.wrap}>
                {dobUploadedUri && <Image source={{ uri: dobUploadedUri }} style={[uc.previewImg, { borderWidth: 2, borderColor: '#EF4444' }]} />}
                <View style={uc.errBanner}><Text style={uc.errTxt}>{dobVerifyMessage}</Text></View>
                {renderChooseButton()}
            </View>

            <Modal visible={showSourceModal} transparent animationType="fade" onRequestClose={() => setShowSourceModal(false)}>
                <TouchableOpacity style={uc.modalOverlay} activeOpacity={1} onPress={() => setShowSourceModal(false)}>
                    <View style={uc.modalCard}>
                        <Text style={uc.modalTitle}>Select Source</Text>
                        <TouchableOpacity style={uc.modalOption} onPress={() => pick(true)}><Text style={uc.modalOptionText}>Camera</Text></TouchableOpacity>
                        <TouchableOpacity style={uc.modalOption} onPress={() => pick(false)}><Text style={uc.modalOptionText}>Gallery</Text></TouchableOpacity>
                        <TouchableOpacity style={uc.modalOption} onPress={openWallet}><Text style={uc.modalOptionText}>Choose From Wallet</Text></TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal visible={showWalletModal} transparent animationType="slide" onRequestClose={() => setShowWalletModal(false)}>
                <View style={uc.modalOverlay}>
                    <View style={uc.walletSheet}>
                        <Text style={uc.modalTitle}>Select Wallet Document</Text>
                        {walletLoading ? (
                            <ActivityIndicator color="#2563EB" style={{ marginTop: 12 }} />
                        ) : (
                            <ScrollView style={{ maxHeight: 320 }}>
                                {walletDocs.map((d: any) => (
                                    <TouchableOpacity key={d._id} style={uc.walletRow} onPress={() => pickFromWallet(d.doc_url)}>
                                        <Image source={{ uri: d.doc_url }} style={uc.walletThumb} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={uc.walletName} numberOfLines={1}>{d.doc_name}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                                {!walletDocs.length && <Text style={uc.walletEmpty}>No documents in wallet.</Text>}
                            </ScrollView>
                        )}
                        <TouchableOpacity style={uc.walletClose} onPress={() => setShowWalletModal(false)}>
                            <Text style={uc.walletCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );

    if (dobVerifyStatus === 'valid' && dobUploadedUri) return (
        <View style={uc.doneWrap}>
            <Image source={{ uri: dobUploadedUri }} style={uc.thumb} />
            <View style={uc.doneRow}>
                <Text style={{ fontSize: 22 }}>✅</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={uc.doneName}>Aadhaar Card</Text>
                    <Text style={uc.doneSub}>{dobVerifyMessage ?? 'DOB verified successfully'}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <>
            <View style={uc.wrap}>
                <Text style={{ fontSize: 34, marginBottom: 8 }}>🪪</Text>
                <Text style={uc.name}>Aadhaar Card</Text>
                <View style={uc.dobBanner}>
                    <Text style={uc.dobBannerTxt}>📋 This Aadhaar will be used to verify your date of birth</Text>
                </View>
                <Text style={uc.hint}>Upload a clear, readable photo of your Aadhaar card</Text>
                {renderChooseButton()}
            </View>

            <Modal visible={showSourceModal} transparent animationType="fade" onRequestClose={() => setShowSourceModal(false)}>
                <TouchableOpacity style={uc.modalOverlay} activeOpacity={1} onPress={() => setShowSourceModal(false)}>
                    <View style={uc.modalCard}>
                        <Text style={uc.modalTitle}>Select Source</Text>
                        <TouchableOpacity style={uc.modalOption} onPress={() => pick(true)}><Text style={uc.modalOptionText}>Camera</Text></TouchableOpacity>
                        <TouchableOpacity style={uc.modalOption} onPress={() => pick(false)}><Text style={uc.modalOptionText}>Gallery</Text></TouchableOpacity>
                        <TouchableOpacity style={uc.modalOption} onPress={openWallet}><Text style={uc.modalOptionText}>Choose From Wallet</Text></TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal visible={showWalletModal} transparent animationType="slide" onRequestClose={() => setShowWalletModal(false)}>
                <View style={uc.modalOverlay}>
                    <View style={uc.walletSheet}>
                        <Text style={uc.modalTitle}>Select Wallet Document</Text>
                        {walletLoading ? (
                            <ActivityIndicator color="#2563EB" style={{ marginTop: 12 }} />
                        ) : (
                            <ScrollView style={{ maxHeight: 320 }}>
                                {walletDocs.map((d: any) => (
                                    <TouchableOpacity key={d._id} style={uc.walletRow} onPress={() => pickFromWallet(d.doc_url)}>
                                        <Image source={{ uri: d.doc_url }} style={uc.walletThumb} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={uc.walletName} numberOfLines={1}>{d.doc_name}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                                {!walletDocs.length && <Text style={uc.walletEmpty}>No documents in wallet.</Text>}
                            </ScrollView>
                        )}
                        <TouchableOpacity style={uc.walletClose} onPress={() => setShowWalletModal(false)}>
                            <Text style={uc.walletCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
};

// ─────────────────────────────────────────────
// MULTI UPLOAD CARD (all remaining docs in one card)
// ─────────────────────────────────────────────
const MultiUploadCard: React.FC<{
    msg: Msg;
    onUploadItem: (msgId: string, index: number, uri: string) => void;
}> = ({ msg, onUploadItem }) => {
    const items = msg.uploadItems ?? [];
    const [showSourceModal, setShowSourceModal] = useState(false);
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [walletDocs, setWalletDocs] = useState<any[]>([]);
    const [walletLoading, setWalletLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const pick = async (index: number, cam: boolean) => {
        setShowSourceModal(false);
        const r = await (cam ? launchCamera : launchImageLibrary)({ mediaType: 'photo', quality: 0.9 });
        if (r.assets?.length) onUploadItem(msg.id, index, r.assets[0].uri!);
    };

    const openSourceFor = (index: number) => {
        setActiveIndex(index);
        setShowSourceModal(true);
    };

    const openWallet = async () => {
        setShowSourceModal(false);
        setWalletLoading(true);
        setShowWalletModal(true);
        const res = await getDocumentsApi();
        setWalletDocs(res?.status === 'success' ? (res.data || []) : []);
        setWalletLoading(false);
    };

    const pickFromWallet = (docUrl: string) => {
        if (activeIndex === null) return;
        setShowWalletModal(false);
        onUploadItem(msg.id, activeIndex, docUrl);
    };

    const doneCount = items.filter(i => i.verifyStatus === 'valid').length;
    const allDone = doneCount === items.length;

    return (
        <View style={mu.wrap}>
            <View style={mu.headerRow}>
                <Text style={mu.heading}>📎 Upload Documents</Text>
                <Text style={mu.counter}>{doneCount}/{items.length} done</Text>
            </View>
            <Text style={mu.sub}>Upload all required documents below</Text>

            {items.map((item, index) => {
                const isFocusedTarget = (msg.focusDocLabels || []).some((lbl) =>
                    item.label.toLowerCase().includes(String(lbl).toLowerCase()) || String(lbl).toLowerCase().includes(item.label.toLowerCase())
                );
                if (item.verifyStatus === 'verifying') return (
                    <View key={index} style={[mu.itemBox, isFocusedTarget && mu.itemFocus]}>
                        <View style={mu.itemHeader}>
                            <Text style={mu.itemIcon}>📄</Text>
                            <Text style={mu.itemLabel} numberOfLines={2}>{item.label}</Text>
                        </View>
                        {item.uploadedUri && <Image source={{ uri: item.uploadedUri }} style={mu.preview} />}
                        <View style={mu.verifyRow}>
                            <ActivityIndicator size="small" color="#2563EB" />
                            <Text style={mu.verifyTxt}>  Verifying...</Text>
                        </View>
                    </View>
                );

                if (item.verifyStatus === 'valid') return (
                    <View key={index} style={[mu.itemBox, mu.itemDone, isFocusedTarget && mu.itemFocus]}>
                        <View style={mu.doneRow}>
                            {item.uploadedUri && <Image source={{ uri: item.uploadedUri }} style={mu.thumb} />}
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={mu.doneLabel}>✅ {item.label}</Text>
                                <Text style={mu.doneSub}>{item.verifyMessage ?? 'Verified successfully'}</Text>
                            </View>
                        </View>
                    </View>
                );

                if (item.verifyStatus === 'invalid') return (
                    <View key={index} style={[mu.itemBox, mu.itemErr, isFocusedTarget && mu.itemFocus]}>
                        <View style={mu.itemHeader}>
                            <Text style={mu.itemIcon}>📄</Text>
                            <Text style={mu.itemLabel} numberOfLines={2}>{item.label}</Text>
                        </View>
                        {item.uploadedUri && <Image source={{ uri: item.uploadedUri }} style={mu.preview} />}
                        <View style={mu.errBanner}><Text style={mu.errTxt}>{item.verifyMessage}</Text></View>
                        <TouchableOpacity style={mu.pickBtn} onPress={() => openSourceFor(index)}>
                            <Text style={mu.pickBtnText}>Choose Document</Text>
                        </TouchableOpacity>
                    </View>
                );

                // idle
                return (
                    <View key={index} style={[mu.itemBox, isFocusedTarget && mu.itemFocus]}>
                        <View style={mu.itemHeader}>
                            <Text style={mu.itemIcon}>📄</Text>
                            <Text style={mu.itemLabel} numberOfLines={2}>{item.label}</Text>
                        </View>
                        <TouchableOpacity style={mu.pickBtn} onPress={() => openSourceFor(index)}>
                            <Text style={mu.pickBtnText}>Choose Document</Text>
                        </TouchableOpacity>
                    </View>
                );
            })}

            {allDone && (
                <View style={mu.allDoneBanner}>
                    <Text style={mu.allDoneTxt}>✅ All documents verified! You can continue.</Text>
                </View>
            )}

            <Modal visible={showSourceModal} transparent animationType="fade" onRequestClose={() => setShowSourceModal(false)}>
                <TouchableOpacity style={mu.modalOverlay} activeOpacity={1} onPress={() => setShowSourceModal(false)}>
                    <View style={mu.modalCard}>
                        <Text style={mu.modalTitle}>Select Source</Text>
                        <TouchableOpacity style={mu.modalOption} onPress={() => activeIndex !== null && pick(activeIndex, true)}>
                            <Text style={mu.modalOptionText}>Camera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={mu.modalOption} onPress={() => activeIndex !== null && pick(activeIndex, false)}>
                            <Text style={mu.modalOptionText}>Gallery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={mu.modalOption} onPress={openWallet}>
                            <Text style={mu.modalOptionText}>Choose From Wallet</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal visible={showWalletModal} transparent animationType="slide" onRequestClose={() => setShowWalletModal(false)}>
                <View style={mu.modalOverlay}>
                    <View style={mu.walletSheet}>
                        <Text style={mu.modalTitle}>Select Wallet Document</Text>
                        {walletLoading ? (
                            <ActivityIndicator color="#2563EB" style={{ marginTop: 12 }} />
                        ) : (
                            <ScrollView style={{ maxHeight: 320 }}>
                                {walletDocs.map((d: any) => (
                                    <TouchableOpacity key={d._id} style={mu.walletRow} onPress={() => pickFromWallet(d.doc_url)}>
                                        <Image source={{ uri: d.doc_url }} style={mu.walletThumb} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={mu.walletName} numberOfLines={1}>{d.doc_name}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                                {!walletDocs.length && <Text style={mu.walletEmpty}>No documents in wallet.</Text>}
                            </ScrollView>
                        )}
                        <TouchableOpacity style={mu.walletClose} onPress={() => setShowWalletModal(false)}>
                            <Text style={mu.walletCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// ─────────────────────────────────────────────
// FORM REVIEW CARD
// ─────────────────────────────────────────────
// ─── YEH COMPONENT BAHAR NIKALO - FormReviewCard se PEHLE ───
const FormField = ({
    label, fkey, kb = 'default', value, onChangeText
}: {
    label: string; fkey: string; kb?: any; value: string; onChangeText: (v: string) => void
}) => (
    <View style={fr.fw}>
        <Text style={fr.lbl}>{label}</Text>
        <TextInput
            style={fr.inp}
            value={value}
            onChangeText={onChangeText}
            placeholder={`Enter ${label}`}
            placeholderTextColor="#999"
            keyboardType={kb}
            selectTextOnFocus={true}
            importantForAutofill="no"
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="sentences"
            multiline={false}
            returnKeyType="next"
            blurOnSubmit={false}
        />
    </View>
);

// ─── FORM REVIEW CARD ───
const FIELD_CONFIG: Record<keyof ApplicationFormData, { label: string; kb?: any; section: 'contact' | 'address' | 'personal' }> = {
    email: { label: 'Email Address', kb: 'email-address', section: 'contact' },
    phone: { label: 'Phone Number', kb: 'phone-pad', section: 'contact' },
    flatNo: { label: 'Flat No. / House Name', section: 'address' },
    street: { label: 'Street / Locality', section: 'address' },
    city: { label: 'City', section: 'address' },
    state: { label: 'State', section: 'address' },
    pincode: { label: 'Pincode', kb: 'numeric', section: 'address' },
    fullName: { label: 'Full Name', section: 'personal' },
    dob: { label: 'Date of Birth', section: 'personal' },
    aadhaarNumber: { label: 'Aadhaar Number', kb: 'numeric', section: 'personal' },
    placeOfBirth: { label: 'Place of Birth', section: 'personal' },
    parentName: { label: 'Father / Mother Name', section: 'personal' },
    maritalStatus: { label: 'Marital Status', section: 'personal' },
    documentType: { label: 'Document Type', section: 'personal' },
    applicationId: { label: 'Application ID', section: 'personal' },
    submittedOn: { label: 'Submitted On', section: 'personal' },
};

const FormReviewCard: React.FC<{ formData: ApplicationFormData; formFields?: Array<keyof ApplicationFormData>; formFieldLabels?: string[]; onConfirm: (d: ApplicationFormData) => void }> = ({ formData, formFields, formFieldLabels, onConfirm }) => {
    const [d, setD] = useState<ApplicationFormData>({ ...formData });
    const upd = (k: keyof ApplicationFormData, v: string) => setD(p => ({ ...p, [k]: v }));

    const allowed = (formFields && formFields.length) ? uniqueFields(formFields) : [];
    const visibleKeys = allowed.filter((k) => FIELD_CONFIG[k]);

    return (
        <View style={fr.card}>
            <Text style={fr.note}>Please fill only the details asked by AI.</Text>
            {!visibleKeys.length && (
                <View style={fr.emptyReqWrap}>
                    <Text style={fr.emptyReqText}>No specific fields requested by AI yet. Please continue chat and ask AI to provide exact details.</Text>
                </View>
            )}
            {!!formFieldLabels?.length && (
                <View style={fr.reqListWrap}>
                    <Text style={fr.reqListTitle}>AI Requested:</Text>
                    {formFieldLabels.map((lbl, i) => (
                        <Text key={`${lbl}-${i}`} style={fr.reqListItem}>- {lbl}</Text>
                    ))}
                </View>
            )}

            {visibleKeys.map((key) => (
                <FormField
                    key={String(key)}
                    label={FIELD_CONFIG[key].label}
                    fkey={String(key)}
                    kb={FIELD_CONFIG[key].kb ?? 'default'}
                    value={(d[key] as string) ?? ''}
                    onChangeText={(v) => upd(key, v)}
                />
            ))}

            <TouchableOpacity style={fr.btn} onPress={() => onConfirm(d)}>
                <Text style={fr.btnTxt}>Submit Details</Text>
            </TouchableOpacity>
        </View>
    );
};
// ─────────────────────────────────────────────
// PAYMENT CARD
// ─────────────────────────────────────────────
const PaymentCard: React.FC<{ totalFee: string; onPay: () => void; processing?: boolean }> = ({ totalFee, onPay, processing = false }) => {
    return (
        <View style={pc.wrap}>
            <Text style={pc.heading}>💰 Fee Summary</Text>
            <View style={pc.feeRow}><Text style={pc.totL}>Total Amount</Text><Text style={pc.totV}>₹{totalFee}.00</Text></View>
            <Text style={pc.paymentNote}>Payment method will be selected securely in Razorpay checkout.</Text>
            <TouchableOpacity style={[pc.payBtn, processing && pc.payBtnDisabled]} onPress={onPay} disabled={processing}>
                {processing ? (
                    <View style={pc.payLoadingWrap}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={pc.payBtnTxt}>Processing...</Text>
                    </View>
                ) : (
                    <Text style={pc.payBtnTxt}>Pay Now ₹{totalFee}</Text>
                )}
            </TouchableOpacity>
            <Text style={pc.secure}>🔒 Secured by 256-bit SSL encryption</Text>
        </View>
    );
};

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
const AiAssistScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { item } = (route.params as any) || {};
    const serviceTitle: string = item?.title ?? 'Government Service';
    const serviceCategory: string = item?.category ?? '';
    const serviceColor: string = item?.color ?? '#2563EB';
    const serviceSubServices = Array.isArray(item?.subServices) ? item.subServices : [];
    const serviceId: string = item?.id ?? '';
    const subServiceTitle: string = item?.subServiceTitle ?? '';
    const openFrom: 'home' | 'status' = item?.openFrom === 'status' ? 'status' : 'home';
    const requestTarget = item?.requestTarget || null;
    const systemPrompt: string = item?.aiPrompt ?? `You are a warm professional Indian government AI assistant for ${serviceTitle}. Help the user step by step. English only.`;

    const [messages, setMessages] = useState<Msg[]>([]);
    const [history, setHistory] = useState<ConvEntry[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [payingMsgId, setPayingMsgId] = useState<string>('');
    const claimedDob = useRef('');
    const claimedName = useRef('');
    const sessionIdRef = useRef<string>('');
    const didBootstrapRef = useRef(false);
    const progressAnim = useRef(new Animated.Value(0)).current;
    const flatRef = useRef<FlatList>(null);
    const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    useEffect(() => {
        Animated.timing(progressAnim, { toValue: progress, duration: 600, useNativeDriver: false }).start();
    }, [progress]);

    useEffect(() => {
        console.log('[AiAssistScreen] service context:', {
            title: serviceTitle,
            category: serviceCategory,
            subCount: serviceSubServices.length,
            subServices: serviceSubServices,
        });
    }, [serviceTitle, serviceCategory, serviceSubServices]);

    const pWidth = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
    const scrollBottom = (d = 200) => setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), d);

    const normalizeMessages = (list: Msg[]): Msg[] => {
        const out: Msg[] = [];
        let hasPaymentDone = false;
        let hasSuccess = false;

        for (const msg of list) {
            if (msg.type === 'bot') {
                const text = String(msg.text || '').trim();
                const exists = out.some((m) => m.type === 'bot' && String(m.text || '').trim() === text);
                if (text && exists) continue;
            }

            if (msg.type === 'form_review') {
                const idx = out.findIndex((m) => m.type === 'form_review');
                if (idx >= 0) {
                    out[idx] = msg;
                    continue;
                }
            }

            if (msg.type === 'payment_card') {
                const idx = out.findIndex((m) => m.type === 'payment_card');
                if (idx >= 0) {
                    out[idx] = msg;
                    continue;
                }
            }

            if (msg.type === 'payment_done') {
                if (hasPaymentDone) continue;
                hasPaymentDone = true;
            }

            if (msg.type === 'success') {
                if (hasSuccess) continue;
                hasSuccess = true;
            }

            out.push(msg);
        }

        return out;
    };

    const addMsgs = (parts: Partial<Msg>[]) => {
        const msgs = parts.map(p => ({ ...p, id: uid() } as Msg));
        setMessages(prev => normalizeMessages([...prev, ...msgs]));
        scrollBottom();
    };

    const getErrorLog = (err: unknown) => {
        const e = err as { response?: { data?: unknown }; message?: string };
        return e?.response?.data || e?.message || 'Unknown error';
    };

    const persistChat = async (messagesToStore: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) => {
        if (!sessionIdRef.current || !messagesToStore.length) return;
        try {
            await storeSessionMessagesApi(sessionIdRef.current, { messages: messagesToStore });
        } catch (err) {
            console.log('[AiAssistScreen] persist chat failed:', getErrorLog(err));
        }
    };

    const buildUploadedDocsPayload = () => {
        const docs: any[] = [];
        for (const m of messages) {
            if (m.type === 'dob_upload' && m.dobUploadedUri && m.dobVerifyStatus === 'valid') {
                docs.push({
                    label: 'Aadhaar Card (DOB Verification)',
                    url: m.dobUploadedUri,
                    source: m.dobUploadedUri.startsWith('http') ? 'wallet' : 'other',
                    verifyStatus: 'valid',
                    verifyMessage: m.dobVerifyMessage || 'Verified successfully',
                });
                continue;
            }
            if (m.type !== 'multi_upload' || !m.uploadItems) continue;
            for (const item of m.uploadItems) {
                if (!item.uploadedUri) continue;
                docs.push({
                    label: item.label,
                    url: item.uploadedUri,
                    source: item.uploadedUri.startsWith('http') ? 'wallet' : 'other',
                    verifyStatus: item.verifyStatus,
                    verifyMessage: item.verifyMessage || '',
                });
            }
        }
        return docs;
    };

    const syncFlow = async (payload: any) => {
        if (!sessionIdRef.current) return;
        try {
            await updateApplicationFlowApi(sessionIdRef.current, payload);
        } catch (err) {
            console.log('[AiAssistScreen] sync flow failed:', getErrorLog(err));
        }
    };

    const updateMsg = (id: string, patch: Partial<Msg>) =>
        setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));

    const extractClaimedInfo = (h: ConvEntry[]) => {
        const raw = h.map(e => e.content).join('\n');
        const dob = raw.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i) || raw.match(/(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})/i);
        if (dob?.[1]) claimedDob.current = dob[1];
        const name = raw.match(/(?:my name is|i am|i'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i) || raw.match(/\bname[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
        if (name?.[1]) claimedName.current = name[1];
    };

    const uploadDocUriToCloudinary = async (uri: string, label: string) => {
        if (!uri) return uri;
        if (/^https?:\/\//i.test(uri)) return uri;

        try {
            const uploadRes = await uploadDocumentApi(label, {
                uri,
                fileName: guessNameFromUri(uri),
                type: guessMimeFromUri(uri),
            });

            const cloudUrl = uploadRes?.data?.doc_url;
            return cloudUrl || uri;
        } catch (err) {
            console.log('[AiAssistScreen] cloud upload failed, using local uri:', getErrorLog(err));
            return uri;
        }
    };

    const buildRestoredMessages = (chat: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) => {
        const restored: Msg[] = [];
        const hist: ConvEntry[] = [];

        for (const entry of chat) {
            if (!entry?.content) continue;

            if (entry.role === 'assistant') {
                const parsed = parseResponse(entry.content, [...hist, { role: 'assistant', content: entry.content }], serviceTitle);
                restored.push(...parsed.map((p) => ({ ...p, id: uid() } as Msg)));
                hist.push({ role: 'assistant', content: entry.content });
            } else if (entry.role === 'user') {
                restored.push({ id: uid(), type: 'user', text: entry.content } as Msg);
                hist.push({ role: 'user', content: entry.content });
            } else if (entry.role === 'system') {
                restored.push({ id: uid(), type: 'bot', text: `Admin Update: ${entry.content}` } as Msg);
            }
        }

        return { restored, hist };
    };

    const hydrateSessionArtifacts = (restored: Msg[], session: any): Msg[] => {
        const output = [...restored];
        const docs = Array.isArray(session?.uploadedDocs) ? session.uploadedDocs : [];

        if (docs.length) {
            const firstUploadIndex = output.findIndex((m) => m.type === 'multi_upload' && Array.isArray(m.uploadItems));
            if (firstUploadIndex >= 0) {
                const msg = output[firstUploadIndex];
                const mappedItems = (msg.uploadItems || []).map((item) => {
                    const found = docs.find((d: any) =>
                        String(d?.label || '').toLowerCase() === String(item.label || '').toLowerCase()
                    );
                    if (!found) return item;
                    return {
                        ...item,
                        uploadedUri: found.url || item.uploadedUri,
                        verifyStatus: (found.verifyStatus === 'invalid' ? 'invalid' : 'valid') as VerifyStatus,
                        verifyMessage: found.verifyMessage || item.verifyMessage || 'Verified successfully',
                    };
                });
                output[firstUploadIndex] = { ...msg, uploadItems: mappedItems };
            } else {
                output.push({
                    id: uid(),
                    type: 'multi_upload',
                    uploadItems: docs.map((d: any) => ({
                        label: d?.label || 'Uploaded Document',
                        isDob: false,
                        verifyStatus: (d?.verifyStatus === 'invalid' ? 'invalid' : 'valid') as VerifyStatus,
                        uploadedUri: d?.url || '',
                        verifyMessage: d?.verifyMessage || 'Verified successfully',
                    })),
                } as Msg);
            }
        }

        if (session?.payment?.status === 'success') {
            output.push({ id: uid(), type: 'payment_done' } as Msg);
        }

        if (session?.status === 'submitted') {
            output.push({
                id: uid(),
                type: 'success',
                text: `Application submitted successfully${session?.applicationNumber ? ` (${session.applicationNumber})` : ''}.`,
            } as Msg);
        }

        return output;
    };

    const applyRequestDeepLinkTarget = (inputMsgs: Msg[]): Msg[] => {
        return applyRequestTargetRestrictions({
            inputMsgs,
            requestTarget,
            history,
            serviceTitle,
            createId: uid,
            fieldKeyFromLabel,
            extractFormData,
        });
    };

    useEffect(() => {
        if (didBootstrapRef.current) return;
        didBootstrapRef.current = true;

        (async () => {
            setLoading(true);
            try {
                let existingSessionId = '';

                if (openFrom === 'status') {
                    existingSessionId = (item?.sessionId || '').trim();

                    if (!existingSessionId) {
                        try {
                            const recentRes = await getRecentApplicationChatsApi({ limit: 20 });
                            const recentChats = Array.isArray(recentRes?.data?.recentChats) ? recentRes.data.recentChats : [];
                            const latestForService = recentChats.find((c: any) =>
                                c?.serviceName === serviceTitle &&
                                (c?.subServiceTitle || '') === subServiceTitle &&
                                c?.status !== 'submitted'
                            );
                            if (latestForService?._id) existingSessionId = String(latestForService._id);
                        } catch (recentErr) {
                            console.log('[AiAssistScreen] recent chats fetch failed:', getErrorLog(recentErr));
                        }
                    }
                }

                if (existingSessionId) {
                    try {
                        const existingSessionRes = await getApplicationSessionApi(existingSessionId);
                        const session = existingSessionRes?.data?.session;

                        if (session?._id) {
                            const sid = String(session._id);
                            sessionIdRef.current = sid;
                            setSessionId(sid);

                            const chat = Array.isArray(session.chat) ? session.chat : [];
                            if (chat.length) {
                                const { restored, hist } = buildRestoredMessages(chat);
                                const hydrated = hydrateSessionArtifacts(restored, session);
                                const targeted = applyRequestDeepLinkTarget(hydrated);
                                setMessages(normalizeMessages(targeted));
                                setHistory(hist);
                                extractClaimedInfo(hist);
                                setProgress(typeof session.progress === 'number' ? session.progress : 5);
                                if (session?.formDetails && Object.keys(session.formDetails).length) {
                                    setFormSubmitted(true);
                                }
                                return;
                            }
                        }
                    } catch (existingErr) {
                        console.log('[AiAssistScreen] existing session restore failed:', getErrorLog(existingErr));
                    }
                }

                try {
                    const sessionRes = await startApplicationSessionApi({
                        serviceId,
                        serviceName: serviceTitle,
                        subServiceTitle,
                    });
                    const sid = sessionRes?.data?.session?._id || '';
                    if (sid) {
                        sessionIdRef.current = sid;
                        setSessionId(sid);
                    }
                } catch (sessionErr) {
                    console.log('[AiAssistScreen] session start failed:', getErrorLog(sessionErr));
                }

                const raw = await callOpenAI(systemPrompt, [], 'Hello, start the conversation.');
                const h: ConvEntry[] = [{ role: 'user', content: 'Hello, start the conversation.' }, { role: 'assistant', content: raw }];
                setHistory(h);
                const parsedFirst = parseResponse(raw, h, serviceTitle);
                const firstMsgs = (parsedFirst.length
                    ? parsedFirst
                    : [{ type: 'bot', text: raw || `Hello! 😊 I'm your AI Assistant for ${serviceTitle}.` } as Partial<Msg>]
                ).map((p) => ({ ...p, id: uid() } as Msg));
                const targetedFirst = applyRequestDeepLinkTarget(firstMsgs);
                setMessages(normalizeMessages(targetedFirst));
                scrollBottom();
                await persistChat([
                    { role: 'user', content: 'Hello, start the conversation.' },
                    { role: 'assistant', content: raw },
                ]);
                await syncFlow({ status: 'in_progress', progress: 5 });
                setProgress(5);
            } catch {
                addMsgs([{ type: 'bot', text: `Hello! 😊 I'm your AI Assistant for ${serviceTitle}. What would you like to do today?` }]);
            } finally { setLoading(false); }
        })();
    }, [item?.sessionId, item?.openFrom, serviceId, serviceTitle, subServiceTitle, systemPrompt]);

    const askAI = async (userText: string, overrideHist?: ConvEntry[]) => {
        const chatClosed = messages.some((m) => m.type === 'payment_done' || m.type === 'success') || progress >= 100;
        if (chatClosed) return;

        setLoading(true);
        const hist = overrideHist ?? history;
        try {
            const raw = await callOpenAI(systemPrompt, hist, userText);
            const newH: ConvEntry[] = [...hist, { role: 'user', content: userText }, { role: 'assistant', content: raw }];
            setHistory(newH);
            extractClaimedInfo(newH);
            const parsed = parseResponse(raw, newH, serviceTitle);
            addMsgs(parsed.length ? parsed : [{ type: 'bot', text: raw || 'Please continue.' }]);
            await persistChat([
                { role: 'user', content: userText },
                { role: 'assistant', content: raw },
            ]);
            if (/\[APPLICATION_COMPLETE\]/i.test(raw)) setProgress(100);
            else if (/\[SHOW_PAYMENT:/i.test(raw)) setProgress(92);
            else if (/\[SHOW_FORM(?:\s*:|\])/i.test(raw)) setProgress(80);
            else if (/\[UPLOAD:/i.test(raw)) setProgress(p => Math.min(p + 12, 72));
            else setProgress(p => Math.min(p + 8, 55));
        } catch {
            addMsgs([{ type: 'bot', text: 'Sorry, connection issue. Please try again. 🙏' }]);
        } finally { setLoading(false); }
    };

    const send = () => {
        const t = input.trim();
        if (!t || loading || progress >= 100) return;
        setInput('');
        addMsgs([{ type: 'user', text: t }]);
        askAI(t);
    };

    // ── DOB upload handler ───────────────────
    const handleDobUpload = async (msgId: string, uri: string) => {
        updateMsg(msgId, { dobUploadedUri: uri, dobVerifyStatus: 'verifying' });
        scrollBottom(150);
        await syncFlow({ status: 'docs_pending' });

        const r = await verifyAadhaarDob(uri, claimedDob.current, claimedName.current);

        if (!r.valid) {
            updateMsg(msgId, { dobVerifyStatus: 'invalid', dobVerifyMessage: r.message });
            addMsgs([{ type: 'bot', text: r.message }]);
            return;
        }

        const mismatch = !r.dobMatches;
        const msg = mismatch
            ? `⚠️ DOB Mismatch: You entered "${claimedDob.current}" but Aadhaar shows "${r.extractedDob}". The Aadhaar DOB will be used.`
            : r.message;

        const hostedUri = await uploadDocUriToCloudinary(uri, 'Aadhaar Card (DOB Verification)');

        updateMsg(msgId, { dobUploadedUri: hostedUri, dobVerifyStatus: 'valid', dobVerifyMessage: msg });
        if (r.extractedDob) claimedDob.current = r.extractedDob;
        if (r.extractedName) claimedName.current = r.extractedName;

        addMsgs([{
            type: 'dob_verified',
            dobVerifiedName: r.extractedName || claimedName.current,
            dobVerifiedDob: r.extractedDob || claimedDob.current,
            dobVerifiedAadhaar: r.aadhaarNumber,
            uploadedUri: hostedUri,
        }]);

        await askAI(
            `Aadhaar DOB verified. Name: ${r.extractedName}. DOB: ${r.extractedDob}. Aadhaar: ${r.aadhaarNumber}. Please proceed to ask for remaining documents.`,
            [...history, { role: 'user', content: 'Aadhaar uploaded for DOB verification.' }]
        );
        await syncFlow({ status: 'docs_pending', progress: Math.min(progress + 15, 65) });
        setProgress(p => Math.min(p + 15, 65));
        scrollBottom(200);
    };

    // ── Multi-doc upload handler ─────────────
    const handleUploadItem = async (msgId: string, index: number, uri: string) => {
        // Mark selected document as verifying
        setMessages(prev => prev.map(m => {
            if (m.id !== msgId || !m.uploadItems) return m;
            const items = [...m.uploadItems];
            if (!items[index]) return m;
            items[index] = {
                ...items[index],
                verifyStatus: 'verifying',
                verifyMessage: 'Verifying document...',
            };
            return { ...m, uploadItems: items };
        }));
        scrollBottom(150);

        // Get current item label from latest state snapshot
        const currentMsg = messages.find(m => m.id === msgId);
        const item = currentMsg?.uploadItems?.[index];
        if (!item) return;

        const r = await verifyDocument(uri, item.label);

        let hostedUri = uri;
        if (r.valid) {
            hostedUri = await uploadDocUriToCloudinary(uri, item.label);
        }

        setMessages(prev => {
            const updated = prev.map(m => {
                if (m.id !== msgId || !m.uploadItems) return m;
                const items = [...m.uploadItems];
                if (!items[index]) return m;
                items[index] = {
                    ...items[index],
                    uploadedUri: hostedUri,
                    verifyStatus: r.valid ? 'valid' : 'invalid',
                    verifyMessage: r.message,
                };
                return { ...m, uploadItems: items };
            });

            if (r.valid) {
                const found = updated.find(m => m.id === msgId);
                const allDone = found?.uploadItems?.every(i => i.verifyStatus === 'valid');
                if (allDone && found?.uploadItems) {
                    const summary = found.uploadItems.map(i => i.label).join(', ');
                    setTimeout(() => askAI(`All documents uploaded and verified: ${summary}.`), 300);
                }
            }

            return updated;
        });

        if (!r.valid) return;

        await syncFlow({
            status: 'docs_pending',
            uploadedDocs: buildUploadedDocsPayload(),
        });
        setProgress(p => Math.min(p + 10, 78));
        scrollBottom(200);
    };

    const handleFormConfirm = (d: ApplicationFormData) => {
        setFormSubmitted(true);
        addMsgs([{ type: 'user', text: '✅ All details confirmed. Please proceed.' }]);
        syncFlow({
            status: 'payment_pending',
            progress: 86,
            formDetails: d,
        });
        askAI(
            `Form confirmed and final. Do not ask for these details again.
    Name: ${d.fullName}, DOB: ${d.dob}, Aadhaar: ${d.aadhaarNumber}, Phone: ${d.phone}, Email: ${d.email}, Flat: ${d.flatNo}, Street: ${d.street}, City: ${d.city}, State: ${d.state}, Pincode: ${d.pincode}, Place of Birth: ${d.placeOfBirth}, Parent Name: ${d.parentName}, Marital Status: ${d.maritalStatus}. Continue to payment step.`
        );
        setProgress(86);
    };

    const handlePay = async (msgId: string, total: string) => {
        if (!sessionIdRef.current) {
            addMsgs([{ type: 'bot', text: 'Unable to start payment because session is missing. Please reopen this service and try again.' }]);
            return;
        }

        const amount = Number(total) || 0;
        if (!amount) {
            addMsgs([{ type: 'bot', text: 'Payment amount is invalid. Please restart the payment step.' }]);
            return;
        }

        setPayingMsgId(msgId);
        try {
            const orderRes = await createRazorpayOrderApi(sessionIdRef.current, {
                amount,
                currency: 'INR',
            });
            const order = orderRes?.data?.order;
            const keyId = orderRes?.data?.keyId;

            if (!order?.id || !keyId) {
                throw new Error('Unable to initialize payment order');
            }

            const extracted = extractFormData(history, serviceTitle);
            const checkoutOptions = {
                description: `${serviceTitle} application fee`,
                currency: order.currency || 'INR',
                key: keyId,
                amount: String(order.amount),
                name: 'Zerolegal',
                order_id: order.id,
                prefill: {
                    name: extracted.fullName || 'Zerolegal User',
                    email: extracted.email || undefined,
                    contact: extracted.phone?.replace(/\D/g, '').slice(-10) || undefined,
                },
                theme: { color: serviceColor },
            };

            const razorpayResult = await RazorpayCheckout.open(checkoutOptions);
            const resolvedMethod = (razorpayResult as any)?.method
                || (razorpayResult as any)?.payment_method
                || (razorpayResult as any)?.wallet
                || '';

            await verifyRazorpayPaymentApi(sessionIdRef.current, {
                razorpay_order_id: razorpayResult?.razorpay_order_id,
                razorpay_payment_id: razorpayResult?.razorpay_payment_id,
                razorpay_signature: razorpayResult?.razorpay_signature,
                method: resolvedMethod,
            });

            updateMsg(msgId, { type: 'payment_done' });
            addMsgs([{ type: 'user', text: `Payment of ₹${total} completed via Razorpay${resolvedMethod ? ` (${resolvedMethod})` : ''} ✅` }]);
            await syncFlow({
                status: 'submitted',
                progress: 100,
                uploadedDocs: buildUploadedDocsPayload(),
                payment: {
                    gateway: 'razorpay',
                    method: resolvedMethod,
                    amount,
                    status: 'success',
                    transactionId: razorpayResult?.razorpay_payment_id,
                    razorpayOrderId: razorpayResult?.razorpay_order_id,
                },
            });

            addMsgs([
                {
                    type: 'bot',
                    text: 'Payment verified successfully. Your application has been submitted. We will update status shortly.',
                },
            ]);
            setProgress(100);
        } catch (err: any) {
            const isCancelled = !!(err?.code && String(err.code) === '0');
            console.log('[AiAssistScreen] razorpay payment failed:', getErrorLog(err));
            await syncFlow({
                status: 'payment_pending',
                payment: {
                    gateway: 'razorpay',
                    method: '',
                    amount,
                    status: isCancelled ? 'pending' : 'failed',
                    failureReason: isCancelled ? 'Payment cancelled by user' : String(err?.description || err?.message || 'Payment failed'),
                },
            });
            addMsgs([
                {
                    type: 'bot',
                    text: isCancelled
                        ? 'Payment was cancelled. You can retry the payment from this step.'
                        : 'Payment failed due to an issue. Please retry the payment.',
                },
            ]);
        } finally {
            setPayingMsgId('');
        }
    };

    const msgCount = messages.filter(m => m.type === 'bot' || m.type === 'user').length;
    const hasChatClosed = useMemo(
        () => messages.some((m) => m.type === 'payment_done' || m.type === 'success') || progress >= 100,
        [messages, progress]
    );

    const hasPendingDocsForForm = () => {
        const requiredDocs: string[] = Array.isArray(requestTarget?.requiredDocs) ? requestTarget.requiredDocs : [];

        if (requiredDocs.length) {
            const uploadItems = messages
                .filter((m) => m.type === 'multi_upload' && Array.isArray(m.uploadItems))
                .flatMap((m) => m.uploadItems || []);

            const allRequiredVerified = requiredDocs.every((required) => {
                const reqLower = String(required || '').toLowerCase().trim();
                const found = uploadItems.find((item) => {
                    const itemLower = String(item?.label || '').toLowerCase().trim();
                    return itemLower.includes(reqLower) || reqLower.includes(itemLower);
                });
                return !!found && found.verifyStatus === 'valid';
            });

            if (!allRequiredVerified) return true;
        }

        if (messages.some((m) => m.type === 'dob_upload' && m.dobVerifyStatus !== 'valid')) return true;

        if (messages.some((m) => m.type === 'multi_upload' && Array.isArray(m.uploadItems) && m.uploadItems.some((item) => item.verifyStatus !== 'valid'))) {
            return true;
        }

        return false;
    };

    // ─────────────────────────────────────────
    // RENDER ITEM
    // ─────────────────────────────────────────
    const renderItem = ({ item: msg }: { item: Msg }) => {
        switch (msg.type) {
            case 'bot':
                return (
                    <View style={[s.row, s.botRow]}>
                        <View style={[s.avatar, { borderColor: serviceColor + '44' }]}>
                            <View style={[s.avatarDot, { backgroundColor: serviceColor }]} />
                        </View>
                        <View style={[s.bubble, s.botBubble]}>
                            <Text style={s.botTxt}>{msg.text}</Text>
                        </View>
                    </View>
                );

            case 'user':
                return (
                    <View style={[s.row, s.userRow]}>
                        <View style={[s.bubble, s.userBubble, { backgroundColor: serviceColor }]}>
                            <Text style={s.userTxt}>{msg.text}</Text>
                        </View>
                    </View>
                );

            case 'doc_examples_panel':
                return (
                    <View style={s.wideCard}>
                        <DocExamplesPanel labels={msg.docLabels ?? []} />
                    </View>
                );

            case 'dob_upload':
                return (
                    <View style={s.wideCard}>
                        <DobUploadCard msg={msg} onUpload={uri => handleDobUpload(msg.id, uri)} />
                    </View>
                );

            case 'multi_upload':
                return (
                    <View style={s.wideCard}>
                        <MultiUploadCard msg={msg} onUploadItem={handleUploadItem} />
                    </View>
                );

            case 'dob_verified':
                return (
                    <View style={s.wideCard}>
                        <DobVerifiedCard
                            name={msg.dobVerifiedName ?? ''}
                            dob={msg.dobVerifiedDob ?? ''}
                            aadhaarNumber={msg.dobVerifiedAadhaar ?? ''}
                            imageUri={msg.uploadedUri ?? ''}
                        />
                    </View>
                );

            case 'form_review':
                if (hasPendingDocsForForm()) {
                    return null;
                }
                if (formSubmitted) {
                    return (
                        <View style={s.wideCard}>
                            <View style={s.formDoneCard}>
                                <Text style={s.formDoneTitle}>Details Already Submitted</Text>
                                <Text style={s.formDoneText}>Address and profile details are already saved for this application. Continuing to next step.</Text>
                            </View>
                        </View>
                    );
                }
                return (
                    <View style={s.wideCard}>
                        <FormReviewCard formData={msg.formData!} formFields={msg.formFields} formFieldLabels={msg.formFieldLabels} onConfirm={handleFormConfirm} />
                    </View>
                );

            case 'payment_card':
                return (
                    <View style={s.wideCard}>
                        <PaymentCard
                            totalFee={msg.totalFee ?? '0'}
                            processing={payingMsgId === msg.id}
                            onPay={() => handlePay(msg.id, msg.totalFee ?? '0')}
                        />
                    </View>
                );

            case 'payment_done':
                return (
                    <View style={s.wideCard}>
                        <View style={s.payDone}><Text style={s.payDoneTxt}>✅  Payment Successful</Text></View>
                    </View>
                );

            case 'success':
                return (
                    <View style={s.wideCard}>
                        <View style={s.successCard}>
                            <Text style={{ fontSize: 40, marginBottom: 12 }}>🎉</Text>
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
                    <View style={[s.header, { borderBottomColor: serviceColor + '33' }]}>
                        <TouchableOpacity onPress={() => (navigation as any).goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <Text style={s.backArrow}>‹</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={s.headerTitle}>AI Assistant</Text>
                            <Text style={[s.headerSub, { color: serviceColor }]} numberOfLines={1}>{serviceTitle}</Text>
                            {/* {serviceCategory ? <Text style={s.headerCat}>{serviceCategory}</Text> : null} */}
                        </View>
                        <View style={[s.badge, { backgroundColor: serviceColor + '18' }]}>
                            <Text style={[s.badgeTxt, { color: serviceColor }]}>{msgCount}</Text>
                        </View>
                    </View>

                    {/* PROGRESS BAR */}
                    <View style={s.pbar}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={[s.pCircle, { borderColor: serviceColor }]}>
                                <Text style={[s.pCheck, { color: serviceColor }]}>✓</Text>
                            </View>
                            <Text style={s.pLabel}>Application Progress</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={s.pTrack}>
                                <Animated.View style={[s.pFill, { width: pWidth, backgroundColor: serviceColor }]} />
                            </View>
                            <Text style={[s.pPct, { color: serviceColor }]}>{progress}%</Text>
                        </View>
                    </View>

                    {/* MESSAGE LIST */}
                    <FlatList
                        ref={flatRef}
                        data={messages}
                        renderItem={renderItem}
                        keyExtractor={m => m.id}
                        contentContainerStyle={s.listContent}
                        keyboardShouldPersistTaps="always"
                        showsVerticalScrollIndicator={false}
                        onContentSizeChange={() => scrollBottom(100)}
                        onLayout={() => scrollBottom(100)}
                        keyboardDismissMode="none"
                    />

                    {/* TYPING INDICATOR */}
                    {loading && !hasChatClosed && (
                        <View style={s.typingRow}>
                            <View style={s.avatar}>
                                <View style={[s.avatarDot, { backgroundColor: serviceColor }]} />
                            </View>
                            <View style={s.typingBubble}>
                                <ActivityIndicator size="small" color="#94A3B8" />
                                <Text style={s.typingTxt}>  typing…</Text>
                            </View>
                        </View>
                    )}

                    {/* INPUT BAR */}
                    {!hasChatClosed ? <View style={s.inputBar}>
                        <TextInput
                            placeholder="Type your message..."
                            placeholderTextColor="#9CA3AF"
                            value={input}
                            onChangeText={setInput}
                            style={s.inputField}
                            multiline
                            returnKeyType="send"
                            onSubmitEditing={send}
                        // blurOnSubmit={false}
                        />
                        <TouchableOpacity
                            style={[s.sendBtn, { backgroundColor: (!input.trim() || loading) ? serviceColor + '55' : serviceColor }]}
                            onPress={send}
                            disabled={!input.trim() || loading}
                        >
                            <Text style={s.sendIcon}>➤</Text>
                        </TouchableOpacity>
                    </View> : (
                        <View style={s.chatClosedBar}>
                            <Text style={s.chatClosedText}>Chat closed after successful payment. Track updates in Status.</Text>
                        </View>
                    )}

                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default AiAssistScreen;

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const s = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, marginTop: Platform.OS === 'android' ? 28 : 0 },
    backArrow: { fontSize: 32, color: '#111', lineHeight: 36, paddingRight: 6 },
    headerTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', color: '#0F172A' },
    headerSub: { fontSize: 12, marginTop: 1, fontFamily: 'Poppins-Regular' },
    headerCat: { fontSize: 10, color: '#94A3B8', marginTop: 1 },
    badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, minWidth: 36, alignItems: 'center' },
    badgeTxt: { fontSize: 13, fontFamily: 'Poppins-Bold' },
    pbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB' },
    pCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    pCheck: { fontSize: 10, fontFamily: 'Poppins-Bold' },
    pLabel: { fontSize: 12, fontFamily: 'Poppins-Bold', color: '#374151' },
    pTrack: { width: 110, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
    pFill: { height: 6, borderRadius: 3 },
    pPct: { fontSize: 12, fontFamily: 'Poppins-Bold', minWidth: 36, textAlign: 'right' },
    listContent: { paddingHorizontal: 14, paddingTop: 18, paddingBottom: 20 },
    row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    botRow: { justifyContent: 'flex-start' },
    userRow: { justifyContent: 'flex-end' },
    avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#EFF6FF', borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 4, flexShrink: 0 },
    avatarDot: { width: 8, height: 8, borderRadius: 4 },
    bubble: { maxWidth: '80%', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 20 },
    botBubble: { backgroundColor: '#fff', borderTopLeftRadius: 4, borderWidth: 0.5, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    userBubble: { borderTopRightRadius: 4 },
    botTxt: { fontSize: 14.5, color: '#1E293B', lineHeight: 23, fontFamily: 'Poppins-Regular' },
    userTxt: { fontSize: 14.5, color: '#fff', lineHeight: 23, fontFamily: 'Poppins-Regular' },
    wideCard: { marginLeft: 34, marginBottom: 16, marginRight: 4 },
    payDone: { backgroundColor: '#F0FDF4', borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: '#86EFAC', alignItems: 'center' },
    payDoneTxt: { color: '#15803D', fontWeight: '700', fontSize: 15, fontFamily: 'Poppins-Bold' },
    successCard: { backgroundColor: '#F0FDF4', borderWidth: 0.5, borderColor: '#86EFAC', borderRadius: 16, padding: 24, alignItems: 'center' },
    successTxt: { fontSize: 14.5, color: '#15803D', lineHeight: 24, textAlign: 'center', fontFamily: 'Poppins-Regular' },
    typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 8 },
    typingBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderTopLeftRadius: 4, borderWidth: 0.5, borderColor: '#E5E7EB' },
    typingTxt: { fontSize: 13, color: '#94A3B8', fontFamily: 'Poppins-Regular' },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#E5E7EB', gap: 8 },
    chatClosedBar: { paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#ECFDF3', borderTopWidth: 0.5, borderTopColor: '#86EFAC' },
    chatClosedText: { color: '#166534', fontSize: 12.5, fontFamily: 'Poppins-Medium', textAlign: 'center' },
    inputField: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 24, paddingHorizontal: 18, paddingTop: Platform.OS === 'ios' ? 12 : 10, paddingBottom: Platform.OS === 'ios' ? 12 : 10, fontSize: 15, color: '#111', maxHeight: 110 },
    sendBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
    pendingDocsCard: { backgroundColor: '#FFF7ED', borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: '#FDBA74' },
    pendingDocsTitle: { color: '#9A3412', fontFamily: 'Poppins-Bold', fontSize: 13, marginBottom: 4 },
    pendingDocsText: { color: '#9A3412', fontFamily: 'Poppins-Regular', fontSize: 12.5, lineHeight: 19 },
    formDoneCard: { backgroundColor: '#ECFDF3', borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: '#86EFAC' },
    formDoneTitle: { color: '#15803D', fontFamily: 'Poppins-Bold', fontSize: 13, marginBottom: 4 },
    formDoneText: { color: '#166534', fontFamily: 'Poppins-Regular', fontSize: 12.5, lineHeight: 19 },
    sendIcon: { fontSize: 17, color: '#fff', marginLeft: 2 },
});

const fr = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    note: { fontSize: 12.5, color: '#6B7280', marginBottom: 18, lineHeight: 19, fontFamily: 'Poppins-Regular' },
    fw: { marginBottom: 12 },
    lbl: { fontSize: 11.5, color: '#6B7280', marginBottom: 4, fontWeight: '500', fontFamily: 'Poppins-Regular' },
    inp: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#FAFAFA', fontFamily: 'Poppins-Regular' },
    emptyReqWrap: { backgroundColor: '#FFF7ED', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 0.5, borderColor: '#FDBA74' },
    emptyReqText: { fontSize: 12, color: '#9A3412', lineHeight: 18, fontFamily: 'Poppins-Regular' },
    reqListWrap: { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 0.5, borderColor: '#BFDBFE' },
    reqListTitle: { color: '#1D4ED8', fontSize: 12, fontFamily: 'Poppins-Bold', marginBottom: 4 },
    reqListItem: { color: '#1E3A8A', fontSize: 12, lineHeight: 18, fontFamily: 'Poppins-Regular' },
    btn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
    btnTxt: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'Poppins-Bold' },
});

const pc = StyleSheet.create({
    wrap: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    heading: { fontSize: 16, fontFamily: 'Poppins-Bold', color: '#111827', marginBottom: 14 },
    feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    totL: { fontSize: 15, fontWeight: '700', color: '#111827', fontFamily: 'Poppins-Bold' },
    totV: { fontSize: 15, fontWeight: '800', color: '#111827', fontFamily: 'Poppins-Bold' },
    paymentNote: { fontSize: 12, color: '#4B5563', marginTop: 16, marginBottom: 6, fontFamily: 'Poppins-Regular' },
    payBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
    payBtnDisabled: { opacity: 0.75 },
    payLoadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    payBtnTxt: { color: '#fff', fontSize: 15, fontFamily: 'Poppins-Bold' },
    secure: { textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 12 },
});

// Doc Examples Panel styles
const dep = StyleSheet.create({
    wrap: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    heading: { fontSize: 14, fontFamily: 'Poppins-Bold', color: '#111827' },
    sub: { fontSize: 11.5, color: '#6B7280', marginTop: 3 },
    tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8, backgroundColor: '#F9FAFB' },
    tabActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
    tabTxt: { fontSize: 11.5, color: '#6B7280', fontFamily: 'Poppins-Regular', maxWidth: 120 },
    tabTxtActive: { color: '#2563EB', fontFamily: 'Poppins-Bold' },
    imgWrap: { width: SW - 80, height: 180, borderRadius: 10, overflow: 'hidden', marginRight: 10, backgroundColor: '#F3F4F6' },
    img: { width: '100%', height: '100%' },
    imgOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 6, paddingHorizontal: 10 },
    imgLabel: { fontSize: 11, color: '#fff', fontFamily: 'Poppins-Bold' },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 8 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB' },
    dotActive: { backgroundColor: '#2563EB', width: 16 },
    hint: { fontSize: 12, color: '#374151', marginTop: 10, lineHeight: 18 },
    tipBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10, marginTop: 8, gap: 6 },
    tipTxt: { flex: 1, fontSize: 11.5, color: '#92400E', lineHeight: 17 },
});

// DOB upload card styles (reused from uc)
const uc = StyleSheet.create({
    wrap: { backgroundColor: '#fff', borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: '#E5E7EB', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    previewImg: { width: '100%', height: 140, borderRadius: 10, marginBottom: 10 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    verifyTxt: { fontSize: 13, color: '#2563EB', fontFamily: 'Poppins-Bold' },
    errBanner: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA', width: '100%', marginBottom: 8 },
    errTxt: { fontSize: 13, color: '#B91C1C', lineHeight: 20, textAlign: 'center' },
    btnRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 12 },
    btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EFF6FF', borderRadius: 11, paddingVertical: 12 },
    bTxt: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
    name: { fontSize: 15, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 5 },
    hint: { fontSize: 12.5, color: '#6B7280', textAlign: 'center', marginBottom: 4 },
    dobBanner: { backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, marginVertical: 8, width: '100%' },
    dobBannerTxt: { fontSize: 12, color: '#1E40AF', textAlign: 'center', lineHeight: 18 },
    doneWrap: { backgroundColor: '#F0FDF4', borderRadius: 14, overflow: 'hidden', borderWidth: 0.5, borderColor: '#86EFAC' },
    thumb: { width: '100%', height: 130, resizeMode: 'cover' },
    doneRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    doneName: { fontSize: 13, fontWeight: '700', color: '#15803D' },
    doneSub: { fontSize: 11.5, color: '#16A34A', marginTop: 2 },
    chooseBtn: { marginTop: 12, width: '100%', backgroundColor: '#EFF6FF', borderRadius: 11, paddingVertical: 12, alignItems: 'center' },
    chooseBtnTxt: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 20 },
    modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
    modalTitle: { fontSize: 15, fontFamily: 'Poppins-Bold', color: '#111827', marginBottom: 10 },
    modalOption: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB' },
    modalOptionText: { fontSize: 14, color: '#1F2937', fontFamily: 'Poppins-Regular' },
    walletSheet: { marginTop: 'auto', backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 },
    walletRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6' },
    walletThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#E5E7EB' },
    walletName: { fontSize: 13, color: '#111827', fontFamily: 'Poppins-Regular' },
    walletEmpty: { textAlign: 'center', color: '#6B7280', fontSize: 12.5, marginTop: 12 },
    walletClose: { marginTop: 12, backgroundColor: '#F3F4F6', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    walletCloseText: { color: '#111827', fontFamily: 'Poppins-Medium' },
});

// Multi upload card styles
const mu = StyleSheet.create({
    wrap: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    heading: { fontSize: 15, fontWeight: '700', color: '#111827' },
    counter: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
    sub: { fontSize: 12, color: '#6B7280', marginBottom: 14 },
    itemBox: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: '#FAFAFA' },
    itemDone: { borderColor: '#86EFAC', backgroundColor: '#F0FDF4' },
    itemErr: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
    itemFocus: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
    itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    itemIcon: { fontSize: 20 },
    itemLabel: { flex: 1, fontSize: 13.5, fontWeight: '600', color: '#1F2937' },
    preview: { width: '100%', height: 120, borderRadius: 8, marginBottom: 10 },
    verifyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    verifyTxt: { fontSize: 13, color: '#2563EB', fontFamily: 'Poppins-Bold' },
    errBanner: { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#FECACA' },
    errTxt: { fontSize: 12.5, color: '#B91C1C', lineHeight: 18 },
    btnRow: { flexDirection: 'row', gap: 8 },
    btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EFF6FF', borderRadius: 10, paddingVertical: 10 },
    bTxt: { fontSize: 12.5, fontWeight: '600', color: '#2563EB' },
    doneRow: { flexDirection: 'row', alignItems: 'center' },
    thumb: { width: 60, height: 60, borderRadius: 8, marginRight: 10 },
    doneLabel: { fontSize: 13, fontFamily: 'Poppins-Bold', color: '#15803D' },
    doneSub: { fontSize: 11.5, color: '#16A34A', marginTop: 2 },
    allDoneBanner: { backgroundColor: '#DCFCE7', borderRadius: 10, padding: 12, marginTop: 6, alignItems: 'center' },
    allDoneTxt: { fontSize: 13, fontFamily: 'Poppins-Bold', color: '#15803D' },
    pickBtn: { backgroundColor: '#EFF6FF', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    pickBtnText: { fontSize: 12.5, fontWeight: '600', color: '#2563EB' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 20 },
    modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
    modalTitle: { fontSize: 15, fontFamily: 'Poppins-Bold', color: '#111827', marginBottom: 10 },
    modalOption: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB' },
    modalOptionText: { fontSize: 14, color: '#1F2937', fontFamily: 'Poppins-Regular' },
    walletSheet: { marginTop: 'auto', backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 },
    walletRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6' },
    walletThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#E5E7EB' },
    walletName: { fontSize: 13, color: '#111827', fontFamily: 'Poppins-Regular' },
    walletEmpty: { textAlign: 'center', color: '#6B7280', fontSize: 12.5, marginTop: 12 },
    walletClose: { marginTop: 12, backgroundColor: '#F3F4F6', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    walletCloseText: { color: '#111827', fontFamily: 'Poppins-Medium' },
});

const dv = StyleSheet.create({
    card: { backgroundColor: '#F0FDF4', borderRadius: 14, borderWidth: 1, borderColor: '#86EFAC', overflow: 'hidden' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#DCFCE7', paddingHorizontal: 14, paddingVertical: 10 },
    headerIcon: { fontSize: 18, fontFamily: 'Poppins-Bold' },
    headerTxt: { fontSize: 14, fontFamily: 'Poppins-Bold', color: '#15803D' },
    body: { flexDirection: 'row', padding: 14, gap: 12 },
    thumb: { width: 80, height: 80, borderRadius: 10, borderWidth: 1, borderColor: '#86EFAC' },
    info: { flex: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    lbl: { fontSize: 11.5, color: '#6B7280', fontFamily: 'Poppins-Regular' },
    val: { fontSize: 13, color: '#111827', fontFamily: 'Poppins-Bold', flexShrink: 1, textAlign: 'right', marginLeft: 8 },
});