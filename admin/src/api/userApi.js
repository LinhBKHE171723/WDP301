import Client from "./Client";

const userApi = {
    getProfile: () => Client.get("user/profile"),
    updateProfile: async (data, isFormData = false) => {
        const config = isFormData
            ? { headers: { "Content-Type": "multipart/form-data" } }
            : {};
        const res = await Client.put("user/updateProfile", data, config);
        return res; // chứa user và token
    },
};

export default userApi;
