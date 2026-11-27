/**
 * PDF 建立器：以 jsPDF 逐張加入圖片，不需要一次持有所有圖片。
 * 流程：prepare()（計算頁面及位置）→ 由呼叫者編碼圖片 → place()（放入 PDF）→ finalize()
 */
import type { jsPDF } from "jspdf";
import type { Layout, PdfOptions } from "@/types/image";

type JsPdfCtor = typeof jsPDF;

/** 「符合圖片原尺寸」時，以 150 DPI 將像素換算為 mm */
const MM_PER_PX = 25.4 / 150;
/** 開啟頁碼時，底部最少預留的高度（mm） */
const FOOTER_MM = 10;
/** 多圖排版的格間距（mm） */
const GAP_MM = 4;

const PAGE_DIMENSIONS = {
  a4: { w: 210, h: 297 },
  letter: { w: 215.9, h: 279.4 },
} as const;

const PER_PAGE: Record<Layout, number> = { single: 1, "2x1": 2, "2x2": 4, "3x3": 9 };

interface PageGeometry {
  width: number;
  height: number;
  landscape: boolean;
  cols: number;
  rows: number;
}

/** prepare() 的結果：告訴呼叫者圖片要不要旋轉，以及放置位置 */
export interface Placement {
  rotate: boolean;
  newPage: boolean;
  page: PageGeometry;
  x: number;
  y: number;
  w: number;
  h: number;
}

export class PdfBuilder {
  private doc: jsPDF | null = null;
  private current: PageGeometry | null = null;
  private cellIndex = 0;
  private pages = 0;
  private imageCount = 0;

  private constructor(
    private readonly options: PdfOptions,
    private readonly Ctor: JsPdfCtor,
  ) {}

  /** jsPDF 以動態 import 載入，減少首屏 bundle */
  static async create(options: PdfOptions): Promise<PdfBuilder> {
    const { jsPDF: Ctor } = await import("jspdf");
    return new PdfBuilder(options, Ctor);
  }

  get pageCount(): number {
    return this.pages;
  }

  private get perPage(): number {
    // 「符合圖片原尺寸」固定每張一頁
    return this.options.pageSize === "fit" ? 1 : PER_PAGE[this.options.layout];
  }

  private get footer(): number {
    const { margin, pageNumbers } = this.options;
    return pageNumbers ? Math.max(margin, FOOTER_MM) : margin;
  }

  /** 為即將開始的新頁面計算尺寸與方向 */
  private layoutPage(imgW: number, imgH: number): PageGeometry {
    const { pageSize, orientation, margin } = this.options;

    if (pageSize === "fit") {
      const width = imgW * MM_PER_PX + margin * 2;
      const height = imgH * MM_PER_PX + margin + this.footer;
      return { width, height, landscape: width > height, cols: 1, rows: 1 };
    }

    const base = PAGE_DIMENSIONS[pageSize];
    // 自動：按（該頁第一張）圖片長寬比決定方向
    const landscape = orientation === "auto" ? imgW > imgH : orientation === "landscape";
    const width = landscape ? base.h : base.w;
    const height = landscape ? base.w : base.h;

    let cols = 1;
    let rows = 1;
    switch (this.options.layout) {
      case "2x1":
        // 每頁 2 張：直向頁面上下排列，橫向頁面左右排列
        cols = landscape ? 2 : 1;
        rows = landscape ? 1 : 2;
        break;
      case "2x2":
        cols = 2;
        rows = 2;
        break;
      case "3x3":
        cols = 3;
        rows = 3;
        break;
    }
    return { width, height, landscape, cols, rows };
  }

  /** 計算頁面內第 index 格的範圍 */
  private cellRect(page: PageGeometry, index: number) {
    const { margin } = this.options;
    const gap = this.perPage > 1 ? GAP_MM : 0;
    const contentW = page.width - margin * 2;
    const contentH = page.height - margin - this.footer;
    const w = (contentW - gap * (page.cols - 1)) / page.cols;
    const h = (contentH - gap * (page.rows - 1)) / page.rows;
    return {
      x: margin + (index % page.cols) * (w + gap),
      y: margin + Math.floor(index / page.cols) * (h + gap),
      w,
      h,
    };
  }

