"use client";

interface Props {
  count: number;
  converting: boolean;
  disabled: boolean;
  clearDisabled: boolean;
  onConvert: () => void;
  onClear: () => void;
}

/** 主要動作：轉換並下載；次要動作：清除全部 */
export default function ConvertButton({ count, converting, disabled, clearDisabled, onConvert, onClear }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
      <button
        type="button"
        onClick={onConvert}
        disabled={disabled || converting || count === 0}
        className="flex-1 rounded-xl bg-blue-600 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {converting ? "轉換中…" : "轉換並下載 PDF"}
      </button>
      <button
        type="button"
        onClick={onClear}
        disabled={clearDisabled || converting}
        className="rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-base font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        清除全部
      </button>
    </div>
  );
}
