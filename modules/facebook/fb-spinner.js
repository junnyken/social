// ============================================================
// Content Spinner — Tạo biến thể nội dung tự động
// ============================================================

/**
 * Content Spinner
 * Input:  "Chào {bạn|anh|chị}! {Ưu đãi hot|Deal khủng} hôm nay!"
 * Output: "Chào anh! Deal khủng hôm nay!" (random mỗi lần)
 */
export function spin(content) {
  return content.replace(/\{([^}]+)\}/g, (_, group) => {
    const options = group.split('|').map(s => s.trim());
    return options[Math.floor(Math.random() * options.length)];
  });
}

/**
 * Template variables
 * Input:  "Sản phẩm: {product}, Giá: {price}"
 * Context:{ product: "Áo dài", price: "500k" }
 * Output: "Sản phẩm: Áo dài, Giá: 500k"
 */
export function renderTemplate(content, context = {}) {
  let result = content;
  Object.entries(context).forEach(([key, value]) => {
    result = result.replaceAll(`{${key}}`, value);
  });
  return spin(result);  // Spin sau khi fill template vars
}

/**
 * Preview: Trả về N biến thể khác nhau của 1 bài
 */
export function previewSpins(content, count = 3) {
  return Array.from({ length: count }, () => spin(content));
}
