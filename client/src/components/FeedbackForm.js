import React, { useState, useEffect, useCallback } from 'react';
import { getRatingText } from '../utils/ratingUtils';
import { API_ENDPOINTS } from '../utils/apiConfig';
import './FeedbackForm.css';

const FeedbackForm = ({ orderId, onFeedbackSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [waiterRating, setWaiterRating] = useState(0);
  const [chefRating, setChefRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canFeedback, setCanFeedback] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState(null);
  const [checkingFeedback, setCheckingFeedback] = useState(true);
  const [employees, setEmployees] = useState({ waiters: [], chefs: [] });
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const checkCanFeedback = useCallback(async () => {
    try {
      setCheckingFeedback(true);
      const response = await fetch(API_ENDPOINTS.CUSTOMER.ORDER_CAN_FEEDBACK(orderId));
      const data = await response.json();

      if (data.success) {
        setCanFeedback(data.canFeedback);
        if (data.feedback) {
          setExistingFeedback(data.feedback);
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Lỗi kiểm tra quyền đánh giá');
    } finally {
      setCheckingFeedback(false);
    }
  }, [orderId]);

  useEffect(() => {
    checkCanFeedback();
  }, [orderId, checkCanFeedback]);

  // Lấy thông tin waiter và chef đã tham gia order
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!orderId) return;
      try {
        setLoadingEmployees(true);
        const response = await fetch(API_ENDPOINTS.CUSTOMER.ORDER_EMPLOYEES(orderId));
        const data = await response.json();
        if (data.success) {
          setEmployees(data.data || { waiters: [], chefs: [] });
        }
      } catch (err) {
        console.error('Lỗi khi tải thông tin nhân viên:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };

    if (canFeedback) {
      fetchEmployees();
    }
  }, [orderId, canFeedback]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Vui lòng chọn số sao đánh giá');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(API_ENDPOINTS.CUSTOMER.ORDER_FEEDBACK(orderId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: rating,
          comment: comment.trim(),
          waiterRating: waiterRating > 0 ? waiterRating : undefined,
          chefRating: chefRating > 0 ? chefRating : undefined
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setExistingFeedback(data.data);
        setCanFeedback(false);
        if (onFeedbackSubmitted) {
          onFeedbackSubmitted(data.data);
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Lỗi gửi đánh giá');
    } finally {
      setLoading(false);
    }
  }

  const renderStars = (currentRating, setRatingFn, disabled = false) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star ${star <= currentRating ? 'active' : ''}`}
            onClick={() => setRatingFn(star)}
            disabled={disabled || loading}
          >
            ★
          </button>
        ))}
        <span className="rating-text">
          {getRatingText(currentRating)}
        </span>
      </div>
    );
  };

  if (checkingFeedback) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Đang kiểm tra...</p>
      </div>
    );
  }

  if (!canFeedback && !existingFeedback) {
    return (
      <div className="no-feedback-message">
        <p>Chỉ có thể đánh giá đơn hàng đã thanh toán</p>
      </div>
    );
  }

  if (existingFeedback) {
    return (
      <div className="existing-feedback">
        <h3>Đánh giá của bạn</h3>
        <div className="feedback-display">
          <div className="rating-display">
            <strong>Đánh giá tổng thể:</strong>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`star-display ${star <= existingFeedback.rating ? 'active' : ''}`}
              >
                ★
              </span>
            ))}
            <span className="rating-text">
              {getRatingText(existingFeedback.rating)}
            </span>
          </div>
          {existingFeedback.waiterRating && (
            <div className="rating-display">
              <strong>Đánh giá phục vụ:</strong>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star-display ${star <= existingFeedback.waiterRating ? 'active' : ''}`}
                >
                  ★
                </span>
              ))}
              <span className="rating-text">
                {getRatingText(existingFeedback.waiterRating)}
              </span>
            </div>
          )}
          {existingFeedback.chefRating && (
            <div className="rating-display">
              <strong>Đánh giá món ăn:</strong>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star-display ${star <= existingFeedback.chefRating ? 'active' : ''}`}
                >
                  ★
                </span>
              ))}
              <span className="rating-text">
                {getRatingText(existingFeedback.chefRating)}
              </span>
            </div>
          )}
          {existingFeedback.comment && (
            <div className="comment-display">
              <strong>Nhận xét:</strong>
              <p>{existingFeedback.comment}</p>
            </div>
          )}
          <div className="feedback-date">
            Đánh giá ngày: {new Date(existingFeedback.createdAt).toLocaleDateString('vi-VN')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-form">
      <p className="feedback-description">
        Chúng tôi rất mong nhận được phản hồi từ bạn để cải thiện chất lượng dịch vụ
      </p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Đánh giá tổng thể: <span style={{color: 'red'}}>*</span></label>
            {renderStars(rating, setRating)}
          </div>

          {employees.waiters && employees.waiters.length > 0 && (
            <div className="form-group">
              <label>Đánh giá phục vụ (tùy chọn):</label>
              {loadingEmployees ? (
                <p>Đang tải thông tin...</p>
              ) : (
                <>
                  {renderStars(waiterRating, setWaiterRating)}
                </>
              )}
            </div>
          )}

          {employees.chefs && employees.chefs.length > 0 && (
            <div className="form-group">
              <label>Đánh giá món ăn (tùy chọn):</label>
              {loadingEmployees ? (
                <p>Đang tải thông tin...</p>
              ) : (
                <>
                  {renderStars(chefRating, setChefRating)}
                </>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="comment">Nhận xét (tùy chọn):</label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Hãy chia sẻ trải nghiệm của bạn..."
              rows="4"
              maxLength="500"
              disabled={loading}
            />
            <div className="char-count">
              {comment.length}/500 ký tự
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className="submit-btn"
              disabled={loading || rating === 0}
            >
              {loading ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </form>
    </div>
  );
};

export default FeedbackForm;
