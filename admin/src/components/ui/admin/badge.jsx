export function Badge({ className = "", children, variant = "default" }) {
  const variants = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-700",
    warn: "bg-yellow-100 text-yellow-700",
    info: "bg-blue-100 text-blue-700",
  };
  return <span className={`inline-block rounded px-2 py-0.5 text-xs ${variants[variant]} ${className}`}>{children}</span>;
}
