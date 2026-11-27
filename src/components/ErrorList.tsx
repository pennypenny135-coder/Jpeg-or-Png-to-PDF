"use client";

import { UNSUPPORTED_MESSAGE } from "@/lib/validation";
import type { ImageItem, RejectedFile } from "@/types/image";

interface Props {
  rejected: RejectedFile[];
  failed: ImageItem[];
  disabled?: boolean;
  onRemoveItem: (id: string) => void;
  onDismissRejected: (id?: string) => void;
}

/** 列出被拒絕的檔案，以及讀取／轉換失敗的圖片 */
export default function ErrorList({ rejected, failed, disabled = false, onRemoveItem, onDismissRejected }: Props) {
  if (rejected.length === 0 && failed.length === 0) return null;
  const hasUnsupported = rejected.some((r) => r.reason === UNSUPPORTED_MESSAGE);

  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5" role="alert" aria-label="錯誤清單">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-red-800">
          有 {rejected.length + failed.length} 個檔案未能加入或處理
        </h2>
        {rejected.length > 0 && (
          <button
            type="button"
            onClick={() => onDismissRejected()}
            className="text-sm font-medium text-red-700 underline underline-offset-2 hover:text-red-900"
          >
            忽略全部拒絕項目
          </button>
        )}
      </div>
      {hasUnsupported && <p className="mb-3 text-sm font-medium text-red-700">{UNSUPPORTED_MESSAGE}</p>}

      <ul className="space-y-2">
        {failed.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 rounded-lg bg-white p-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900" title={item.name}>
                {item.name}
              </p>
              <p className="text-red-600">{item.error}</p>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemoveItem(item.id)}
              className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 font-medium text-red-700 hover:bg-red-100 disabled:opacity-40"
            >
              移除
            </button>
          </li>
        ))}
        {rejected.map((file) => (
          <li key={file.id} className="flex items-start justify-between gap-3 rounded-lg bg-white p-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900" title={file.name}>
                {file.name}
              </p>
              <p className="text-red-600">{file.reason}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismissRejected(file.id)}
              className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 font-medium text-red-700 hover:bg-red-100"
            >
              移除
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
