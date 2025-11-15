import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        {
          status: 500,
        },
      );
    }

    const headers = ["餐點名稱", "單價", "數量", "小計", "記錄時間"];
    const rows =
      data?.map((order) => {
        const quantity = order.quantity ?? 1;
        const subtotal = (order.price || 0) * quantity;
        const created = new Date(order.created_at).toISOString();
        const columns = [
          order.item ?? "",
          order.price ?? 0,
          quantity,
          subtotal,
          created,
        ];
        return columns
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",");
      }) ?? [];

    const csv = [headers.join(","), ...rows].join("\n");
    const filename = `orders_${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.csv`;

    return new Response("\uFEFF" + csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Orders export error:", error);
    return NextResponse.json(
      { error: "Unexpected error" },
      {
        status: 500,
      },
    );
  }
}


