import React, { useState, useEffect } from 'react';
import './FeedbackForm.css';

const FeedbackForm = ({ orderId, onFeedbackSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canFeedback, setCanFeedback] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState(null);
  const [checkingFeedback, setCheckingFeedback] = useState(true);

  useEffect(() => {
    checkCanFeedback();
  }, [orderId]);

  const checkCanFeedback = async () => {
    try {
      setCheckingFeedback(true);
      const response = await fetch(`http://localhost:5000/api/customer/orders/${orderId}/can-feedback`);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Vui lòng chọn số sao đánh giá');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`http://localhost:5000/api/customer/orders/${orderId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: rating,
          comment: comment.trim()
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
  };

  const renderStars = () => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star ${star <= rating ? 'active' : ''}`}
            onClick={() => setRating(star)}
            disabled={loading}
          >
            ★
          </button>
        ))}
        <span className="rating-text">
          {rating === 0 ? 'Chọn số sao' : 
           rating === 1 ? 'Rất tệ' :
           rating === 2 ? 'Tệ' :
           rating === 3 ? 'Bình thường' :
           rating === 4 ? 'Tốt' : 'Rất tốt'}
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
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`star-display ${star <= existingFeedback.rating ? 'active' : ''}`}
              >
                ★
              </span>
            ))}
            <span className="rating-text">
              {existingFeedback.rating === 1 ? 'Rất tệ' :
               existingFeedback.rating === 2 ? 'Tệ' :
               existingFeedback.rating === 3 ? 'Bình thường' :
               existingFeedback.rating === 4 ? 'Tốt' : 'Rất tốt'}
            </span>
          </div>
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
            <label>Đánh giá tổng thể:</label>
            {renderStars()}
          </div>

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
