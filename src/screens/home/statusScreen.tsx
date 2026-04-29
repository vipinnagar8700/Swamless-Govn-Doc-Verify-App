import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Alert,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { getMyApplicationsApi, resolveApplicationRequestApi, updateApplicationFlowApi } from '../../services/applicationFlowApi';
import { uploadDocumentApi } from '../../services/docWalletService';

const BASE_STATUS_ORDER = ['in_progress', 'docs_pending', 'form_pending', 'payment_pending', 'submitted', 'in_review', 'approved'];

const humanize = (v: string) =>
    String(v || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

const formatDate = (iso?: string | null) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString();
};

const getStatusPill = (status: string) => {
    if (status === 'approved' || status === 'completed') {
        return { bg: '#E8F5E9', fg: '#1B5E20', label: 'Completed' };
    }
    if (status === 'rejected') {
        return { bg: '#FEE2E2', fg: '#B91C1C', label: 'Rejected' };
    }
    if (status === 'in_progress' || status === 'docs_pending' || status === 'form_pending' || status === 'payment_pending' || status === 'submitted' || status === 'in_review') {
        return { bg: '#E3F2FD', fg: '#1565C0', label: 'In Progress' };
    }
    return { bg: '#F3F4F6', fg: '#6B7280', label: 'Pending' };
};

const mapFieldLabelToKey = (label: string) => {
    const s = String(label || '').toLowerCase();
    if (s.includes('full name') || s.includes('applicant name')) return 'fullName';
    if (s.includes('date of birth') || s === 'dob' || s.includes(' dob')) return 'dob';
    if (s.includes('aadhaar') || s.includes('aadhar')) return 'aadhaarNumber';
    if (s.includes('phone') || s.includes('mobile')) return 'phone';
    if (s.includes('email')) return 'email';
    if (s.includes('flat') || s.includes('house')) return 'flatNo';
    if (s.includes('street') || s.includes('locality')) return 'street';
    if (s.includes('city')) return 'city';
    if (s.includes('state')) return 'state';
    if (s.includes('pin') || s.includes('postal') || s.includes('zip')) return 'pincode';
    if (s.includes('place of birth')) return 'placeOfBirth';
    if (s.includes('parent') || s.includes('father') || s.includes('mother')) return 'parentName';
    if (s.includes('marital')) return 'maritalStatus';
    return label;
};

const isChatLockedForApp = (app: any) => {
    const status = String(app?.status || '').toLowerCase();
    const payStatus = String(app?.payment?.status || '').toLowerCase();
    return payStatus === 'success' || status === 'submitted' || status === 'approved' || status === 'completed';
};

const buildSteps = (app: any) => {
    const orderedStatuses = [...BASE_STATUS_ORDER];
    if (app?.status === 'completed' || (Array.isArray(app?.statusHistory) && app.statusHistory.some((item: any) => item?.status === 'completed'))) {
        orderedStatuses.push('completed');
    }
    if (app?.status === 'rejected' || (Array.isArray(app?.statusHistory) && app.statusHistory.some((item: any) => item?.status === 'rejected'))) {
        orderedStatuses.push('rejected');
    }

    const currentIdx = Math.max(orderedStatuses.indexOf(app?.status), 0);
    return orderedStatuses.map((status, idx) => {
        const history = Array.isArray(app?.statusHistory)
            ? app.statusHistory.filter((h: any) => h.status === status)
            : [];
        const latest = history.length ? history[history.length - 1] : null;
        let state: 'completed' | 'active' | 'pending' = 'pending';
        if (idx < currentIdx) state = 'completed';
        if (idx === currentIdx) state = 'active';
        if (status === app?.status && (app?.status === 'approved' || app?.status === 'completed' || app?.status === 'rejected')) {
            state = 'completed';
        }
        return {
            key: status,
            title: humanize(status),
            time: latest?.changedAt || null,
            note: latest?.note || '',
            state,
        };
    });
};

const StatusScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const [apps, setApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});
    const [resolvingByReqId, setResolvingByReqId] = useState<Record<string, boolean>>({});
    const [editorByReqId, setEditorByReqId] = useState<Record<string, boolean>>({});
    const [fieldValuesByReqId, setFieldValuesByReqId] = useState<Record<string, Record<string, string>>>({});
    const [docUrlsByReqId, setDocUrlsByReqId] = useState<Record<string, Record<string, string>>>({});
    const [uploadingDocByKey, setUploadingDocByKey] = useState<Record<string, boolean>>({});
    const [submittingByReqId, setSubmittingByReqId] = useState<Record<string, boolean>>({});

    const fetchApplications = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const res = await getMyApplicationsApi();
            const list = Array.isArray(res?.data?.applications) ? res.data.applications : [];
            setApps(list);
        } catch (err) {
            console.log('[StatusScreen] fetch applications failed:', err);
            setApps([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Re-fetch every time the screen comes into focus (tab switch / back navigation)
    useFocusEffect(
        useCallback(() => {
            fetchApplications();
        }, [])
    );

    useFocusEffect(
        useCallback(() => {
            const targetApplicationId = route?.params?.targetApplicationId;
            if (!targetApplicationId) return;

            setExpandedById((prev) => ({ ...prev, [targetApplicationId]: true }));
        }, [route?.params])
    );

    const sortedApps = useMemo(() => {
        return [...apps].sort((a, b) => {
            const ta = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
            const tb = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
            return tb - ta;
        });
    }, [apps]);

    const toggleExpanded = (id: string) => {
        setExpandedById((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const openChat = (app: any, req?: any) => {
        if (isChatLockedForApp(app)) return;
        (navigation as any).navigate('AiAssistScreen', {
            item: {
                id: app?.serviceId || '',
                title: app?.serviceName || 'Government Service',
                category: app?.serviceName || '',
                color: '#4CAF50',
                subServices: [],
                subServiceTitle: app?.subServiceTitle || '',
                openFrom: 'status',
                sessionId: app?._id,
                requestTarget: req
                    ? {
                        requestId: req?._id,
                        requestType: req?.requestType,
                        title: req?.title,
                        message: req?.message,
                        requiredDocs: req?.requiredDocs || [],
                        requiredFields: req?.requiredFields || [],
                    }
                    : undefined,
            },
        });
    };

    const resolveRequest = async (appId: string, requestId: string) => {
        try {
            setResolvingByReqId((prev) => ({ ...prev, [requestId]: true }));
            await resolveApplicationRequestApi(appId, requestId, { note: 'Resolved from status screen' });
            await fetchApplications();
        } catch (err) {
            console.log('[StatusScreen] resolve request failed:', err);
        } finally {
            setResolvingByReqId((prev) => ({ ...prev, [requestId]: false }));
        }
    };

    const toggleReqEditor = (requestId: string) => {
        setEditorByReqId((prev) => ({ ...prev, [requestId]: !prev[requestId] }));
    };

    const setReqField = (requestId: string, label: string, value: string) => {
        setFieldValuesByReqId((prev) => ({
            ...prev,
            [requestId]: {
                ...(prev[requestId] || {}),
                [label]: value,
            },
        }));
    };

    const pickAndUploadReqDoc = async (requestId: string, docLabel: string) => {
        const docKey = `${requestId}::${docLabel}`;
        try {
            setUploadingDocByKey((prev) => ({ ...prev, [docKey]: true }));
            const picked = await launchImageLibrary({ mediaType: 'photo', quality: 0.9 });
            const asset = picked?.assets?.[0];
            if (!asset?.uri) return;

            const uploadRes = await uploadDocumentApi(docLabel, {
                uri: asset.uri,
                fileName: asset.fileName || `doc-${Date.now()}.jpg`,
                type: asset.type || 'image/jpeg',
            });

            const cloudUrl = uploadRes?.data?.doc_url;
            if (!cloudUrl) {
                Alert.alert('Upload Failed', uploadRes?.message || 'Unable to upload document right now.');
                return;
            }

            setDocUrlsByReqId((prev) => ({
                ...prev,
                [requestId]: {
                    ...(prev[requestId] || {}),
                    [docLabel]: cloudUrl,
                },
            }));
        } catch (err) {
            console.log('[StatusScreen] request doc upload failed:', err);
            Alert.alert('Upload Failed', 'Could not upload document. Please try again.');
        } finally {
            setUploadingDocByKey((prev) => ({ ...prev, [docKey]: false }));
        }
    };

    const submitRequestUpdates = async (app: any, req: any) => {
        const reqId = String(req?._id || '');
        if (!reqId) return;

        const requiredFields: string[] = Array.isArray(req?.requiredFields) ? req.requiredFields : [];
        const requiredDocs: string[] = Array.isArray(req?.requiredDocs) ? req.requiredDocs : [];
        const fieldValues = fieldValuesByReqId[reqId] || {};
        const docValues = docUrlsByReqId[reqId] || {};

        const missingField = requiredFields.find((f) => !String(fieldValues[f] || '').trim());
        if (missingField) {
            Alert.alert('Missing Detail', `Please enter: ${missingField}`);
            return;
        }

        const missingDoc = requiredDocs.find((d) => !String(docValues[d] || '').trim());
        if (missingDoc) {
            Alert.alert('Missing Document', `Please upload: ${missingDoc}`);
            return;
        }

        try {
            setSubmittingByReqId((prev) => ({ ...prev, [reqId]: true }));

            const payload: any = {};
            if (requiredFields.length) {
                const formDetails: Record<string, string> = {};
                for (const label of requiredFields) {
                    formDetails[mapFieldLabelToKey(label)] = String(fieldValues[label] || '').trim();
                }
                payload.formDetails = formDetails;
            }

            if (requiredDocs.length) {
                const existingDocs = Array.isArray(app?.uploadedDocs) ? [...app.uploadedDocs] : [];
                for (const label of requiredDocs) {
                    const newDoc = {
                        label,
                        url: docValues[label],
                        source: 'other',
                        verifyStatus: 'valid',
                        verifyMessage: 'Uploaded from status screen',
                    };
                    const idx = existingDocs.findIndex((d: any) =>
                        String(d?.label || '').toLowerCase().trim() === String(label || '').toLowerCase().trim()
                    );
                    if (idx >= 0) existingDocs[idx] = { ...existingDocs[idx], ...newDoc };
                    else existingDocs.push(newDoc);
                }
                payload.uploadedDocs = existingDocs;
            }

            await updateApplicationFlowApi(app?._id, payload);
            await resolveApplicationRequestApi(app?._id, reqId, { note: 'Updated from status screen by user' });
            await fetchApplications();
            setEditorByReqId((prev) => ({ ...prev, [reqId]: false }));
        } catch (err) {
            console.log('[StatusScreen] submit request updates failed:', err);
            Alert.alert('Update Failed', 'Could not submit requested updates. Please try again.');
        } finally {
            setSubmittingByReqId((prev) => ({ ...prev, [reqId]: false }));
        }
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => fetchApplications(true)}
                    colors={['#3B82F6']}
                    tintColor="#3B82F6"
                />
            }
        >
            <Text style={styles.header}>Application Status</Text>

            {loading ? (
                <View style={styles.loaderWrap}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.loaderText}>Loading applications...</Text>
                </View>
            ) : null}

            {!loading && !sortedApps.length ? (
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>No Applications Found</Text>
                    <Text style={styles.text}>You have not started any application yet.</Text>
                </View>
            ) : null}

            {!loading && sortedApps.map((app: any) => {
                const currentPill = getStatusPill(app?.status);
                const chatLocked = isChatLockedForApp(app);
                const isExpanded = !!expandedById[app?._id];
                const pendingRequests = Array.isArray(app?.adminRequests)
                    ? app.adminRequests.filter((r: any) => r?.status === 'pending')
                    : [];
                return (
                    <View key={app?._id} style={styles.appCard}>
                        <View style={styles.appHeaderRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.appService}>{app?.serviceName || 'Service'}</Text>
                                {!!app?.subServiceTitle && <Text style={styles.appMeta}>{app.subServiceTitle}</Text>}
                                <Text style={styles.appMeta}>Application: {app?.applicationNumber || app?._id}</Text>
                                <Text style={styles.appMeta}>Submitted: {formatDate(app?.submittedAt)}</Text>
                            </View>
                            <View style={[styles.pill, { backgroundColor: currentPill.bg }]}>
                                <Text style={[styles.pillText, { color: currentPill.fg }]}>{humanize(app?.status)}</Text>
                            </View>
                        </View>

                        <View style={styles.progressWrap}>
                            <View style={styles.progressTrack}>
                                <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, Number(app?.progress) || 0))}%` }]} />
                            </View>
                            <Text style={styles.progressText}>{Math.max(0, Math.min(100, Number(app?.progress) || 0))}%</Text>
                        </View>

                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Payment:</Text>
                            <Text style={styles.summaryValue}>{app?.payment?.method || '-'} | {app?.payment?.status || 'pending'} | Rs {app?.payment?.amount || 0}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Uploaded Docs:</Text>
                            <Text style={styles.summaryValue}>{Array.isArray(app?.uploadedDocs) ? app.uploadedDocs.length : 0}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Admin Actions:</Text>
                            <Text style={[styles.summaryValue, pendingRequests.length ? { color: '#B45309' } : null]}>
                                {pendingRequests.length ? `${pendingRequests.length} pending` : 'No pending actions'}
                            </Text>
                        </View>

                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.secondaryButton} onPress={() => toggleExpanded(app?._id)}>
                                <Text style={styles.secondaryButtonText}>{isExpanded ? 'Hide Details' : 'View Details'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.primaryButton, chatLocked && styles.primaryButtonDisabled]}
                                onPress={() => openChat(app)}
                                disabled={chatLocked}
                            >
                                <Text style={styles.primaryButtonText}>{chatLocked ? 'Payment Completed' : 'Open This Chat'}</Text>
                            </TouchableOpacity>
                        </View>

                        {isExpanded && (
                            <>
                                {!!app?.formDetails && (
                                    <View style={styles.formWrap}>
                                        <Text style={styles.sectionTitle}>Form Details</Text>
                                        <Text style={styles.text}>Name: {app.formDetails.fullName || '-'}</Text>
                                        <Text style={styles.text}>DOB: {app.formDetails.dob || '-'}</Text>
                                        <Text style={styles.text}>Phone: {app.formDetails.phone || '-'}</Text>
                                        <Text style={styles.text}>Email: {app.formDetails.email || '-'}</Text>
                                        <Text style={styles.text}>City: {app.formDetails.city || '-'}, {app.formDetails.state || '-'}</Text>
                                    </View>
                                )}

                                {!!pendingRequests.length && (
                                    <View style={styles.formWrap}>
                                        <Text style={styles.sectionTitle}>Admin Requested Actions</Text>
                                        {pendingRequests.map((req: any) => (
                                            <View key={req?._id} style={styles.reqRow}>
                                                <Text style={styles.reqTitle}>{req?.title || humanize(req?.requestType || 'Action Required')}</Text>
                                                <Text style={styles.reqText}>{req?.message || ''}</Text>
                                                {!!req?.requiredDocs?.length && (
                                                    <Text style={styles.reqMeta}>Docs: {req.requiredDocs.join(', ')}</Text>
                                                )}
                                                {!!req?.requiredFields?.length && (
                                                    <Text style={styles.reqMeta}>Details: {req.requiredFields.join(', ')}</Text>
                                                )}
                                                {!!req?.requiredFields?.length && !!req?.requiredDocs?.length && (
                                                    <Text style={styles.reqMetaStrong}>Action: Edit requested details and reupload requested documents.</Text>
                                                )}
                                                {!!req?.requiredFields?.length && !req?.requiredDocs?.length && (
                                                    <Text style={styles.reqMetaStrong}>Action: Update the requested details and submit again.</Text>
                                                )}
                                                <View style={styles.reqBtnRow}>
                                                    <TouchableOpacity
                                                        style={styles.reqOpenBtn}
                                                        onPress={() => toggleReqEditor(req._id)}
                                                    >
                                                        <Text style={styles.reqOpenBtnText}>
                                                            {editorByReqId[req._id]
                                                                ? 'Close Update Form'
                                                                : req?.requiredFields?.length && req?.requiredDocs?.length
                                                                    ? 'Edit & Reupload'
                                                                    : req?.requiredFields?.length
                                                                        ? 'Upload Details'
                                                                        : 'Reupload Docs'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={styles.reqResolveBtn}
                                                        onPress={() => resolveRequest(app._id, req._id)}
                                                        disabled={!!resolvingByReqId[req._id]}
                                                    >
                                                        <Text style={styles.reqResolveBtnText}>{resolvingByReqId[req._id] ? 'Resolving...' : 'Mark Resolved'}</Text>
                                                    </TouchableOpacity>
                                                </View>

                                                {!!editorByReqId[req._id] && (
                                                    <View style={styles.reqEditorWrap}>
                                                        {!!req?.requiredFields?.length && (
                                                            <>
                                                                <Text style={styles.reqEditorTitle}>Requested Details</Text>
                                                                {req.requiredFields.map((fieldLabel: string) => (
                                                                    <View key={`${req._id}-field-${fieldLabel}`} style={{ marginTop: 8 }}>
                                                                        <Text style={styles.reqInputLabel}>{fieldLabel}</Text>
                                                                        <TextInput
                                                                            style={styles.reqInput}
                                                                            value={fieldValuesByReqId[req._id]?.[fieldLabel] || ''}
                                                                            onChangeText={(v) => setReqField(req._id, fieldLabel, v)}
                                                                            placeholder={`Enter ${fieldLabel}`}
                                                                            placeholderTextColor="#9CA3AF"
                                                                        />
                                                                    </View>
                                                                ))}
                                                            </>
                                                        )}

                                                        {!!req?.requiredDocs?.length && (
                                                            <>
                                                                <Text style={[styles.reqEditorTitle, { marginTop: 12 }]}>Requested Documents</Text>
                                                                {req.requiredDocs.map((docLabel: string) => {
                                                                    const docKey = `${req._id}::${docLabel}`;
                                                                    const uploadedUrl = docUrlsByReqId[req._id]?.[docLabel] || '';
                                                                    return (
                                                                        <View key={`${req._id}-doc-${docLabel}`} style={styles.reqDocRow}>
                                                                            <View style={{ flex: 1 }}>
                                                                                <Text style={styles.reqInputLabel}>{docLabel}</Text>
                                                                                <Text style={styles.reqDocStatus}>{uploadedUrl ? 'Uploaded' : 'Not uploaded'}</Text>
                                                                            </View>
                                                                            <TouchableOpacity
                                                                                style={styles.reqDocBtn}
                                                                                onPress={() => pickAndUploadReqDoc(req._id, docLabel)}
                                                                                disabled={!!uploadingDocByKey[docKey]}
                                                                            >
                                                                                <Text style={styles.reqDocBtnText}>{uploadingDocByKey[docKey] ? 'Uploading...' : 'Upload'}</Text>
                                                                            </TouchableOpacity>
                                                                        </View>
                                                                    );
                                                                })}
                                                            </>
                                                        )}

                                                        <TouchableOpacity
                                                            style={styles.reqSubmitBtn}
                                                            onPress={() => submitRequestUpdates(app, req)}
                                                            disabled={!!submittingByReqId[req._id]}
                                                        >
                                                            <Text style={styles.reqSubmitBtnText}>{submittingByReqId[req._id] ? 'Submitting...' : 'Submit Requested Updates'}</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                )}

                                <View style={styles.progressCard}>
                                    <Text style={styles.sectionTitle}>Status History</Text>
                                    {buildSteps(app).map((step) => {
                                        const pill = step.state === 'completed'
                                            ? { wrap: styles.completedBtn, txt: styles.completedText, label: 'Completed' }
                                            : step.state === 'active'
                                                ? { wrap: styles.inProgressBtn, txt: styles.inProgressText, label: 'In Progress' }
                                                : { wrap: styles.pendingBtn, txt: styles.pendingText, label: 'Pending' };
                                        return (
                                            <View key={step.key} style={styles.stepRow}>
                                                {step.state === 'completed' ? (
                                                    <View style={styles.radioCompleted} />
                                                ) : step.state === 'active' ? (
                                                    <View style={styles.radioActive} />
                                                ) : (
                                                    <View style={styles.radioInactive} />
                                                )}
                                                <View style={styles.stepContent}>
                                                    <Text style={styles.stepTitle}>{step.title}</Text>
                                                    <Text style={styles.date}>{formatDate(step.time)}</Text>
                                                    {!!step.note && <Text style={styles.noteText}>Note: {step.note}</Text>}
                                                    <View style={pill.wrap}>
                                                        <Text style={pill.txt}>{pill.label}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </>
                        )}
                    </View>
                );
            })}

            {!loading && !!sortedApps.length && (
                <TouchableOpacity style={styles.button} onPress={fetchApplications}>
                    <Text style={styles.buttonText}>Refresh All</Text>
                </TouchableOpacity>
            )}

        </ScrollView>
    );
};

export default StatusScreen;


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FA',
        padding: 16,
    },

    header: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        textAlign: 'center',
        marginBottom: 15, marginTop: 30
    },

    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },

    appCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },

    appHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },

    appService: {
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
        color: '#111827',
    },

    appMeta: {
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        color: '#6B7280',
        marginTop: 2,
    },

    pill: {
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },

    pillText: {
        fontSize: 11,
        fontFamily: 'Poppins-Medium',
    },

    progressWrap: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    progressTrack: {
        flex: 1,
        height: 10,
        borderRadius: 999,
        backgroundColor: '#E5E7EB',
        overflow: 'hidden',
    },

    progressFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
    },

    progressText: {
        fontSize: 11,
        fontFamily: 'Poppins-Bold',
        color: '#2563EB',
        minWidth: 36,
        textAlign: 'right',
    },

    summaryRow: {
        marginTop: 8,
        flexDirection: 'row',
    },

    summaryLabel: {
        width: 100,
        fontSize: 12,
        color: '#6B7280',
        fontFamily: 'Poppins-Medium',
    },

    summaryValue: {
        flex: 1,
        fontSize: 12,
        color: '#111827',
        fontFamily: 'Poppins-Regular',
    },

    formWrap: {
        marginTop: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        padding: 10,
    },

    reqRow: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#FDE68A',
        backgroundColor: '#FFFBEB',
        borderRadius: 8,
        padding: 10,
    },

    reqTitle: {
        fontSize: 12,
        fontFamily: 'Poppins-Bold',
        color: '#92400E',
    },

    reqText: {
        marginTop: 4,
        fontSize: 12,
        color: '#444',
        fontFamily: 'Poppins-Regular',
    },

    reqMeta: {
        marginTop: 4,
        fontSize: 11,
        color: '#6B7280',
        fontFamily: 'Poppins-Regular',
    },

    reqMetaStrong: {
        marginTop: 4,
        fontSize: 11,
        color: '#92400E',
        fontFamily: 'Poppins-Bold',
    },

    reqBtnRow: {
        marginTop: 8,
        flexDirection: 'row',
        gap: 8,
    },

    reqOpenBtn: {
        flex: 1,
        backgroundColor: '#2563EB',
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
    },

    reqOpenBtnDisabled: {
        backgroundColor: '#9CA3AF',
    },

    reqOpenBtnText: {
        color: '#fff',
        fontSize: 11,
        fontFamily: 'Poppins-Bold',
    },

    reqResolveBtn: {
        flex: 1,
        borderColor: '#16A34A',
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
    },

    reqResolveBtnText: {
        color: '#166534',
        fontSize: 11,
        fontFamily: 'Poppins-Bold',
    },

    reqEditorWrap: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#FCD34D',
        paddingTop: 10,
    },

    reqEditorTitle: {
        fontSize: 12,
        color: '#92400E',
        fontFamily: 'Poppins-Bold',
    },

    reqInputLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontFamily: 'Poppins-Medium',
        marginBottom: 4,
    },

    reqInput: {
        borderWidth: 1,
        borderColor: '#FCD34D',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 12,
        color: '#111827',
        backgroundColor: '#fff',
        fontFamily: 'Poppins-Regular',
    },

    reqDocRow: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    reqDocStatus: {
        fontSize: 11,
        color: '#6B7280',
        fontFamily: 'Poppins-Regular',
    },

    reqDocBtn: {
        backgroundColor: '#2563EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },

    reqDocBtnText: {
        color: '#fff',
        fontSize: 11,
        fontFamily: 'Poppins-Bold',
    },

    reqSubmitBtn: {
        marginTop: 12,
        backgroundColor: '#16A34A',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
    },

    reqSubmitBtnText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'Poppins-Bold',
    },

    actionRow: {
        marginTop: 12,
        flexDirection: 'row',
        gap: 10,
    },

    primaryButton: {
        flex: 1,
        backgroundColor: '#3B82F6',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },

    primaryButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },

    primaryButtonText: {
        color: '#fff',
        fontFamily: 'Poppins-Bold',
        fontSize: 12,
    },

    secondaryButton: {
        flex: 1,
        borderColor: '#3B82F6',
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },

    secondaryButtonText: {
        color: '#3B82F6',
        fontFamily: 'Poppins-Bold',
        fontSize: 12,
    },

    label: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#666',
    },

    appId: {
        fontFamily: 'Poppins-Bold',
        fontSize: 14,
        marginTop: 4,
    },

    progressCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 15,
    },

    sectionTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: 15,
        marginBottom: 10,
    },

    stepRow: {
        flexDirection: 'row',
        marginBottom: 15, gap: 10
    },

    iconActive: {
        fontSize: 16,
        color: '#3B82F6',
        marginRight: 10,
        marginTop: 2,
    },

    iconInactive: {
        fontSize: 16,
        color: '#ccc',
        marginRight: 10,
        marginTop: 2,
    },

    stepContent: {
        flex: 1,
    },

    stepTitle: {
        fontFamily: 'Poppins-Medium',
        fontSize: 13,
    },

    date: {
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        color: '#777',
        marginVertical: 3,
    },

    completed: {
        fontFamily: 'Poppins-Medium',
        fontSize: 12,
        color: '#555',
    },

    statusBar: {
        backgroundColor: '#E5E7EB',
        borderRadius: 10,
        paddingVertical: 4,
        marginTop: 5,
        alignItems: 'center',
    },

    statusBarGrey: {
        backgroundColor: '#F0F0F0',
        borderRadius: 10,
        paddingVertical: 4,
        marginTop: 5,
        alignItems: 'center',
    },

    inProgress: {
        fontFamily: 'Poppins-Medium',
        fontSize: 11,
        color: '#333',
    },

    pending: {
        fontFamily: 'Poppins-Medium',
        fontSize: 11,
        color: '#999',
    },

    text: {
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        color: '#444',
        marginTop: 5,
    },

    highlight: {
        color: '#3B82F6',
        fontFamily: 'Poppins-Bold',
    },

    button: {
        borderWidth: 1,
        borderColor: '#3B82F6',
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
        alignItems: 'center', marginBottom: 100
    },

    buttonText: {
        color: '#3B82F6',
        fontFamily: 'Poppins-Bold',
    },

    noteText: {
        fontSize: 11,
        color: '#6B7280',
        marginBottom: 6,
        fontFamily: 'Poppins-Regular',
    },

    loaderWrap: {
        paddingVertical: 40,
        alignItems: 'center',
    },

    loaderText: {
        marginTop: 8,
        color: '#6B7280',
        fontFamily: 'Poppins-Regular',
    },

    // 
    // RADIO BUTTONS
    radioCompleted: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#3B82F6',
        marginRight: 10,
        marginTop: 3,
    },

    radioActive: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 3,
        borderColor: '#3B82F6',
        marginRight: 10,
        marginTop: 3,
    },

    radioInactive: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#ccc',
        marginRight: 10,
        marginTop: 3,
    },

    // STATUS BUTTONS
    completedBtn: {
        backgroundColor: '#E6F0FF',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginTop: 5, width: '100%'
    },

    completedText: {
        color: '#3B82F6',
        fontSize: 11,
        fontFamily: 'Poppins-Medium', textAlign: 'center'
    },

    inProgressBtn: {
        backgroundColor: '#EEF2FF',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginTop: 5, width: '100%'
    },

    inProgressText: {
        color: '#3B82F6',
        fontSize: 11,
        fontFamily: 'Poppins-Medium', textAlign: 'center'
    },

    pendingBtn: {
        backgroundColor: '#F3F4F6',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginTop: 5, width: '100%'
    },

    pendingText: {
        color: '#999',
        fontSize: 11,
        fontFamily: 'Poppins-Medium', textAlign: 'center'
    },
});