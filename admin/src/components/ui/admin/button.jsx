export function Button({ className = "", variant = "default", size = "md", ...props }) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-200",
    outline: "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 focus:ring-blue-200",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-blue-200",
    destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-200",
  };
  const sizes = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-11 px-5 text-base" };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}
