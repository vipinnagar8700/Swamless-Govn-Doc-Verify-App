import API from "./api";

export const sendOtpApi = (phone) => {
    return API.post(`/user/send-otp`, { phone });
};

export const verifyOtpApi = (phone, otp) => {
    return API.post(`/user/verify-otp`, { phone, otp });
};

// ✅ No need to pass token manually anymore — interceptor handles it
export const getMeApi = () => {
    return API.get(`/user/me`);
};

export const updateProfileApi = (data) => {
    return API.put(`/user/update-profile`, data);
};

export const logoutApi = () => {
    return API.post(`/user/logout`, {});
};

export const uploadImageApi = (imageFile) => {
    const formData = new FormData();
    formData.append("image", {
        uri: imageFile.uri,
        type: imageFile.type || "image/jpeg",
        name: imageFile.fileName || "profile.jpg",
    });

    return API.post(`/user/upload-image`, formData, {
        headers: {
            // ✅ Let axios set the multipart boundary automatically
            // Do NOT hardcode Content-Type for FormData — axios handles it
            "Content-Type": "multipart/form-data",
        },
    });
};

export const deleteImageApi = () => {
    return API.delete(`/user/delete-image`);
};