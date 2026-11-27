"use client";

import { useState } from "react";
import { formatBytes } from "@/lib/image";
import type { ImageItem } from "@/types/image";

interface Props {
  items: ImageItem[];
  count: number;
  totalSize: number;
  disabled?: boolean;
  onRemove: (id: string) => void;
  onMove: (from: number, to: number) => void;
}

/** 圖片清單：縮圖、資料、刪除、拖曳排序（觸控裝置可用左右箭咀） */
export default function ImageList({ items, count, totalSize, disabled = false, onRemove, onMove }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="已選圖片">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">已選圖片</h2>
        <p className="text-sm text-slate-600">
          共 <strong className="text-slate-900">{count}</strong> 張 · 總大小{" "}
          <strong className="text-slate-900">{formatBytes(totalSize)}</strong>
        </p>
      </div>
      <p className="mb-3 text-xs text-slate-500">拖曳圖片可調整在 PDF 內的次序；手機可用 ‹ › 按鈕移動。</p>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item, index) => (
          <li
            key={item.id}
            draggable={!disabled}
            onDragStart={(e) => {
              setDragIndex(index);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", item.id);
            }}
            onDragOver={(e) => {
              if (dragIndex === null) return;
              e.preventDefault();
              setOverIndex(index);
            }}
            onDrop={(e) => {
              if (dragIndex === null) return;
              e.preventDefault();
              e.stopPropagation();
              onMove(dragIndex, index);
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={`group relative overflow-hidden rounded-xl border bg-white text-sm shadow-sm transition ${
              item.error ? "border-red-300" : "border-slate-200"
            } ${dragIndex === index ? "opacity-40" : ""} ${
              overIndex === index && dragIndex !== index ? "ring-2 ring-blue-500" : ""
            } ${disabled ? "" : "cursor-grab active:cursor-grabbing"}`}
          >
            <div className="relative aspect-square bg-slate-100">
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt={item.name} draggable={false} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl text-red-400">⚠</div>
              )}
              <span className="absolute left-2 top-2 rounded-full bg-slate-900/75 px-2 py-0.5 text-xs font-semibold text-white">
                {index + 1}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemove(item.id)}
                aria-label={`刪除 ${item.name}`}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-lg leading-none text-slate-700 shadow hover:bg-red-600 hover:text-white disabled:opacity-40"
              >
                ×
              </button>
            </div>

            <div className="space-y-1 p-2.5">
              <p className="truncate font-medium text-slate-900" title={item.name}>
                {item.name}
              </p>
              <p className="text-xs text-slate-500">
                <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">
                  {item.ext || "—"}
                </span>
                {formatBytes(item.size)}
              </p>
              {item.width > 0 && (
                <p className="text-xs text-slate-500">
                  {item.width} × {item.height} px
                </p>
              )}
              {item.error && <p className="text-xs font-medium text-red-600">未能處理：{item.error}</p>}
              <div className="flex gap-1.5 pt-1">
                <button
                  type="button"
                  disabled={disabled || index === 0}
                  onClick={() => onMove(index, index - 1)}
                  aria-label="向前移"
                  className="flex-1 rounded-lg border border-slate-200 py-1.5 text-base leading-none hover:bg-slate-100 disabled:opacity-30"
                >
                  ‹
                </button>
                <button
                  type="button"
                  disabled={disabled || index === items.length - 1}
                  onClick={() => onMove(index, index + 1)}
                  aria-label="向後移"
                  className="flex-1 rounded-lg border border-slate-200 py-1.5 text-base leading-none hover:bg-slate-100 disabled:opacity-30"
                >
                  ›
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
