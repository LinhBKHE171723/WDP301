import { useState, useEffect } from "react";
import { Card } from "../../components/ui/admin/card";
import { Button } from "../../components/ui/admin/button";
import { Input } from "../../components/ui/admin/input";
import adminApi from "../../api/adminApi";
import { toast } from "react-toastify";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [threshold, setThreshold] = useState(2000000);
  const [autoAssignToCashier, setAutoAssignToCashier] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getPreOrderSettings();
      
      // Client interceptor trả về res.data, nên response = { success: true, message: "...", data: {...} }
      const settings = response?.data || response;
      
      console.log("📥 Full response:", response); // Debug log
      console.log("📥 Settings object:", settings); // Debug log
      
      // Kiểm tra key có tồn tại trong object, không dùng || vì có thể value = 0
      if (settings && "preorder.largeOrderThreshold" in settings) {
        const thresholdValue = settings["preorder.largeOrderThreshold"];
        const numValue = typeof thresholdValue === "number" ? thresholdValue : Number(thresholdValue);
        console.log("📥 Threshold from DB:", thresholdValue, "→", numValue, "(type:", typeof numValue, ")");
        setThreshold(!isNaN(numValue) ? numValue : 2000000);
      } else {
        console.log("⚠️ No threshold key found, using default");
        setThreshold(2000000); // Chỉ set default khi key không tồn tại
      }
      
      if (settings && "preorder.autoAssignToCashier" in settings) {
        setAutoAssignToCashier(settings["preorder.autoAssignToCashier"]);
      } else {
        setAutoAssignToCashier(true);
      }
    } catch (error) {
      console.error("❌ Error loading settings:", error);
      toast.error("Không thể tải cài đặt");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Validation
      if (threshold < 0) {
        toast.error("Ngưỡng đơn lớn phải lớn hơn hoặc bằng 0");
        return;
      }

      setSaving(true);

      // Đảm bảo threshold là number
      const thresholdNumber = typeof threshold === "number" ? threshold : Number(threshold);
      
      console.log("Saving threshold:", thresholdNumber, "Type:", typeof thresholdNumber); // Debug log

      // Update threshold
      const thresholdResponse = await adminApi.updateSetting(
        "preorder.largeOrderThreshold",
        thresholdNumber,
        "Ngưỡng giá trị để phân loại đơn lớn/nhỏ",
        "preorder"
      );
      
      console.log("Threshold save response:", thresholdResponse); // Debug log

      // Update autoAssignToCashier
      await adminApi.updateSetting(
        "preorder.autoAssignToCashier",
        autoAssignToCashier,
        "Tự động gán đơn nhỏ cho cashier",
        "preorder"
      );

      toast.success("Đã lưu cài đặt thành công");
      
      // Reload settings sau khi save để đảm bảo UI sync với database
      setTimeout(() => {
        loadSettings();
      }, 500);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Không thể lưu cài đặt");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("vi-VN").format(value);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="p-6 text-center">Đang tải...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Cài đặt đơn đặt trước</h2>

          <div className="space-y-6 max-w-2xl">
            {/* Ngưỡng đơn lớn */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngưỡng đơn lớn (VND)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Đơn có tổng giá trị lớn hơn ngưỡng này sẽ được gửi cho Admin. 
                Đơn nhỏ hơn hoặc bằng ngưỡng sẽ được gửi cho Cashier.
              </p>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="0"
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
                  className="flex-1"
                  placeholder="Nhập ngưỡng..."
                />
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  = {formatCurrency(threshold)} ₫
                </span>
              </div>
            </div>

            {/* Toggle auto assign */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAssignToCashier}
                  onChange={(e) => setAutoAssignToCashier(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <span className="block text-sm font-medium text-gray-700">
                    Tự động gán đơn nhỏ cho Cashier
                  </span>
                  <span className="text-xs text-gray-500">
                    Khi bật, đơn nhỏ sẽ tự động hiển thị cho Cashier thay vì Admin
                  </span>
                </div>
              </label>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                Lưu ý:
              </h3>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Admin chỉ thấy và xử lý đơn lớn (tổng tiền &gt; ngưỡng)</li>
                <li>Cashier chỉ thấy và xử lý đơn nhỏ (tổng tiền ≤ ngưỡng)</li>
                <li>Mỗi đơn chỉ hiển thị cho một role để tránh trùng lặp</li>
              </ul>
            </div>

            {/* Save button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={loadSettings}
                disabled={saving}
              >
                Hủy
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Đang lưu..." : "Lưu cài đặt"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
