export function Select({ value, onValueChange, children }) {
  return <div className="relative inline-block">{children}</div>;
}
export function SelectTrigger({ className = "", children, onClick }) {
  return <button type="button" onClick={onClick} className={`h-10 rounded-md border border-gray-300 bg-white px-3 text-sm hover:bg-gray-50 ${className}`}>{children}</button>;
}
export function SelectValue({ placeholder }) { return <span className="text-gray-600">{placeholder}</span>; }
export function SelectContent({ className = "", children }) {
  return <div className={`absolute z-20 mt-2 w-56 rounded-md border border-gray-200 bg-white p-1 shadow-lg ${className}`}>{children}</div>;
}
export function SelectItem({ children, onSelect }) {
  return <div onClick={onSelect} className="cursor-pointer rounded px-3 py-2 text-sm hover:bg-gray-100">{children}</div>;
}
