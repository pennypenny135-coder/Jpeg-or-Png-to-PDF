/** 檔案與檔名驗證 */

export const UNSUPPORTED_MESSAGE = "暫只支援 JPEG/JPG、PNG 同 WebP。";

/** 一次最多加入的圖片數量，避免列表過長 */
export const MAX_FILES = 200;
/** 單張圖片檔案大小上限 */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

const SUPPORTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const SUPPORTED_MIMES = ["image/jpeg", "image/png", "image/webp"];

export function getExtension(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
}

function formatMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** 驗證單個檔案；通過回傳 null，否則回傳原因 */
export function validateImageFile(file: File): string | null {
  const ext = getExtension(file.name);
  const mime = file.type.toLowerCase();

  // 副檔名與 MIME 都要符合（任何一個有值但不支援就拒絕）
  const extBad = ext !== "" && !SUPPORTED_EXTENSIONS.includes(ext);
  const mimeBad = mime !== "" && !SUPPORTED_MIMES.includes(mime);
  if (extBad || mimeBad || (ext === "" && mime === "")) {
    return UNSUPPORTED_MESSAGE;
  }
  if (file.size === 0) return "檔案是空的（0 KB），可能已損壞。";
  if (file.size > MAX_FILE_BYTES) {
    return `圖片過大（${formatMB(file.size)}），單張上限為 ${formatMB(MAX_FILE_BYTES)}。`;
  }
  return null;
}

const ILLEGAL_CHARS = /[\\/:*?"<>|\u0000-\u001f]/;
const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/** 驗證自訂檔名；空字串視為使用預設檔名。有問題時回傳錯誤訊息 */
export function validateFileName(raw: string): string | null {
  const name = raw.trim();
  if (!name) return null;
  const base = name.replace(/\.pdf$/i, "");
  if (!base) return "請輸入檔名（不可只有 .pdf）。";
  if (ILLEGAL_CHARS.test(base)) {
    return '檔名不可包含 \\ / : * ? " < > | 等字元。';
  }
  if (/[. ]$/.test(base) || /^\./.test(base)) {
    return "檔名不可以句點開頭，或以句點、空格結尾。";
  }
  if (RESERVED_NAMES.test(base)) return "此檔名為系統保留字，請更換。";
  if (base.length > 100) return "檔名太長（上限 100 個字元）。";
  return null;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** 預設檔名：images_YYYY-MM-DD_HH-mm.pdf */
export function defaultFileName(now: Date = new Date()): string {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}`;
  return `images_${date}_${time}.pdf`;
}

/** 取得最終檔名（已驗證），確保以 .pdf 結尾 */
export function resolveFileName(raw: string, now: Date = new Date()): string {
  const name = raw.trim();
  if (!name) return defaultFileName(now);
  return /\.pdf$/i.test(name) ? name : `${name}.pdf`;
}
