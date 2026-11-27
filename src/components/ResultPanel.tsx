"use client";

import { formatBytes } from "@/lib/image";
import type { ConvertResult } from "@/types/image";

interface Props {
  result: ConvertResult;
  onDownload: () => void;
  onReset: () => void;
}

/** 轉換完成：成功訊息、頁數、檔案大小、再下載／再轉一批 */
export default function ResultPanel({ result, onDownload, onReset }: Props) {
  return (
    <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status">
      <p className="text-base font-semibold text-emerald-900">✓ PDF 已建立成功</p>
      {result.failedCount > 0 && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900">
          有 {result.failedCount} 張圖片未能處理，已跳過；PDF 只包含成功處理的圖片。
        </p>
      )}
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-white p-2.5">
          <dt className="text-xs text-slate-500">PDF 頁數</dt>
          <dd className="text-lg font-semibold text-slate-900">{result.pages} 頁</dd>
        </div>
        <div className="rounded-lg bg-white p-2.5">
          <dt className="text-xs text-slate-500">檔案大小</dt>
          <dd className="text-lg font-semibold text-slate-900">{formatBytes(result.size)}</dd>
        </div>
      </dl>
      <p className="truncate text-xs text-slate-600" title={result.fileName}>
        {result.fileName}
      </p>
      <p className="text-xs text-slate-500">如瀏覽器沒有自動下載，請按下方「下載 PDF」。</p>
      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
        <button
          type="button"
          onClick={onDownload}
          className="flex-1 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
        >
          下載 PDF
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 hover:bg-slate-100"
        >
          再轉一批
        </button>
      </div>
    </div>
  );
}
