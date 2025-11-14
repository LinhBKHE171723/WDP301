import React from 'react';
import './ConfirmDialog.css';

/**
 * Component ConfirmDialog - Popup xác nhận thay thế alert/confirm
 * 
 * @param {boolean} show - Hiển thị dialog hay không
 * @param {string} title - Tiêu đề dialog
 * @param {string} message - Nội dung thông báo
 * @param {string} type - Loại dialog: 'info', 'warning', 'error', 'success', 'confirm'
 * @param {function} onConfirm - Callback khi nhấn OK/Confirm
 * @param {function} onCancel - Callback khi nhấn Cancel (chỉ với type='confirm')
 * @param {string} confirmText - Text nút xác nhận (mặc định: "OK")
 * @param {string} cancelText - Text nút hủy (mặc định: "Huỷ")
 */
const ConfirmDialog = ({
  show,
  title = "Thông báo",
  message = "",
  type = "info",
  onConfirm,
  onCancel,
  confirmText = "OK",
  cancelText = "Huỷ"
}) => {
  if (!show) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '';
      case 'error':
        return '';
      case 'warning':
        return '';
      case 'confirm':
        return '';
      default:
        return '';
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'success':
        return 'confirm-dialog-success';
      case 'error':
        return 'confirm-dialog-error';
      case 'warning':
        return 'confirm-dialog-warning';
      case 'confirm':
        return 'confirm-dialog-confirm';
      default:
        return 'confirm-dialog-info';
    }
  };

  return (
    <div className="confirm-dialog-overlay" onClick={type === 'confirm' ? handleCancel : handleConfirm}>
      <div className={`confirm-dialog ${getTypeClass()}`} onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-header">
          <span className="confirm-dialog-icon">{getIcon()}</span>
          <h3 className="confirm-dialog-title">{title}</h3>
        </div>
        <div className="confirm-dialog-body">
          <p className="confirm-dialog-message">{message}</p>
        </div>
        <div className="confirm-dialog-footer">
          {type === 'confirm' ? (
            <>
              <button
                className="confirm-dialog-btn confirm-dialog-btn-cancel"
                onClick={handleCancel}
              >
                {cancelText}
              </button>
              <button
                className="confirm-dialog-btn confirm-dialog-btn-confirm"
                onClick={handleConfirm}
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              className="confirm-dialog-btn confirm-dialog-btn-primary"
              onClick={handleConfirm}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

