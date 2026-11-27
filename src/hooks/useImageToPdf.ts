"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CancelError,
  computeTargetSize,
  createThumbnail,
  decodeBitmap,
  describeError,
  encodeJpeg,
} from "@/lib/image";
import { PdfBuilder, downloadBlob } from "@/lib/pdf";
import {
  MAX_FILES,
  defaultFileName,
  getExtension,
  resolveFileName,
  validateFileName,
  validateImageFile,
} from "@/lib/validation";
import type {
  ConvertProgress,
  ConvertResult,
  ImageItem,
  Notice,
  PdfOptions,
  RejectedFile,
  SizePreset,
} from "@/types/image";

const MAX_SIDE: Record<SizePreset, number> = {
  standard: 1600,
  high: 2500,
  original: Number.POSITIVE_INFINITY,
};

export const DEFAULT_OPTIONS: PdfOptions = {
  pageSize: "a4",
  orientation: "auto",
  margin: 10,
  layout: "single",
  background: "white",
  pageNumbers: false,
  sizePreset: "high",
  jpegQuality: 0.9,
  autoRotate: true,
  fileName: "",
};

let idCounter = 0;
const nextId = () => `${Date.now().toString(36)}-${idCounter++}`;

/** 讓出主執行緒，令進度 UI 有機會重繪 */
const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 16));

