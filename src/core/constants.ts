// Định nghĩa cấu hình biến cho các Model VRM và thông số liên quan
export const MODEL_CITLALI = '/Citlali.vrm';
export const MODEL_XIANYUN = '/Xianyun.vrm';
export const MODEL_LAUMA = '/Lauma.vrm';
export const MODEL_NAHIDA = '/Nahida.vrm';
export const MODEL_YAEMIKO = '/YaeMiko.vrm';

// Các tên biến đường dẫn cũ (dùng để tương thích ngược với localStorage hoặc database)
export const LEGACY_MODEL_1 = '/model.vrm';
export const LEGACY_MODEL_2 = '/model2.vrm';

/**
 * Chuẩn hóa URL model về các hằng số tên mới
 */
export function normalizeModelUrl(url?: string | null): string {
  if (!url) return MODEL_CITLALI;
  if (url === LEGACY_MODEL_1) return MODEL_CITLALI;
  if (url === LEGACY_MODEL_2) return MODEL_XIANYUN;
  return url;
}

/**
 * Kiểm tra xem model đang chọn có phải là Xianyun hay không
 */
export function isXianyunModel(url?: string | null): boolean {
  const normalized = normalizeModelUrl(url);
  return normalized === MODEL_XIANYUN;
}

/**
 * Kiểm tra xem model đang chọn có phải là Lauma hay không
 */
export function isLaumaModel(url?: string | null): boolean {
  const normalized = normalizeModelUrl(url);
  return normalized === MODEL_LAUMA;
}

/**
 * Kiểm tra xem model đang chọn có phải là Nahida hay không
 */
export function isNahidaModel(url?: string | null): boolean {
  const normalized = normalizeModelUrl(url);
  return normalized === MODEL_NAHIDA;
}

/**
 * Kiểm tra xem model đang chọn có phải là YaeMiko hay không
 */
export function isYaeMikoModel(url?: string | null): boolean {
  const normalized = normalizeModelUrl(url);
  return normalized === MODEL_YAEMIKO;
}
