export function Input({ className = "", ...props }) {
  return (
    <input
      className={`h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none ring-0 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${className}`}
      {...props}
    />
  );
}