export function useImageToPdf() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [rejected, setRejected] = useState<RejectedFile[]>([]);
  const [options, setOptions] = useState<PdfOptions>(DEFAULT_OPTIONS);
  const [reading, setReading] = useState<{ done: number; total: number } | null>(null);
  const [progress, setProgress] = useState<ConvertProgress | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [defaultName, setDefaultName] = useState("");

  const itemsRef = useRef<ImageItem[]>([]);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // 預設檔名依用戶本地時間產生，所以放在 client effect（避免 hydration 不一致）
  useEffect(() => {
    setDefaultName(defaultFileName());
  }, []);

  // 離開頁面時取消轉換並釋放所有縮圖 URL
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      itemsRef.current.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const converting = progress !== null;
  const fileNameError = useMemo(() => validateFileName(options.fileName), [options.fileName]);

  /** 「原尺寸」模式下，是否有圖片大到可能令瀏覽器記憶體不足 */
  const hasLargeImages = useMemo(
    () => items.some((i) => !i.error && (Math.max(i.width, i.height) > 6000 || i.width * i.height > 24_000_000)),
    [items],
  );

  const validItems = useMemo(() => items.filter((i) => !i.error), [items]);
  const failedItems = useMemo(() => items.filter((i) => i.error), [items]);
  const totalSize = useMemo(() => validItems.reduce((sum, i) => sum + i.size, 0), [validItems]);

  const revokeUrl = (item: ImageItem) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  };

  /** 修改圖片或設定後，舊的轉換結果就不再有效 */
  const invalidateResult = () => setResult(null);

  // ── 加入圖片 ────────────────────────────────────────────────
  const readFiles = useCallback(async (files: File[]) => {
    invalidateResult();
    setNotice(null);

    const accepted: File[] = [];
    const newlyRejected: RejectedFile[] = [];
    const slots = MAX_FILES - itemsRef.current.length;
    for (const file of files) {
      const reason = validateImageFile(file);
      if (reason) {
        newlyRejected.push({ id: nextId(), name: file.name || "（未命名）", reason });
      } else if (accepted.length >= slots) {
        newlyRejected.push({ id: nextId(), name: file.name, reason: `超過上限，最多可加入 ${MAX_FILES} 張圖片。` });
      } else {
        accepted.push(file);
      }
    }
    if (newlyRejected.length > 0) setRejected((prev) => [...prev, ...newlyRejected]);
    if (accepted.length === 0) return;

    // 逐張讀取尺寸及縮圖，避免同時解碼大量圖片
    setReading({ done: 0, total: accepted.length });
    for (let i = 0; i < accepted.length; i++) {
      if (!mountedRef.current) return;
      const file = accepted[i];
      const base = {
        id: nextId(),
        file,
        name: file.name,
        ext: getExtension(file.name).toUpperCase(),
        size: file.size,
      };
      let item: ImageItem;
      try {
        const thumb = await createThumbnail(file);
        item = { ...base, previewUrl: thumb.url, width: thumb.width, height: thumb.height };
      } catch (error) {
        item = { ...base, previewUrl: "", width: 0, height: 0, error: describeError(error) };
      }
      setItems((prev) => [...prev, item]);
      setReading({ done: i + 1, total: accepted.length });
    }
    setReading(null);
  }, []);

  /** 多次拖放／選擇會排隊，確保一批處理完才處理下一批 */
  const addFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      queueRef.current = queueRef.current.then(() => readFiles(files)).catch(() => setReading(null));
    },
    [readFiles],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) revokeUrl(target);
      return prev.filter((i) => i.id !== id);
    });
    invalidateResult();
  }, []);

  const moveItem = useCallback((from: number, to: number) => {
    setItems((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    invalidateResult();
  }, []);

  const clearAll = useCallback(() => {
    itemsRef.current.forEach(revokeUrl);
    setItems([]);
    setRejected([]);
    setResult(null);
    setNotice(null);
  }, []);

  const dismissRejected = useCallback((id?: string) => {
    setRejected((prev) => (id ? prev.filter((r) => r.id !== id) : []));
  }, []);

  const updateOptions = useCallback((patch: Partial<PdfOptions>) => {
    setOptions((prev) => {
      const next = { ...prev, ...patch };
      // 符合圖片原尺寸時只能每張一頁
      if (next.pageSize === "fit") next.layout = "single";
      return next;
    });
    invalidateResult();
  }, []);

  // ── 轉換 ───────────────────────────────────────────────────
  const convert = useCallback(async () => {
    const targets = itemsRef.current.filter((i) => !i.error);
    if (targets.length === 0) {
      setNotice({ type: "error", text: "請先加入至少 1 張支援的圖片（JPEG/JPG、PNG 或 WebP）。" });
      return;
    }
    if (validateFileName(options.fileName)) return;

    const controller = new AbortController();
    const { signal } = controller;
    abortRef.current = controller;
    const throwIfCancelled = () => {
      if (signal.aborted) throw new CancelError();
    };

    setResult(null);
    setNotice(null);
    setCancelling(false);
    setProgress({ current: 1, total: targets.length, fileName: targets[0].name });

    let builder: PdfBuilder | null = null;
    let success = 0;
    let failed = 0;

    try {
      builder = await PdfBuilder.create(options);
      const maxSide = MAX_SIDE[options.sizePreset];

      // 逐張循序處理：解碼 → 縮細 → 編碼 → 放入 PDF → 立即釋放
      for (let i = 0; i < targets.length; i++) {
        throwIfCancelled();
        const item = targets[i];
        setProgress({ current: i + 1, total: targets.length, fileName: item.name });
        await yieldToUi();
        throwIfCancelled();

        let bitmap: ImageBitmap | null = null;
        try {
          bitmap = await decodeBitmap(item.file);
          throwIfCancelled();
          const size = computeTargetSize(bitmap.width, bitmap.height, maxSide);
          const placement = builder.prepare(size.width, size.height);
          const jpeg = await encodeJpeg(bitmap, {
            width: size.width,
            height: size.height,
            rotate: placement.rotate,
            quality: options.jpegQuality,
          });
          throwIfCancelled();
          await builder.place(jpeg, placement);
          success++;
        } catch (error) {
          if (error instanceof CancelError) throw error;
          // 單張失敗：記錄原因並繼續下一張
          failed++;
          const reason = describeError(error);
          setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, error: reason } : p)));
        } finally {
          bitmap?.close();
        }
      }

      throwIfCancelled();

      if (success === 0) {
        setNotice({ type: "error", text: "所有圖片都未能處理，沒有產生 PDF。請移除出錯的圖片後重試。" });
        return;
      }

      const pages = builder.pageCount;
      const blob = await builder.finalize();
      throwIfCancelled();

      const fileName = resolveFileName(options.fileName);
      const done: ConvertResult = { blob, fileName, pages, size: blob.size, failedCount: failed };
      setResult(done);
      downloadBlob(blob, fileName);
    } catch (error) {
      if (error instanceof CancelError) {
        setNotice({ type: "info", text: "已取消轉換，未有產生任何檔案。" });
      } else {
        setNotice({ type: "error", text: `建立 PDF 失敗：${describeError(error)}` });
      }
    } finally {
      builder?.dispose();
      abortRef.current = null;
      if (mountedRef.current) {
        setProgress(null);
        setCancelling(false);
      }
    }
  }, [options]);

  const cancel = useCallback(() => {
    if (!abortRef.current) return;
    setCancelling(true);
    abortRef.current.abort();
  }, []);

  const downloadAgain = useCallback(() => {
    if (result) downloadBlob(result.blob, result.fileName);
  }, [result]);

  return {
    items,
    validItems,
    failedItems,
    totalSize,
    rejected,
    options,
    reading,
    progress,
    converting,
    cancelling,
    result,
    notice,
    defaultName,
    fileNameError,
    hasLargeImages,
    addFiles,
    removeItem,
    moveItem,
    clearAll,
    dismissRejected,
    updateOptions,
    convert,
    cancel,
    downloadAgain,
  };
}
