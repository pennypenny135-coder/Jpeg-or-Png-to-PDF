"use client";

import type { ReactNode } from "react";
import type { PdfOptions } from "@/types/image";

interface Props {
  options: PdfOptions;
  disabled?: boolean;
  fileNameError: string | null;
  defaultName: string;
  hasLargeImages: boolean;
  onChange: (patch: Partial<PdfOptions>) => void;
}

interface Choice<T> {
  value: T;
  label: string;
  disabled?: boolean;
}

/** 單選按鈕組 */
function Segmented<T extends string | number>({
  label,
  value,
  choices,
  disabled,
  onSelect,
  hint,
}: {
  label: string;
  value: T;
  choices: Choice<T>[];
  disabled?: boolean;
  onSelect: (value: T) => void;
  hint?: ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {choices.map((c) => {
          const active = c.value === value;
          return (
            <button
              key={String(c.value)}
              type="button"
              aria-pressed={active}
              disabled={disabled || c.disabled}
              onClick={() => onSelect(c.value)}
              className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                active
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      {hint && <div className="mt-1.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export default function PdfSettings({ options, disabled, fileNameError, defaultName, hasLargeImages, onChange }: Props) {
  const isFit = options.pageSize === "fit";

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="PDF 設定">
      <h2 className="text-lg font-semibold">PDF 設定</h2>

      <Segmented
        label="頁面大小"
        value={options.pageSize}
        disabled={disabled}
        onSelect={(pageSize) => onChange({ pageSize })}
        choices={[
          { value: "a4", label: "A4" },
          { value: "letter", label: "Letter" },
          { value: "fit", label: "符合圖片原尺寸" },
        ]}
      />

      <Segmented
        label="方向"
        value={options.orientation}
        disabled={disabled || isFit}
        onSelect={(orientation) => onChange({ orientation })}
        choices={[
          { value: "auto", label: "自動" },
          { value: "portrait", label: "直向" },
          { value: "landscape", label: "橫向" },
        ]}
        hint={isFit ? "「符合圖片原尺寸」會按每張圖片的方向建立頁面。" : "自動：按圖片長寬比決定直向或橫向。"}
      />

      <Segmented
        label="邊距"
        value={options.margin}
        disabled={disabled}
        onSelect={(margin) => onChange({ margin })}
        choices={[
          { value: 0, label: "0 mm" },
          { value: 10, label: "10 mm" },
          { value: 20, label: "20 mm" },
        ]}
      />

      <Segmented
        label="圖片排列"
        value={options.layout}
        disabled={disabled || isFit}
        onSelect={(layout) => onChange({ layout })}
        choices={[
          { value: "single", label: "每張一頁" },
          { value: "2x1", label: "2 × 1（每頁 2 張）" },
          { value: "2x2", label: "2 × 2（每頁 4 張）" },
          { value: "3x3", label: "3 × 3（每頁 9 張）" },
        ]}
        hint={isFit ? "「符合圖片原尺寸」只能每張一頁。" : undefined}
      />

      {!isFit && (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={options.autoRotate}
            disabled={disabled}
            onChange={(e) => onChange({ autoRotate: e.target.checked })}
            className="h-5 w-5 rounded border-slate-300 accent-blue-600"
          />
          自動旋轉：橫向圖片放入直向頁面時轉向，令圖片更大
        </label>
      )}

      <Segmented
        label="頁面背景"
        value={options.background}
        disabled={disabled}
        onSelect={(background) => onChange({ background })}
        choices={[
          { value: "white", label: "白色" },
          { value: "black", label: "黑色" },
        ]}
      />

      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={options.pageNumbers}
          disabled={disabled}
          onChange={(e) => onChange({ pageNumbers: e.target.checked })}
          className="h-5 w-5 rounded border-slate-300 accent-blue-600"
        />
        顯示頁碼（第 X / Y 頁，頁面底部置中）
      </label>

      <hr className="border-slate-200" />

      <Segmented
        label="輸出尺寸"
        value={options.sizePreset}
        disabled={disabled}
        onSelect={(sizePreset) => onChange({ sizePreset })}
        choices={[
          { value: "standard", label: "標準（最長邊 1600px）" },
          { value: "high", label: "高清（最長邊 2500px）" },
          { value: "original", label: "原尺寸" },
        ]}
        hint={
          options.sizePreset === "original" && (
            <span className={hasLargeImages ? "font-medium text-amber-700" : undefined}>
              ⚠ 原尺寸不會縮細。
              {hasLargeImages
                ? "你選取的圖片中有超大圖片，處理時可能令瀏覽器記憶體不足，建議改用「高清」。"
                : "圖片過大時可能令瀏覽器記憶體不足。"}
            </span>
          )
        }
      />

      <Segmented
        label="JPEG 質素"
        value={options.jpegQuality}
        disabled={disabled}
        onSelect={(jpegQuality) => onChange({ jpegQuality })}
        choices={[
          { value: 0.7, label: "0.7" },
          { value: 0.85, label: "0.85" },
          { value: 0.9, label: "0.9（預設）" },
          { value: 0.95, label: "0.95" },
        ]}
        hint="質素越高，檔案越大。"
      />

      <div>
        <label htmlFor="pdf-file-name" className="mb-1.5 block text-sm font-medium text-slate-700">
          檔名
        </label>
        <input
          id="pdf-file-name"
          type="text"
          value={options.fileName}
          disabled={disabled}
          placeholder={defaultName || "images.pdf"}
          onChange={(e) => onChange({ fileName: e.target.value })}
          aria-invalid={fileNameError ? true : undefined}
          className={`w-full rounded-lg border px-3 py-2.5 text-base focus:outline-none focus:ring-4 ${
            fileNameError
              ? "border-red-400 focus:ring-red-100"
              : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
          }`}
        />
        {fileNameError ? (
          <p className="mt-1 text-xs font-medium text-red-600">{fileNameError}</p>
        ) : (
          <p className="mt-1 text-xs text-slate-500">留空即使用預設檔名；未輸入 .pdf 會自動補上。</p>
        )}
      </div>
    </section>
  );
}
