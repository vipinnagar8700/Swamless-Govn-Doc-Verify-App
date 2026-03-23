import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = axios.create({
    baseURL: "https://seamless-backend-iad9.onrender.com/api",
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

// ✅ THE FIX: reads token from AsyncStorage on every request automatically
API.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default API;