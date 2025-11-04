import Client from "../api/Client";

const authService = {
  login: async (email, password) => {
    const response = await Client.post("/auth/login", { email, password });
    return response;
  },
};

export default authService;
