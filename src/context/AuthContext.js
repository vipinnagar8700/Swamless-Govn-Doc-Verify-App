import React, { createContext, useState } from "react";
import { sendOtpApi, verifyOtpApi, getMeApi, updateProfileApi, logoutApi, uploadImageApi, deleteImageApi } from "../services/authApi";
import AsyncStorage from '@react-native-async-storage/async-storage';
export const AuthContext = createContext();
import { useEffect } from "react";
import API from "../services/api";


export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    // ✅ Send OTP
    const sendOtp = async (phone) => {
        try {
            setLoading(true);
            const res = await sendOtpApi(phone);
            console.log("Send OTP Response:", res);
            return res.data;
        } catch (err) {
            throw err.response?.data || err;
        } finally {
            setLoading(false);
        }
    };

    // ✅ Load token on app start
    useEffect(() => {
        const loadToken = async () => {
            try {
                const savedToken = await AsyncStorage.getItem("token");

                if (savedToken) {
                    setToken(savedToken);
                }
            } catch (e) {
                console.log("Token load error", e);
            } finally {
                setIsReady(true); // ✅ important
            }
        };

        loadToken();
    }, []);

    // ✅ Verify OTP
    const verifyOtp = async (phone, otp) => {
        try {
            setLoading(true);
            const res = await verifyOtpApi(phone, otp);

            const { token, user } = res.data;

            setToken(token);
            setUser(user);

            // ✅ Save token
            await AsyncStorage.setItem("token", token);

            return res.data;
        } catch (err) {
            throw err.response?.data || err;
        } finally {
            setLoading(false);
        }
    };

    // ✅ Get user profile
    const getMe = async () => {
        try {
            const res = await getMeApi(); // no token needed
            setUser(res.data?.user);
            return res.data;
        } catch (err) {
            console.log("GetMe Error", err);
        }
    };

    // ✅ Update profile
    const updateProfile = async (data) => {
        try {
            setLoading(true);
            const res = await updateProfileApi(data); // no token needed
            setUser(res.data?.user);
            return res.data;
        } catch (err) {
            throw err.response?.data || err;
        } finally {
            setLoading(false);
        }
    };

    // ✅ Logout
    const logout = async () => {
        try {
            await logoutApi(); // no token needed
        } catch (e) {
            console.log("Logout API fail (ignore)");
        } finally {
            setUser(null);
            setToken(null);
            await AsyncStorage.removeItem("token");
        }
    };

    // ✅ Upload Image — use the api function, not API directly
    const uploadImage = async (file) => {
        try {
            const res = await uploadImageApi(file); // no token needed
            setUser(res.data.user);
            return res.data;
        } catch (error) {
            throw error;
        }
    };

    // ✅ Delete Image
    const deleteImage = async () => {
        try {
            const res = await deleteImageApi(); // no token needed
            setUser(res.data.user);
            return res.data;
        } catch (error) {
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                sendOtp,
                verifyOtp,
                isReady,
                getMe,
                updateProfile,
                logout,
                uploadImage,
                deleteImage,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};