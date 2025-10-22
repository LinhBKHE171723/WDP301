// Price filtering utilities

/**
 * Filters menus by price range
 * @param {Array} menus - Array of menus
 * @param {string} priceFilter - Price filter type
 * @returns {Array} Filtered menus
 */
export const filterMenusByPrice = (menus, priceFilter) => {
  switch (priceFilter) {
    case 'under-100k':
      return menus.filter(menu => menu.price < 100000);
    case '100k-200k':
      return menus.filter(menu => menu.price >= 100000 && menu.price < 200000);
    case '200k-500k':
      return menus.filter(menu => menu.price >= 200000 && menu.price < 500000);
    case '500k-1000k':
      return menus.filter(menu => menu.price >= 500000 && menu.price < 1000000);
    case '1000k-2000k':
      return menus.filter(menu => menu.price >= 1000000 && menu.price < 2000000);
    case '2000k-5000k':
      return menus.filter(menu => menu.price >= 2000000 && menu.price < 5000000);
    case 'over-5000k':
      return menus.filter(menu => menu.price >= 5000000);
    default:
      return menus;
  }
};

/**
 * Filters items by price range and category
 * @param {Array} items - Array of items
 * @param {string} priceFilter - Price filter type
 * @param {string} categoryFilter - Category filter
 * @returns {Array} Filtered items
 */
export const filterItemsByPriceAndCategory = (items, priceFilter, categoryFilter) => {
  let filteredItems = items;

  // Filter by price
  switch (priceFilter) {
    case 'under-50k':
      filteredItems = filteredItems.filter(item => item.price < 50000);
      break;
    case '50k-100k':
      filteredItems = filteredItems.filter(item => item.price >= 50000 && item.price < 100000);
      break;
    case '100k-200k':
      filteredItems = filteredItems.filter(item => item.price >= 100000 && item.price < 200000);
      break;
    case '200k-500k':
      filteredItems = filteredItems.filter(item => item.price >= 200000 && item.price < 500000);
      break;
    case 'over-500k':
      filteredItems = filteredItems.filter(item => item.price >= 500000);
      break;
    default:
      // No price filter
      break;
  }

  // Filter by category
  if (categoryFilter !== 'all') {
    filteredItems = filteredItems.filter(item => item.category === categoryFilter);
  }

  return filteredItems;
};

/**
 * Gets unique categories from items array
 * @param {Array} items - Array of items
 * @returns {Array} Unique categories
 */
export const getUniqueCategories = (items) => {
  const categories = [...new Set(items.map(item => item.category))];
  return categories.filter(category => category); // Remove empty/null categories
};

