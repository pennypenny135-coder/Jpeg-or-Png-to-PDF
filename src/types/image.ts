/** 共用型別定義 */

/** 使用者已加入的一張圖片 */
export interface ImageItem {
  id: string;
  file: File;
  name: string;
  /** 大寫副檔名，例如 JPG */
  ext: string;
  /** 原始檔案大小（bytes） */
  size: number;
  /** 已套用 EXIF 方向後的像素尺寸（讀取失敗時為 0） */
  width: number;
  height: number;
  /** 縮圖 object URL（讀取失敗時為空字串） */
  previewUrl: string;
  /** 讀取或轉換失敗的原因；有值代表此圖片會被跳過 */
  error?: string;
}

/** 被拒絕的檔案（格式不支援、過大等） */
export interface RejectedFile {
  id: string;
  name: string;
  reason: string;
}

export type PageSize = "a4" | "letter" | "fit";
export type Orientation = "auto" | "portrait" | "landscape";
export type Margin = 0 | 10 | 20;
export type Layout = "single" | "2x1" | "2x2" | "3x3";
export type Background = "white" | "black";
/** 輸出尺寸：標準 1600px、高清 2500px、原尺寸 */
export type SizePreset = "standard" | "high" | "original";

/** PDF 輸出設定 */
export interface PdfOptions {
  pageSize: PageSize;
  orientation: Orientation;
  margin: Margin;
  layout: Layout;
  background: Background;
  pageNumbers: boolean;
  sizePreset: SizePreset;
  /** JPEG 重新編碼質素 */
  jpegQuality: number;
  /** 圖片方向與頁面方向不符時，自動旋轉 90° 以填滿頁面 */
  autoRotate: boolean;
  /** 使用者自訂檔名；空字串代表使用預設檔名 */
  fileName: string;
}

export interface ConvertProgress {
  current: number;
  total: number;
  fileName: string;
}

export interface ConvertResult {
  blob: Blob;
  fileName: string;
  pages: number;
  size: number;
  failedCount: number;
}

export type Notice = { type: "info" | "error" | "success"; text: string };
