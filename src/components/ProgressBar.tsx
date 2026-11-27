"use client";

import type { ConvertProgress } from "@/types/image";

interface Props {
  progress: ConvertProgress;
  cancelling: boolean;
  onCancel: () => void;
}

/** 轉換進度：進度條、第 X / Y 張、目前檔名、取消按鈕 */
export default function ProgressBar({ progress, cancelling, onCancel }: Props) {
  // 以「已完成張數」計算百分比
  const percent = Math.round(((progress.current - 1) / progress.total) * 100);

  return (
    <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4" role="status" aria-live="polite">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <p className="font-semibold text-blue-900">
          {cancelling ? "正在取消…" : `正在處理第 ${progress.current} / ${progress.total} 張`}
        </p>
        <span className="tabular-nums text-blue-700">{percent}%</span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full bg-blue-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${percent}%` }} />
      </div>
      <p className="truncate text-sm text-slate-700" title={progress.fileName}>
        目前檔案：{progress.fileName}
      </p>
      <button
        type="button"
        onClick={onCancel}
        disabled={cancelling}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
      >
        取消轉換
      </button>
    </div>
  );
}
