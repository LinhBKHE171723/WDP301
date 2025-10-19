import React, { useState } from "react";
import { Badge } from "react-bootstrap";
import { Bell } from "lucide-react";

export default function NotificationBell() {
  const [count, setCount] = useState(3); // Tạm thời hiển thị 3 thông báo

  return (
    <div className="position-relative">
      <Bell size={26} color="#ff8800" />
      {count > 0 && (
        <Badge
          bg="danger"
          pill
          className="position-absolute top-0 start-100 translate-middle"
        >
          {count}
        </Badge>
      )}
    </div>
  );
}
