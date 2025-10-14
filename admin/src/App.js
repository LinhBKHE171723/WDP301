import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import { Header } from "./components/Header";
import DashboardPage from "./pages/DashboardPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AccountsPage from "./pages/AccountsPage";
import FeedbackPage from "./pages/FeedbackPage";
import SettingsPage from "./pages/SettingsPage";
import { Toaster } from "sonner"; // ✅ THÊM DÒNG NÀY

export default function App() {
  return (
    <div className="min-h-screen">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 space-y-6 ml-64">
          <Header />
          <div className="container-page">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* ✅ THÊM TOASTER Ở NGOÀI CÙNG */}
      <Toaster richColors position="top-right" />
    </div>
  );
}
