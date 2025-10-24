import Client from "./Client";

const userApi = {
    getProfile: async () => {
        const res = await Client.get(`user/profile`);
        return res.data.user;
    },
    updateProfile: async (data) => {
        const res = await Client.put(`user/updateProfile`, data);
        return res.data.user;
    },
};

export default userApi;
