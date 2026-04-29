import { VerifyStatus } from './common.types';
import { FormData } from './form.types';

export type MsgType =
    | 'bot'
    | 'user'
    | 'doc_examples_panel'
    | 'multi_upload'
    | 'dob_upload'
    | 'payment_card'
    | 'payment_done'
    | 'success'
    | 'form_review'
    | 'dob_verified';

export interface UploadItem {
    label: string;
    isDob: boolean;
    verifyStatus: VerifyStatus;
    uploadedUri?: string;
    verifyMessage?: string;
}

export interface Msg {
    id: string;
    type: MsgType;
    text?: string;

    // DOB upload
    dobUploadedUri?: string;
    dobVerifyStatus?: VerifyStatus;
    dobVerifyMessage?: string;

    // Multi upload
    uploadItems?: UploadItem[];
    focusDocLabels?: string[];

    // Doc examples
    docLabels?: string[];

    // DOB verified
    dobVerifiedName?: string;
    dobVerifiedDob?: string;
    dobVerifiedAadhaar?: string;
    uploadedUri?: string;

    // Payment
    govFee?: string;
    serviceFee?: string;
    totalFee?: string;

    // Form
    formData?: FormData;
    formFields?: Array<keyof FormData>;
    formFieldLabels?: string[];
}

export interface ConvEntry {
    role: 'user' | 'assistant';
    content: string;
}