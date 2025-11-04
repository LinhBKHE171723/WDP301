import React from "react";

export function DropdownMenu({ children }) {
  return <div className="relative inline-block text-left">{children}</div>;
}

export function DropdownMenuTrigger({ children, ...props }) {
  return (
    <button {...props} className="focus:outline-none">
      {children}
    </button>
  );
}

export function DropdownMenuContent({ children, isOpen }) {
  if (!isOpen) return null; // 🔴 THÊM DÒNG NÀY
  return (
    <div className="absolute right-0 mt-2 w-40 rounded-md bg-white border shadow-lg z-50">
      {children}
    </div>
  );
}

export function DropdownMenuItem({ children, onClick, className }) {
  return (
    <div
      onClick={onClick}
      className={`px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer ${className}`}
    >
      {children}
    </div>
  );
}
