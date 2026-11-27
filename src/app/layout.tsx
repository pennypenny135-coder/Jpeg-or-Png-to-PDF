import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "圖片轉 PDF",
  description: "一次過將多張 JPEG、PNG 或 WebP 合併成 PDF，全部在你嘅瀏覽器處理，不會上傳任何檔案。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-HK">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
