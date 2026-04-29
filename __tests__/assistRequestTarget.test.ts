import { Msg, FormData as ApplicationFormData, ConvEntry } from '../src/utils';
import { applyRequestTargetRestrictions } from '../src/screens/home/assistRequestTarget';

function makeIdFactory() {
  let i = 0;
  return () => `id-${++i}`;
}

const emptyHistory: ConvEntry[] = [];
const baseFormData: ApplicationFormData = {
  fullName: 'Test User',
  dob: '01/01/1990',
  city: 'Mumbai',
};

const mapField = (label: string): keyof ApplicationFormData | undefined => {
  const s = label.toLowerCase();
  if (s.includes('name')) return 'fullName';
  if (s.includes('dob') || s.includes('date of birth')) return 'dob';
  if (s.includes('city')) return 'city';
  return undefined;
};

describe('applyRequestTargetRestrictions', () => {
  it('keeps only requested docs for doc-only request', () => {
    const inputMsgs: Msg[] = [
      {
        id: '1',
        type: 'multi_upload',
        uploadItems: [
          { label: 'Passport', isDob: false, verifyStatus: 'idle' },
          { label: 'Aadhaar Card', isDob: true, verifyStatus: 'idle' },
          { label: 'PAN Card', isDob: false, verifyStatus: 'idle' },
        ],
      },
    ];

    const out = applyRequestTargetRestrictions({
      inputMsgs,
      requestTarget: { requiredDocs: ['Aadhaar Card'] },
      history: emptyHistory,
      serviceTitle: 'Service',
      createId: makeIdFactory(),
      fieldKeyFromLabel: mapField,
      extractFormData: () => baseFormData,
    });

    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('multi_upload');
    expect(out[0].uploadItems?.map((i) => i.label)).toEqual(['Aadhaar Card']);
  });

  it('keeps only requested fields for details-only request', () => {
    const inputMsgs: Msg[] = [
      {
        id: '1',
        type: 'form_review',
        formData: baseFormData,
        formFields: ['fullName', 'dob', 'city'],
        formFieldLabels: ['Full Name', 'DOB', 'City'],
      },
    ];

    const out = applyRequestTargetRestrictions({
      inputMsgs,
      requestTarget: { requiredFields: ['DOB'] },
      history: emptyHistory,
      serviceTitle: 'Service',
      createId: makeIdFactory(),
      fieldKeyFromLabel: mapField,
      extractFormData: () => baseFormData,
    });

    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('form_review');
    expect(out[0].formFields).toEqual(['dob']);
    expect(out[0].formFieldLabels).toEqual(['DOB']);
  });

  it('applies both doc and details restrictions for combined request', () => {
    const inputMsgs: Msg[] = [
      {
        id: '1',
        type: 'multi_upload',
        uploadItems: [
          { label: 'Passport', isDob: false, verifyStatus: 'idle' },
          { label: 'PAN Card', isDob: false, verifyStatus: 'idle' },
        ],
      },
      {
        id: '2',
        type: 'form_review',
        formData: baseFormData,
        formFields: ['fullName', 'dob', 'city'],
        formFieldLabels: ['Full Name', 'DOB', 'City'],
      },
    ];

    const out = applyRequestTargetRestrictions({
      inputMsgs,
      requestTarget: {
        requiredDocs: ['PAN Card'],
        requiredFields: ['Full Name'],
      },
      history: emptyHistory,
      serviceTitle: 'Service',
      createId: makeIdFactory(),
      fieldKeyFromLabel: mapField,
      extractFormData: () => baseFormData,
    });

    const upload = out.find((m) => m.type === 'multi_upload');
    const form = out.find((m) => m.type === 'form_review');

    expect(upload?.uploadItems?.map((i) => i.label)).toEqual(['PAN Card']);
    expect(form?.formFields).toEqual(['fullName']);
    expect(form?.formFieldLabels).toEqual(['Full Name']);
  });
});
