declare module 'react-native-razorpay' {
    interface RazorpayOptions {
        description?: string;
        image?: string;
        currency: string;
        key: string;
        amount: string;
        name: string;
        order_id: string;
        prefill?: {
            name?: string;
            email?: string;
            contact?: string;
        };
        theme?: {
            color?: string;
        };
    }

    interface RazorpayResult {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
    }

    interface RazorpayError {
        code: number;
        description: string;
        source: string;
        step: string;
        reason: string;
        metadata?: Record<string, unknown>;
    }

    const RazorpayCheckout: {
        open(options: RazorpayOptions): Promise<RazorpayResult>;
    };

    export default RazorpayCheckout;
}
