import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const { pathname } = useLocation();
  const items = [
    { to: "/", label: "Dashboard" },
    { to: "/analytics", label: "Analytics" },
    { to: "/accounts", label: "Accounts" },
    { to: "/feedback", label: "Feedback" },
    { to: "/settings", label: "Settings" },
  ];
  return (
    <div className="fixed top-0 left-0 h-screen w-64 bg-white shadow-lg">

    <aside className="w-64 min-h-screen border-r bg-white p-4 sticky top-0">
      <h1 className="text-xl font-bold mb-4 text-brand">Admin</h1>
      <nav className="space-y-1">
        {items.map(it => {
          const active = pathname === it.to;
          return (
            <Link key={it.to} to={it.to}
              className={`block rounded px-3 py-2 text-sm ${active ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100"}`}>
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>

    </div>
  );
}
