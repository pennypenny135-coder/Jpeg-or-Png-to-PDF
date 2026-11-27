"use client";

import ConvertButton from "@/components/ConvertButton";
import ErrorList from "@/components/ErrorList";
import ImageList from "@/components/ImageList";
import ImageUploader from "@/components/ImageUploader";
import PdfSettings from "@/components/PdfSettings";
import ProgressBar from "@/components/ProgressBar";
import ResultPanel from "@/components/ResultPanel";
import { useImageToPdf } from "@/hooks/useImageToPdf";

const NOTICE_STYLES = {
  info: "border-slate-200 bg-slate-50 text-slate-800",
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
} as const;

export default function HomePage() {
  const pdf = useImageToPdf();
  const busy = pdf.converting || pdf.reading !== null;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">圖片轉 PDF</h1>
        <p className="mt-2 text-base text-slate-600 sm:text-lg">
          一次過將多張 JPEG、PNG 或 WebP 合併成 PDF，全部在你嘅瀏覽器處理。
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
          🔒 圖片不會上傳到任何伺服器
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        {/* 左欄：上載、錯誤、圖片清單 */}
        <div className="space-y-5">
          <ImageUploader onFiles={pdf.addFiles} disabled={pdf.converting} reading={pdf.reading} />
          <ErrorList
            rejected={pdf.rejected}
            failed={pdf.failedItems}
            disabled={pdf.converting}
            onRemoveItem={pdf.removeItem}
            onDismissRejected={pdf.dismissRejected}
          />
          <ImageList
            items={pdf.items}
            count={pdf.validItems.length}
            totalSize={pdf.totalSize}
            disabled={pdf.converting}
            onRemove={pdf.removeItem}
            onMove={pdf.moveItem}
          />
        </div>

        {/* 右欄：設定與轉換（手機版置底固定操作列） */}
        <aside className="space-y-5 lg:sticky lg:top-6">
          <PdfSettings
            options={pdf.options}
            disabled={pdf.converting}
            fileNameError={pdf.fileNameError}
            defaultName={pdf.defaultName}
            hasLargeImages={pdf.hasLargeImages}
            onChange={pdf.updateOptions}
          />

          <div className="sticky bottom-0 z-10 -mx-4 space-y-3 border-t border-slate-200 bg-slate-100/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
            {pdf.notice && (
              <p className={`rounded-xl border px-3 py-2 text-sm ${NOTICE_STYLES[pdf.notice.type]}`} role="status">
                {pdf.notice.text}
              </p>
            )}
            {pdf.progress && (
              <ProgressBar progress={pdf.progress} cancelling={pdf.cancelling} onCancel={pdf.cancel} />
            )}
            {pdf.result && !pdf.converting && (
              <ResultPanel result={pdf.result} onDownload={pdf.downloadAgain} onReset={pdf.clearAll} />
            )}
            {!pdf.progress && (
              <ConvertButton
                count={pdf.validItems.length}
                converting={pdf.converting}
                disabled={busy || pdf.fileNameError !== null}
                clearDisabled={pdf.items.length === 0 && pdf.rejected.length === 0}
                onConvert={pdf.convert}
                onClear={pdf.clearAll}
              />
            )}
          </div>
        </aside>
      </div>

      <footer className="mt-10 text-center text-xs text-slate-500">
        支援 JPEG/JPG、PNG、WebP · 所有處理均在本機瀏覽器完成，不會上傳任何檔案
      </footer>
    </main>
  );
}
