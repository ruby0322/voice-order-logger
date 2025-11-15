"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrdersList, RecognitionStatus } from "@/components/voice";
import { ThemeToggle } from "@/components/theme-toggle";
import { BarChart3, Mic, MicOff } from "lucide-react";
import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Order = {
  id: string;
  item: string;
  price: number;
  created_at: string;
  quantity?: number | null;
};

// item + price + optional quantity (with or without unit, e.g. "2份", "3杯")
const DETECT_REGEX =
  /^(.+?)\s+(?:\$)?(\d+(?:\.\d+)?)(?:\s+(\d+)(?:[^\d]*)?)?$/;
const PAGE_SIZE = 20;

export default function VoiceMenuLoggerPage() {
  const [isListening, setIsListening] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editItem, setEditItem] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [stats, setStats] = useState({ totalItems: 0, totalAmount: 0 });

  const isListeningRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastRecordedTextRef = useRef<string | null>(null);
  const lastRecordedAtRef = useRef<number>(0);
  const textTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadOrders = useCallback(
    async (
      pageToLoad: number,
      options: { showSkeleton?: boolean } = {},
    ) => {
      const { showSkeleton = false } = options;
      if (showSkeleton) {
        setIsLoadingOrders(true);
      } else {
        setIsRefreshingOrders(true);
      }
      try {
        const response = await fetch(
          `/api/orders?page=${pageToLoad}&pageSize=${PAGE_SIZE}`,
          {
            headers: {
              "Cache-Control": "no-store",
            },
          },
        );
        if (!response.ok) {
          throw new Error("Failed to load orders");
        }
        const json = (await response.json()) as {
          orders?: Order[];
          total?: number;
        };
        setOrders(json.orders ?? []);
        setTotal(json.total ?? 0);
      } catch (error) {
        console.error("Load orders error:", error);
      } finally {
        if (showSkeleton) {
          setIsLoadingOrders(false);
        } else {
          setIsRefreshingOrders(false);
        }
      }
    },
    [],
  );

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch("/api/orders/stats", {
        headers: {
          "Cache-Control": "no-store",
        },
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error(
          `Stats request failed (${response.status}): ${errorText}`,
        );
        return;
      }
      const json = (await response.json()) as {
        totalItems?: number;
        totalAmount?: number;
      };
      setStats({
        totalItems: json.totalItems ?? 0,
        totalAmount: json.totalAmount ?? 0,
      });
    } catch (error) {
      console.error("Load stats error:", error);
    }
  }, []);

  useEffect(() => {
    void loadOrders(page, { showSkeleton: true });
    void loadStats();
  }, [page, loadOrders, loadStats]);
  const handlePageChange = useCallback(
    (nextPage: number) => {
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      if (
        Number.isNaN(nextPage) ||
        nextPage < 1 ||
        nextPage > totalPages ||
        nextPage === page
      ) {
        return;
      }
      setPage(nextPage);
    },
    [page, total],
  );

  const handleExport = useCallback(async () => {
    if (total === 0) return;
    setIsExporting(true);
    try {
      const response = await fetch("/api/orders/export", {
        headers: {
          "Cache-Control": "no-store",
        },
      });
      if (!response.ok) {
        throw new Error("Export failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `訂單記錄_${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export orders error:", error);
    } finally {
      setIsExporting(false);
    }
  }, [total]);

  const handleEditOrder = useCallback((order: Order) => {
    setEditingOrder(order);
    setEditItem(order.item ?? "");
    setEditPrice(String(order.price ?? ""));
    setEditQuantity(String(order.quantity ?? 1));
  }, []);

  const closeEditModal = useCallback(() => {
    if (isUpdatingOrder) return;
    setEditingOrder(null);
  }, [isUpdatingOrder]);

  const handleUpdateOrder = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!editingOrder) return;

      const parsedPrice = Number.parseFloat(editPrice);
      const parsedQuantity = Number.parseInt(editQuantity, 10);
      if (!editItem.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
        return;
      }

      setIsUpdatingOrder(true);
      try {
        const res = await fetch(`/api/orders/${editingOrder.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            item: editItem.trim(),
            price: parsedPrice,
            quantity:
              Number.isFinite(parsedQuantity) && parsedQuantity > 0
                ? parsedQuantity
                : 1,
          }),
        });

        if (res.ok) {
          setEditingOrder(null);
          await Promise.all([
            loadOrders(page, { showSkeleton: false }),
            loadStats(),
          ]);
        }
      } catch (error) {
        console.error("Update order error:", error);
      } finally {
        setIsUpdatingOrder(false);
      }
    },
    [editItem, editPrice, editQuantity, editingOrder, loadOrders, loadStats, page],
  );

  const handleReset = useCallback(async () => {
    if (orders.length === 0) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("確認重置所有訂單記錄？此操作無法復原。")
    ) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "DELETE",
      });
      if (res.ok) {
        setPage(1);
        await Promise.all([
          loadOrders(1, { showSkeleton: true }),
          loadStats(),
        ]);
      }
    } catch (error) {
      console.error("Reset orders error:", error);
    } finally {
      setIsResetting(false);
    }
  }, [loadOrders, loadStats, orders.length]);


  // Auto-reset if text doesn't change for 5 seconds
  useEffect(() => {
    if (currentText && isListening && !isProcessing) {
      if (textTimeoutRef.current) {
        clearTimeout(textTimeoutRef.current);
      }

      textTimeoutRef.current = setTimeout(() => {
        setCurrentText("");
      }, 5000);
    }

    return () => {
      if (textTimeoutRef.current) {
        clearTimeout(textTimeoutRef.current);
      }
    };
  }, [currentText, isListening, isProcessing]);

  const normalizeAndDetect = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isProcessing) return;

    const now = Date.now();
    if (
      lastRecordedTextRef.current === trimmed &&
      now - lastRecordedAtRef.current < 3000
    ) {
      return;
    }

    setIsProcessing(true);

    let normalized = trimmed;
    try {
      const res = await fetch("/api/whisper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: trimmed }),
      });

      if (res.ok) {
        const data = (await res.json()) as { normalized?: string };
        if (data.normalized && data.normalized.trim().length > 0) {
          normalized = data.normalized.trim();
        }
      }
    } catch {
      // Whisper API timeout or error → fallback to raw text
      normalized = trimmed;
    }

    const match = normalized.match(DETECT_REGEX);
    if (!match) {
      setIsProcessing(false);
      return;
    }

    const item = match[1].trim();
    const price = Number.parseFloat(match[2]);
    const quantityRaw = match[3];
    const quantity = quantityRaw ? Number.parseInt(quantityRaw, 10) : 1;

    if (!item || Number.isNaN(price) || price <= 0) {
      setIsProcessing(false);
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          item,
          price,
          quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        }),
      });

      if (res.ok) {
        lastRecordedTextRef.current = normalized;
        lastRecordedAtRef.current = now;
        const quantityText =
          Number.isFinite(quantity) && quantity > 1 ? ` x${quantity}` : "";
        setCurrentText(`✓ 已記錄：${item} ${price}${quantityText}`);
        setTimeout(() => {
          setCurrentText("");
        }, 2000);
        await Promise.all([
          loadOrders(page, { showSkeleton: false }),
          loadStats(),
        ]);
      }
    } catch {
      // Insert error is handled server-side with retry. If it still fails, we just ignore here.
    }

    setIsProcessing(false);
  };

  const clearKeepAliveInterval = () => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  };

  const startListening = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionCtor =
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition })
        .webkitSpeechRecognition || window.SpeechRecognition;

    if (!SpeechRecognitionCtor) {
       
      alert("您的瀏覽器不支援語音識別，請使用 Chrome 或 Edge");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "zh-TW";

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      setCurrentText("正在聆聽...");
      clearKeepAliveInterval();
      keepAliveIntervalRef.current = setInterval(() => {
        if (!isListeningRef.current || !recognitionRef.current) {
          return;
        }
        setCurrentText("維持語音連線中...");
        recognitionRef.current.stop();
      }, 10 * 60 * 1000);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript ?? "";
        if (!transcript) continue;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const displayText = finalTranscript || interimTranscript;
      if (displayText) {
        setCurrentText(displayText);
      }

      if (finalTranscript) {
        void normalizeAndDetect(finalTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "aborted") {
        return;
      }

      if (event.error === "no-speech") {
        return;
      }

      const recoverableErrors = new Set(["audio-capture", "network"]);

      if (recoverableErrors.has(event.error)) {
        setCurrentText("語音服務異常，正在重新連線...");
        recognition.stop();
        return;
      }

      console.error("語音識別錯誤:", event.error);
      setCurrentText(`錯誤：${event.error}`);
    };

    recognition.onend = () => {
      // 持續模式：如果目前仍處於「聆聽中」狀態，就自動重新啟動
      if (isListeningRef.current) {
        recognition.start();
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    clearKeepAliveInterval();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setCurrentText("");
  };

  useEffect(
    () => () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      isListeningRef.current = false;
      if (textTimeoutRef.current) {
        clearTimeout(textTimeoutRef.current);
      }
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
    },
    [],
  );

  useEffect(
    () => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "m" && event.key !== "M") {
          return;
        }

        const target = event.target as HTMLElement | null;
        if (target) {
          const tagName = target.tagName;
          if (
            tagName === "INPUT" ||
            tagName === "TEXTAREA" ||
            tagName === "SELECT" ||
            target.isContentEditable
          ) {
            return;
          }
        }

        event.preventDefault();

        const toggleButton = document.getElementById("voice-toggle-button");
        if (toggleButton instanceof HTMLButtonElement) {
          toggleButton.click();
        }
      };

      window.addEventListener("keydown", handleKeyDown);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    },
    [],
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <header className="mb-16">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-light tracking-tight text-foreground mb-2">
                Voice Menu Logger
              </h1>
              <p className="text-muted-foreground text-sm">持續語音辨識 · 自動記錄</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/analysis">
                <Button variant="outline" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  查看分析
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <section className="flex items-center justify-between mb-12 pb-6 border-b border-border">
          <div>
            <p className="text-sm text-muted-foreground mb-1">總品項數</p>
            <p className="text-3xl font-light text-foreground">
              {stats.totalItems}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">總金額</p>
            <p className="text-3xl font-light text-foreground">
              ${stats.totalAmount}
            </p>
          </div>
        </section>

        <section className="grid md:grid-cols-5 gap-8 mb-12">
          <div className="md:col-span-2 flex flex-col items-center justify-center py-12">
            <Button
              id="voice-toggle-button"
              size="lg"
              onClick={isListening ? stopListening : startListening}
              className={`w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-lg mb-6 ${
                isListening
                  ? "bg-gray-900 hover:bg-gray-800"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-900"
              }`}
            >
              {isListening ? (
                <Mic className="w-12 h-12" />
              ) : (
                <MicOff className="w-12 h-12" />
              )}
              <span className="mt-2 text-xs font-medium">
                按 M {isListening ? "停止" : "開始"}
              </span>
            </Button>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isListening ? "bg-red-500 animate-pulse" : "bg-muted"
                  }`}
                />
                <p className="text-sm font-medium text-foreground">
                  {isListening ? "正在聆聽" : "已停止"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                點擊或按 M {isListening ? "停止" : "開始"}錄音
              </p>
            </div>
          </div>

          <div className="md:col-span-3">
            <RecognitionStatus
              currentText={currentText}
              isProcessing={isProcessing}
            />
        </div>
        </section>

        <OrdersList
          orders={orders}
          isLoading={isLoadingOrders}
          isRefreshing={isRefreshingOrders}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={handlePageChange}
          onExport={handleExport}
          onReset={handleReset}
          onEdit={handleEditOrder}
          isExporting={isExporting}
          isResetting={isResetting}
        />
      </div>
      {editingOrder ? (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-foreground">編輯訂單</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  更新餐點名稱、價格或份數
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeEditModal}
                disabled={isUpdatingOrder}
              >
                關閉
              </Button>
            </div>
            <form className="space-y-4" onSubmit={handleUpdateOrder}>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">餐點名稱</label>
                <Input
                  value={editItem}
                  onChange={(event) => setEditItem(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">價格</label>
                <Input
                  type="number"
                  min={1}
                  step="1"
                  value={editPrice}
                  onChange={(event) => setEditPrice(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">份數</label>
                <Input
                  type="number"
                  min={1}
                  step="1"
                  value={editQuantity}
                  onChange={(event) => setEditQuantity(event.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeEditModal}
                  disabled={isUpdatingOrder}
                >
                  取消
                </Button>
                <Button type="submit" disabled={isUpdatingOrder}>
                  {isUpdatingOrder ? "儲存中..." : "儲存變更"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
