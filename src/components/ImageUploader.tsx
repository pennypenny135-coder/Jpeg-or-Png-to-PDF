"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  reading: { done: number; total: number } | null;
}

/** 上載區：點擊選擇、多選，並監聽整個頁面的拖放 */
export default function ImageUploader({ onFiles, disabled = false, reading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // 用 ref 保存最新 props，讓 window 監聽器只需註冊一次
  const onFilesRef = useRef(onFiles);
  const disabledRef = useRef(disabled);
  useEffect(() => {
    onFilesRef.current = onFiles;
    disabledRef.current = disabled;
  }, [onFiles, disabled]);

  useEffect(() => {
    let depth = 0;
    // 只回應檔案拖放，排除頁內圖片排序的拖曳
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");

    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth++;
      setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      if (!disabledRef.current && e.dataTransfer) {
        onFilesRef.current(Array.from(e.dataTransfer.files));
      }
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  return (
    <>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition sm:py-14 ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
            : "border-blue-300 bg-blue-50/60 hover:border-blue-500 hover:bg-blue-50"
        }`}
      >
        <svg className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.16-5.16a2.25 2.25 0 013.18 0l5.16 5.16m-1.5-1.5l1.41-1.41a2.25 2.25 0 013.18 0l2.25 2.25M3.75 19.5h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zM9 8.625a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
        <p className="text-base font-medium text-slate-800 sm:text-lg">拖放圖片到此，或點擊選擇圖片</p>
        <button
          type="button"
          disabled={disabled}
          className="rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 disabled:bg-slate-400"
        >
          選擇圖片
        </button>
        <p className="text-xs text-slate-500">支援 JPEG/JPG、PNG、WebP · 可一次選取多張</p>
        {reading && (
          <p className="text-sm font-medium text-blue-700" role="status">
            正在讀取圖片 {reading.done} / {reading.total}…
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => {
            onFiles(Array.from(e.target.files ?? []));
            // 重設 value，令同一批檔案可再次選取
            e.target.value = "";
          }}
        />
      </div>

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-blue-600/80 p-6 text-center text-2xl font-bold text-white backdrop-blur-sm">
          {disabled ? "轉換期間暫時不能加入圖片" : "放開滑鼠以加入圖片"}
        </div>
      )}
    </>
  );
}
