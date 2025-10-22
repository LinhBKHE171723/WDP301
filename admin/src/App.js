import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/admin/Sidebar";
import { Header } from "./components/admin/Header";
import DashboardPage from "./pages/admin/DashboardPage";
import AnalyticsPage from "./pages/admin/AnalyticsPage";
import AnalyticsPage2 from "./pages/admin/AnalyticsPage2";
import AccountsPage from "./pages/admin/AccountsPage";
import FeedbackPage from "./pages/admin/FeedbackPage";
import SettingsPage from "./pages/admin/SettingsPage";
import { Toaster } from "sonner";
import ItemReportPage from "./pages/admin/ItemReportPage";
import CustomerReportPage from "./pages/admin/CustomerReportPage";

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
              <Route path="/item-report" element={<ItemReportPage />} />
              <Route
                path="/item-analytics/:itemId"
                element={<AnalyticsPage2 />}
              />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/settings" element={<SettingsPage />} />
               <Route path="/customers" element={<CustomerReportPage/>} />
            </Routes>
          </div>
        </main>
      </div>

      <Toaster richColors position="top-right" />
    </div>
  );
}
