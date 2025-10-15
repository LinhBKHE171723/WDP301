import React, { useEffect, useState } from "react";
import { apiGet } from "../../api";
import { Link } from "react-router-dom";
import { Spinner } from "react-bootstrap";

function TableMap() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/tables")
      .then((res) => setTables(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner animation="border" variant="warning" />;

  return (
    <div className="container py-4">
      <h3 className="text-center mb-4 text-warning fw-bold">Sơ đồ bàn</h3>
      <div className="row g-3">
        {tables.map((table) => (
          <div key={table._id} className="col-6 col-md-3">
            <Link
              to={`/tables/${table._id}`}
              className={`card text-center shadow-sm border-2 ${
                table.status === "available"
                  ? "border-success"
                  : table.status === "occupied"
                  ? "border-warning"
                  : "border-secondary"
              }`}
            >
              <div className="card-body">
                <h5 className="card-title text-dark fw-bold">
                  Bàn {table.tableNumber}
                </h5>
                <p
                  className={`fw-semibold ${
                    table.status === "available"
                      ? "text-success"
                      : table.status === "occupied"
                      ? "text-warning"
                      : "text-secondary"
                  }`}
                >
                  {table.status === "available"
                    ? "Trống"
                    : table.status === "occupied"
                    ? "Đang phục vụ"
                    : "Đã đặt trước"}
                </p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TableMap;
