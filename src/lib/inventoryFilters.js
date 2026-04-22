export function isLowStockProduct(product) {
  const qty = Number(product?.qty) || 0
  const threshold = Number(product?.low_stock) || 0
  return qty > 0 && qty <= threshold
}

export function getHashFilter(hash = window.location.hash || '') {
  const query = hash.includes('?') ? hash.split('?')[1] : ''
  const params = new URLSearchParams(query)
  return params.get('filter')
}
