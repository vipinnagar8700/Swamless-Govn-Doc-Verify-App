import API from "../services/api"; // your axios instance

// ✅ Upload Document
export const uploadDocumentApi = async (doc_name, file) => {
    try {
        const formData = new FormData();

        formData.append("doc_name", doc_name);
        formData.append("doc_file", {
            uri: file.uri,
            name: file.fileName || "doc.png",
            type: file.type || "image/jpeg",
        });

        const res = await API.post("/user/doc-wallet/upload", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            timeout: 60000, // 60s — file uploads need more time (Cloudinary + cold-start)
        });

        return res.data;
    } catch (err) {
        const detail = err?.response?.data || { status: "error", message: err.message };
        console.log("UPLOAD ERROR:", detail);
        return detail;
    }
};

// ✅ Get Documents
export const getDocumentsApi = async () => {
    try {
        const res = await API.get("/user/doc-wallet");
        return res.data;
    } catch (err) {
        console.log("GET DOC ERROR:", err);
        return null;
    }
};

// ✅ Delete Document
export const deleteDocumentApi = async (id) => {
    try {
        const res = await API.delete(`/user/doc-wallet/${id}`);
        return res.data;
    } catch (err) {
        console.log("DELETE ERROR:", err);
        return null;
    }
};