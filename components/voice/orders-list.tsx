import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import type { FC } from "react";

type Order = {
  id: string;
  item: string;
  price: number;
  created_at: string;
  quantity?: number | null;
};

type OrdersListProps = {
  orders: Order[];
  isLoading: boolean;
  isRefreshing: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onExport: () => void;
  onReset: () => void;
  onEdit: (order: Order) => void;
  isExporting: boolean;
  isResetting: boolean;
};

export const OrdersList: FC<OrdersListProps> = ({
  orders,
  isLoading,
  isRefreshing,
  page,
  pageSize,
  total,
  onPageChange,
  onExport,
  onReset,
  onEdit,
  isExporting,
  isResetting,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (isLoading) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div className="space-y-1">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
          <div className="h-4 w-12 bg-gray-200 rounded" />
        </div>
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div className="space-y-1">
            <div className="h-4 w-28 bg-gray-200 rounded" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
          <div className="h-4 w-10 bg-gray-200 rounded" />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-light text-gray-900">訂單記錄</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={total === 0 || isExporting}
          >
            {isExporting ? "輸出中..." : "輸出 (.csv)"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onReset}
            disabled={total === 0 || isResetting}
          >
            {isResetting ? "重置中..." : "重置全部"}
          </Button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-50 rounded-full mx-auto mb-4 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-dashed border-gray-300 rounded-full" />
          </div>
          <p className="text-gray-400 text-sm">尚無訂單記錄</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100 border-t relative">
            {isRefreshing ? (
              <div className="pointer-events-none absolute inset-0 bg-white/60 flex items-center justify-center z-10 text-xs text-gray-500">
                更新中...
              </div>
            ) : null}
            {orders.map((order) => {
              const quantity = order.quantity ?? 1;
              const subtotal = (order.price || 0) * quantity;
              const created = new Date(order.created_at);

              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-4 gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">
                        {order.item}
                      </h3>
                      {quantity > 1 ? (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          x{quantity}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-gray-400">
                      {created.toLocaleString("zh-TW", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-lg font-light text-gray-900">
                      ${subtotal}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-gray-900 transition"
                      onClick={() => onEdit(order)}
                    >
                      <Pencil className="w-4 h-4" />
                      <span className="sr-only">編輯</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-dashed">
            <p>
              第 {orders.length === 0 ? 0 : (page - 1) * pageSize + 1} -{" "}
              {(page - 1) * pageSize + orders.length} 筆 · 共 {total} 筆
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
              >
                上一頁
              </Button>
              <span>
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
              >
                下一頁
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
