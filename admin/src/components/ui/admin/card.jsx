export function Card({ className = "", children }) {
  return <div className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}>{children}</div>;
}
