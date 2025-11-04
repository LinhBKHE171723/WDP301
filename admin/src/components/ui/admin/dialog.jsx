import React, { useState, createContext, useContext } from "react";

const DialogContext = createContext();

export function Dialog({ children, open: controlledOpen, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Ưu tiên dùng prop open nếu được truyền từ ngoài (như khi Edit)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {/* DialogTrigger tự xử lý toggle */}
      {React.Children.toArray(children).filter(
        (child) => child.type?.name === "DialogTrigger"
      )}

      {/* Khi open = true → render popup */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50">
            {React.Children.toArray(children).find(
              (child) => child.type?.name === "DialogContent"
            )}
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({ asChild = false, children }) {
  const { setOpen } = useContext(DialogContext);

  const handleClick = (e) => {
    if (children?.props?.onClick) children.props.onClick(e);
    setOpen(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { onClick: handleClick });
  }

  return <button onClick={handleClick}>{children}</button>;
}

export function DialogContent({ className = "", children }) {
  return (
    <div
      className={`w-full max-w-lg rounded-xl bg-white p-6 shadow-xl ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export const DialogHeader = ({ children }) => <div className="mb-3">{children}</div>;
export const DialogTitle = ({ children }) => <h3 className="text-lg font-semibold">{children}</h3>;
export const DialogDescription = ({ children }) => <p className="text-sm text-gray-600">{children}</p>;
export const DialogFooter = ({ children }) => <div className="mt-6 flex justify-end gap-2">{children}</div>;
