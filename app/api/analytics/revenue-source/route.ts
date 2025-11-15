import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .select("item, price, quantity");

    if (error) {
      console.error("Revenue source query error:", error);
      return NextResponse.json(
        { data: [] },
        { status: 200 }
      );
    }

    // Group by item and calculate total revenue
    const revenueByItem = (data ?? []).reduce(
      (acc, order) => {
        const quantity = order.quantity ?? 1;
        const price = order.price ?? 0;
        const revenue = price * quantity;

        if (!acc[order.item]) {
          acc[order.item] = 0;
        }
        acc[order.item] += revenue;
        return acc;
      },
      {} as Record<string, number>
    );

    // Convert to array and sort by revenue
    const result = Object.entries(revenueByItem)
      .map(([item, revenue]) => ({
        item,
        revenue: Math.round(revenue * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error("Revenue source error:", error);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
