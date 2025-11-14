/**
 * Utility để quản lý dialog popup thay thế alert/confirm
 * Sử dụng React state để hiển thị dialog
 */

let setDialogState = null;

/**
 * Khởi tạo dialog state (gọi trong component chính)
 */
export const initDialog = (setState) => {
  setDialogState = setState;
};

/**
 * Hiển thị dialog thông báo (thay thế alert)
 */
export const showDialog = (options) => {
  if (!setDialogState) {
    console.warn('Dialog chưa được khởi tạo. Sử dụng alert() thay thế.');
    if (options.type === 'confirm') {
      return Promise.resolve(window.confirm(options.message || options.title));
    } else {
      window.alert(options.message || options.title);
      return Promise.resolve();
    }
  }

  const defaultOptions = {
    show: true,
    title: "Thông báo",
    message: "",
    type: "info",
    confirmText: "OK",
    cancelText: "Huỷ"
  };

  // Trả về promise để có thể dùng với async/await
  return new Promise((resolve) => {
    const originalOnConfirm = options.onConfirm;
    const originalOnCancel = options.onCancel;

    setDialogState({
      ...defaultOptions,
      ...options,
      onConfirm: () => {
        if (originalOnConfirm) originalOnConfirm();
        setDialogState({ show: false });
        resolve(true);
      },
      onCancel: () => {
        if (originalOnCancel) originalOnCancel();
        setDialogState({ show: false });
        resolve(false);
      }
    });
  });
};

/**
 * Hiển thị dialog xác nhận (thay thế confirm)
 */
export const showConfirm = (message, title = "Xác nhận") => {
  return showDialog({
    title,
    message,
    type: 'confirm',
    confirmText: 'OK',
    cancelText: 'Huỷ'
  });
};

/**
 * Hiển thị dialog thông báo lỗi
 */
export const showError = (message, title = "Lỗi") => {
  return showDialog({
    title,
    message,
    type: 'error'
  });
};

/**
 * Hiển thị dialog thông báo thành công
 */
export const showSuccess = (message, title = "Thành công") => {
  return showDialog({
    title,
    message,
    type: 'success'
  });
};

/**
 * Hiển thị dialog cảnh báo
 */
export const showWarning = (message, title = "Cảnh báo") => {
  return showDialog({
    title,
    message,
    type: 'warning'
  });
};

/**
 * Hiển thị dialog thông tin
 */
export const showInfo = (message, title = "Thông tin") => {
  return showDialog({
    title,
    message,
    type: 'info'
  });
};

/**
 * Đóng dialog
 */
export const closeDialog = () => {
  if (setDialogState) {
    setDialogState({ show: false });
  }
};

