import EmployeePerformanceDetail from "../../components/admin/EmployeePerformanceDetail";
import { useParams } from "react-router-dom";

export default function PerformanceDetailPage() {
  const { userId } = useParams(); 
  return (
    <div className="p-6">
      <EmployeePerformanceDetail userId={userId} /> 
    </div>
  );
}