  /**
   * 根據圖片（已縮細）尺寸，決定它會放在哪一頁哪一格、是否需要旋轉。
   * 不會改動內部狀態，真正放入要呼叫 place()。
   */
  prepare(imgW: number, imgH: number): Placement {
    const newPage = this.current === null || this.cellIndex >= this.perPage;
    const page = newPage || !this.current ? this.layoutPage(imgW, imgH) : this.current;
    const cell = this.cellRect(page, newPage ? 0 : this.cellIndex);

    // 比較「原方向」與「旋轉 90°」哪個能放得更大，明顯更好才旋轉
    const scaleNormal = Math.min(cell.w / imgW, cell.h / imgH);
    const scaleRotated = Math.min(cell.w / imgH, cell.h / imgW);
    const canRotate = this.options.autoRotate && this.options.pageSize !== "fit" && imgW !== imgH;
    const rotate = canRotate && scaleRotated > scaleNormal * 1.05;

    // 等比例縮放並置中，絕不拉伸
    const w = (rotate ? imgH : imgW) * (rotate ? scaleRotated : scaleNormal);
    const h = (rotate ? imgW : imgH) * (rotate ? scaleRotated : scaleNormal);
    return {
      rotate,
      newPage,
      page,
      x: cell.x + (cell.w - w) / 2,
      y: cell.y + (cell.h - h) / 2,
      w,
      h,
    };
  }

  private paintBackground(doc: jsPDF, page: PageGeometry) {
    if (this.options.background === "black") {
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, page.width, page.height, "F");
    }
  }

  /** 將已編碼的 JPEG 放入 PDF（第一張用第一頁，之後按需要新增頁面） */
  async place(jpeg: Uint8Array, placement: Placement): Promise<void> {
    const { page } = placement;
    const orientation = page.landscape ? "landscape" : "portrait";

    if (!this.doc) {
      this.doc = new this.Ctor({
        orientation,
        unit: "mm",
        format: [page.width, page.height],
        compress: true,
      });
      this.pages = 1;
    } else if (placement.newPage) {
      this.doc.addPage([page.width, page.height], orientation);
      this.pages += 1;
    }

    if (placement.newPage) {
      this.current = page;
      this.cellIndex = 0;
      this.paintBackground(this.doc, page);
    }

    // JPEG 會被原樣嵌入（不再重新壓縮）；指定 alias 可略過重複圖片的雜湊計算
    this.doc.addImage(
      jpeg,
      "JPEG",
      placement.x,
      placement.y,
      placement.w,
      placement.h,
      `img${this.imageCount++}`,
      "NONE",
    );
    this.cellIndex += 1;
  }

  /**
   * 以 Canvas 繪製頁碼文字並作為小圖片嵌入。
   * jsPDF 內建字型不支援中文，所以借用瀏覽器字型渲染「第 X / Y 頁」。
   */
  private async renderPageLabel(text: string, dark: boolean): Promise<{ bytes: Uint8Array; mmW: number; mmH: number }> {
    const pxPerMm = 12;
    const mmH = 6;
    const fontPx = 3.4 * pxPerMm;
    const font = `${fontPx}px "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif`;
    const canvas = document.createElement("canvas");
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas unavailable");
      ctx.font = font;
      const textW = Math.ceil(ctx.measureText(text).width);
      canvas.width = textW + 24;
      canvas.height = mmH * pxPerMm;
      // 改變 canvas 尺寸會重設 context，需重新設定
      ctx.fillStyle = dark ? "#000000" : "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = font;
      ctx.fillStyle = dark ? "#d4d4d8" : "#52525b";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.95),
      );
      return {
        bytes: new Uint8Array(await blob.arrayBuffer()),
        mmW: canvas.width / pxPerMm,
        mmH,
      };
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  /** 加上頁碼（如已開啟）並輸出 Blob。完成後釋放內部 jsPDF 實例 */
  async finalize(): Promise<Blob> {
    const doc = this.doc;
    if (!doc) throw new Error("沒有任何頁面可輸出");

    if (this.options.pageNumbers) {
      const total = doc.getNumberOfPages();
      const dark = this.options.background === "black";
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const label = await this.renderPageLabel(`第 ${i} / ${total} 頁`, dark);
        doc.addImage(
          label.bytes,
          "JPEG",
          (pageW - label.mmW) / 2,
          pageH - this.footer / 2 - label.mmH / 2,
          label.mmW,
          label.mmH,
          `pn${i}`,
          "NONE",
        );
      }
    }

    const blob = doc.output("blob");
    this.dispose();
    return blob;
  }

  /** 丟棄已建立的內容（取消或失敗時呼叫） */
  dispose(): void {
    this.doc = null;
    this.current = null;
    this.cellIndex = 0;
  }
}

/** 以 Blob + object URL 觸發下載，完成後釋放 URL */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // 稍後釋放，確保瀏覽器已開始下載
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
