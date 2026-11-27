# 圖片轉 PDF

一次過將多張 JPEG / PNG / WebP 合併成一個 PDF。**所有圖片處理與 PDF 生成都在瀏覽器完成**，不會上傳任何檔案，亦不使用任何第三方轉檔服務或 API key。

## 技術架構

- Next.js（App Router）+ TypeScript + Tailwind CSS
- jsPDF 生成 PDF（動態 import）
- 瀏覽器原生 API：File、createImageBitmap、Canvas、Blob、URL.createObjectURL

### 資料流程

```
選擇／拖放 → validation.ts（格式、大小）→ 逐張建立縮圖（image.ts）→ 圖片清單（可排序、刪除）
                                                            │
按「轉換並下載 PDF」                                         ▼
 for 每張圖片（循序）：
   decodeBitmap（EXIF from-image）→ computeTargetSize（縮細）→ PdfBuilder.prepare（排版／旋轉）
   → encodeJpeg（Canvas 白底 → JPEG Uint8Array）→ PdfBuilder.place → 釋放 bitmap / canvas
 → PdfBuilder.finalize（頁碼）→ Blob → URL.createObjectURL 下載 → revokeObjectURL
```

## 專案結構

```
src/
├─ app/            page.tsx · layout.tsx · globals.css · api/health（平台健康檢查）
├─ components/     ImageUploader · ImageList · PdfSettings · ConvertButton
│                  ProgressBar · ErrorList · ResultPanel
├─ hooks/          useImageToPdf.ts   狀態與轉換流程
├─ lib/            image.ts（解碼／Canvas／JPEG） · pdf.ts（jsPDF 排版） · validation.ts
└─ types/          image.ts
tailwind.config.ts · postcss.config.mjs · tsconfig.json · package.json
```

（`@/*` 對應 `src/*`。）

## 本地執行

```bash
npm install
npm run dev
```

開啟 http://localhost:3000。正式建置：`npm run build && npm run start`。

> 本工具本身不需要資料庫；範本內附的 PostgreSQL / Drizzle 設定不會被頁面使用。

## 部署到 Vercel

1. 將專案推送到 GitHub / GitLab / Bitbucket。
2. 登入 [vercel.com](https://vercel.com)，按 **Add New → Project**，匯入該 repository。
3. Framework Preset 會自動偵測為 **Next.js**，Build Command / Output 保持預設。
4. 不需要設定任何環境變數（沒有 API key，亦沒有伺服器端處理）。
5. 按 **Deploy**，完成後即可使用 Vercel 提供的網址。
6. 之後每次 push 到主分支都會自動重新部署。

## 重點處理說明

| 項目 | 做法 |
| --- | --- |
| JPEG EXIF 方向 | `createImageBitmap(file, { imageOrientation: 'from-image' })` 讀取，得到的 bitmap 已轉正，寬高亦是轉正後的尺寸。如舊瀏覽器不接受該選項，會以預設方式重試；兩者皆失敗則報「檔案損壞，或 EXIF 方向資料無法解碼」。 |
| PNG 透明背景 | 繪製前先在 Canvas 填滿白色，再畫圖，最後輸出 JPEG，不會出現黑底或透明。 |
| 大圖縮細 | 按輸出尺寸（標準 1600px／高清 2500px，預設高清）等比例縮細最長邊，不放大、不變形。「原尺寸」不縮細，並於介面警告記憶體風險；超過 1.5 億像素或 50 MB 的檔案直接拒絕。 |
| 逐張處理 | 轉換時一次只解碼一張：解碼 → 繪製 → 編碼 → 放入 PDF → `bitmap.close()`、Canvas 尺寸歸零。圖片以 `Uint8Array` 傳給 jsPDF，不保留 base64 字串。每張之間讓出主執行緒令進度 UI 更新。 |
| 取消 | 使用 `AbortController`，每個非同步步驟後檢查；取消後立即停止、丟棄 jsPDF 內容、不下載。 |
| 錯誤處理 | 每張圖片獨立 try/catch，失敗只標記該張並繼續。錯誤原因分類為損壞、過大、記憶體不足、EXIF 解碼失敗等。全部失敗不產生 PDF；部分失敗仍輸出並提示「有 N 張圖片未能處理」。 |
| 頁碼 | jsPDF 內建字型不支援中文，故以 Canvas 渲染「第 X / Y 頁」再作為小圖嵌入。 |

## 測試清單

- [ ] 單張 JPEG：轉出 1 頁 PDF，檔名預設 `images_YYYY-MM-DD_HH-mm.pdf`
- [ ] 多張 JPEG：頁數 = 圖片數，次序與清單一致；拖曳／箭咀調整次序後 PDF 次序跟著改變
- [ ] 直倒 JPEG（手機直拍，含 EXIF）：縮圖及 PDF 方向正確、沒有側倒
- [ ] PNG 透明背景：PDF 中透明位置為白色，不是黑色
- [ ] WebP：可正常加入及轉換
- [ ] 不支援格式（HEIC、GIF、SVG、PDF、DOCX、TXT 等）：顯示「暫只支援 JPEG/JPG、PNG 同 WebP。」，檔案不會加入
- [ ] 大型圖片（> 4000px）：高清模式縮至最長邊 2500px；原尺寸模式顯示記憶體警告
- [ ] 中途取消：按「取消轉換」後立即停止，不下載檔案，可再次操作
- [ ] 部分失敗：混入一個改名為 .jpg 的損壞檔，該張列於錯誤清單並可「移除」，其餘仍可下載，並顯示「有 1 張圖片未能處理」
- [ ] 全部失敗：不下載 PDF，顯示錯誤訊息
- [ ] 版面：A4／Letter／符合原尺寸、直向／橫向／自動、邊距 0/10/20、2×1／2×2／3×3、黑色背景、頁碼
- [ ] 檔名：輸入 `a/b.pdf` 顯示錯誤並禁用轉換按鈕
- [ ] 手機瀏覽器（iOS Safari、Android Chrome）：可選取多張相片、按鈕易按、底部固定操作列、結果可下載
- [ ] 開啟瀏覽器 DevTools Network，確認轉換過程沒有任何上傳請求
