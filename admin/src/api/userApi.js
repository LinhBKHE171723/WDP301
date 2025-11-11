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
    ForgotPassword: (email) => Client.post("user/forgotPassword", { email }),
    VerifyResetToken: (token) => Client.get(`user/verifyResetToken?token=${token}`),
    ResetPassword: (token, newPassword) => Client.post("user/resetPassword", { token, newPassword }),
    getTodayShift: () => Client.get("user/today-shift"),
    checkIn: () => Client.post("user/checkIn"),
    checkOut: () => Client.post("user/checkOut"),
};

export default userApi;
