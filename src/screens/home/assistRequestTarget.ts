import { ConvEntry, FormData as ApplicationFormData, Msg, VerifyStatus } from '../../utils';

export interface RequestTargetShape {
    requiredDocs?: string[];
    requiredFields?: string[];
    message?: string;
}

interface ApplyRequestTargetArgs {
    inputMsgs: Msg[];
    requestTarget?: RequestTargetShape | null;
    history: ConvEntry[];
    serviceTitle: string;
    createId: () => string;
    fieldKeyFromLabel: (label: string) => keyof ApplicationFormData | undefined;
    extractFormData: (hist: ConvEntry[], title: string) => ApplicationFormData;
}

function uniqueFields(fields: Array<keyof ApplicationFormData>) {
    return [...new Set(fields)];
}

function isDocMatch(docLabel: string, requested: string) {
    const a = String(docLabel || '').toLowerCase().trim();
    const b = String(requested || '').toLowerCase().trim();
    return a.includes(b) || b.includes(a);
}

export function applyRequestTargetRestrictions({
    inputMsgs,
    requestTarget,
    history,
    serviceTitle,
    createId,
    fieldKeyFromLabel,
    extractFormData,
}: ApplyRequestTargetArgs): Msg[] {
    if (!requestTarget) return inputMsgs;

    const out = [...inputMsgs];
    const requiredDocs: string[] = Array.isArray(requestTarget?.requiredDocs) ? requestTarget.requiredDocs : [];
    const requiredFields: string[] = Array.isArray(requestTarget?.requiredFields) ? requestTarget.requiredFields : [];

    if (requiredDocs.length) {
        const idx = out.findIndex((m) => m.type === 'multi_upload' && Array.isArray(m.uploadItems));
        if (idx >= 0) {
            const msg = out[idx];
            const filteredItems = (msg.uploadItems || []).filter((item) =>
                requiredDocs.some((d) => isDocMatch(item?.label || '', d))
            );

            const onlyRequestedItems = filteredItems.length
                ? filteredItems
                : requiredDocs.map((d) => ({
                    label: d,
                    isDob: d.toLowerCase().includes('dob') || d.toLowerCase().includes('aadhaar'),
                    verifyStatus: 'idle' as VerifyStatus,
                }));

            out[idx] = {
                ...msg,
                uploadItems: onlyRequestedItems,
                focusDocLabels: requiredDocs,
            } as Msg;
        } else {
            out.push({
                id: createId(),
                type: 'multi_upload',
                uploadItems: requiredDocs.map((d) => ({
                    label: d,
                    isDob: d.toLowerCase().includes('dob') || d.toLowerCase().includes('aadhaar'),
                    verifyStatus: 'idle' as VerifyStatus,
                })),
                focusDocLabels: requiredDocs,
            } as Msg);
        }
    }

    if (requiredFields.length) {
        const fieldKeys = uniqueFields(
            requiredFields
                .map((label) => fieldKeyFromLabel(label))
                .filter(Boolean) as Array<keyof ApplicationFormData>
        );

        if (!fieldKeys.length) {
            const fallbackText = `Admin requested these details: ${requiredFields.join(', ')}. Please provide only these details in your next response.`;
            const alreadyExists = out.some((m) => m.type === 'bot' && String(m.text || '').trim() === fallbackText);
            if (!alreadyExists) {
                out.push({
                    id: createId(),
                    type: 'bot',
                    text: fallbackText,
                } as Msg);
            }
        }

        const formIdx = out.findIndex((m) => m.type === 'form_review');
        if (formIdx >= 0) {
            const msg = out[formIdx];
            out[formIdx] = {
                ...msg,
                formFields: fieldKeys,
                formFieldLabels: requiredFields,
            } as Msg;
        } else {
            out.push({
                id: createId(),
                type: 'form_review',
                formData: extractFormData(history, serviceTitle),
                formFields: fieldKeys,
                formFieldLabels: requiredFields,
            } as Msg);
        }
    }

    if (requestTarget?.message) {
        const noteText = `Admin Note: ${requestTarget.message}`;
        const alreadyExists = out.some((m) => m.type === 'bot' && String(m.text || '').trim() === noteText);
        if (!alreadyExists) {
            out.push({ id: createId(), type: 'bot', text: noteText } as Msg);
        }
    }

    return out;
}