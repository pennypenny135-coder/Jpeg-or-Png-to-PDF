/**
 * 圖片處理工具（全部在瀏覽器執行）
 * - 以 createImageBitmap 解碼並套用 EXIF 方向
 * - 以 Canvas 縮細、旋轉、白底填充，再重新編碼為 JPEG
 */

/** 超過此像素總數（約 1.5 億）視為過大，不處理 */
export const MAX_PIXELS = 150_000_000;
/** 縮圖最長邊 */
const THUMB_MAX_SIDE = 240;

const MSG_CORRUPT = "檔案損壞或無法解碼。";
const MSG_MEMORY = "瀏覽器記憶體不足，請改用較小的輸出尺寸或減少圖片數量。";

/** 已知、可直接顯示給使用者的錯誤 */
export class ImageProcessError extends Error {}

/** 使用者取消轉換 */
export class CancelError extends Error {
  constructor() {
    super("已取消");
  }
}

/** 將各種例外轉成易明的繁體中文原因 */
export function describeError(error: unknown): string {
  if (error instanceof ImageProcessError) return error.message;
  if (error instanceof DOMException) {
    if (error.name === "QuotaExceededError") return MSG_MEMORY;
    if (["InvalidStateError", "EncodingError", "DataError", "NotSupportedError"].includes(error.name)) {
      return MSG_CORRUPT;
    }
  }
  if (error instanceof RangeError) return MSG_MEMORY;
  const message = error instanceof Error ? error.message : "";
  if (/memory|allocation|too large|quota/i.test(message)) return MSG_MEMORY;
  return `處理失敗：${message || "未知錯誤"}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * 解碼圖片。imageOrientation: 'from-image' 會按 EXIF 方向自動轉正，
 * 回傳的 bitmap 寬高已是「轉正後」的尺寸。
 */
export async function decodeBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== "function") {
    throw new ImageProcessError("此瀏覽器不支援圖片解碼（createImageBitmap），請更新瀏覽器。");
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (first) {
    if (first instanceof RangeError) throw new ImageProcessError(MSG_MEMORY);
    // 部分舊瀏覽器不接受該選項或 EXIF 解碼失敗：改用預設方式再試一次
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new ImageProcessError("檔案損壞，或 EXIF 方向資料無法解碼。");
    }
  }
  if (bitmap.width === 0 || bitmap.height === 0) {
    bitmap.close();
    throw new ImageProcessError(MSG_CORRUPT);
  }
  if (bitmap.width * bitmap.height > MAX_PIXELS) {
    const message = `圖片過大（${bitmap.width} × ${bitmap.height} px），超出可處理上限。`;
    bitmap.close();
    throw new ImageProcessError(message);
  }
  return bitmap;
}

/** 按最長邊上限等比例縮細；不會放大 */
export function computeTargetSize(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (!Number.isFinite(maxSide) || longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImageProcessError(MSG_MEMORY))),
      "image/jpeg",
      quality,
    );
  });
}

interface EncodeOptions {
  /** 縮放後（未旋轉）的尺寸 */
  width: number;
  height: number;
  /** 是否順時針旋轉 90° */
  rotate: boolean;
  quality: number;
}

/**
 * 將 bitmap 畫到 Canvas（白底，解決 PNG 透明背景），再編碼為 JPEG。
 * 回傳 Uint8Array，避免長時間持有 base64 字串。Canvas 於完成後立即釋放。
 */
export async function encodeJpeg(bitmap: ImageBitmap, opts: EncodeOptions): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  try {
    canvas.width = opts.rotate ? opts.height : opts.width;
    canvas.height = opts.rotate ? opts.width : opts.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImageProcessError(MSG_MEMORY);

    // 先填白色，透明像素便不會變黑
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (opts.rotate) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(bitmap, -opts.width / 2, -opts.height / 2, opts.width, opts.height);
    } else {
      ctx.drawImage(bitmap, 0, 0, opts.width, opts.height);
    }

    const blob = await canvasToBlob(canvas, opts.quality);
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    // 釋放 Canvas 佔用的像素記憶體
    canvas.width = 0;
    canvas.height = 0;
  }
}

/** 產生小縮圖及尺寸資料（已套用 EXIF 方向）。呼叫者負責 revoke 回傳的 URL */
export async function createThumbnail(
  file: File,
): Promise<{ url: string; width: number; height: number }> {
  const bitmap = await decodeBitmap(file);
  const { width, height } = bitmap;
  try {
    const target = computeTargetSize(width, height, THUMB_MAX_SIDE);
    const bytes = await encodeJpeg(bitmap, { ...target, rotate: false, quality: 0.7 });
    const blob = new Blob([bytes as BlobPart], { type: "image/jpeg" });
    return { url: URL.createObjectURL(blob), width, height };
  } finally {
    bitmap.close();
  }
}
