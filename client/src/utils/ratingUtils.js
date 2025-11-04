// Rating utilities

/**
 * Gets Vietnamese text for rating value
 * @param {number} rating - Rating value (1-5)
 * @returns {string} Vietnamese rating text
 */
export const getRatingText = (rating) => {
  const ratingMap = {
    1: 'Rất tệ',
    2: 'Tệ',
    3: 'Bình thường',
    4: 'Tốt',
    5: 'Rất tốt'
  };
  return ratingMap[rating] || 'Chọn số sao';
};

