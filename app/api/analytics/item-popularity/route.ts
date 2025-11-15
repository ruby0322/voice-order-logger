import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .select("item, quantity");

    if (error) {
      console.error("Item popularity query error:", error);
      return NextResponse.json(
        { data: [] },
        { status: 200 }
      );
    }

    // Group by item and count total quantity
    const popularityByItem = (data ?? []).reduce(
      (acc, order) => {
        const quantity = order.quantity ?? 1;

        if (!acc[order.item]) {
          acc[order.item] = 0;
        }
        acc[order.item] += quantity;
        return acc;
      },
      {} as Record<string, number>
    );

    // Convert to array and sort by quantity
    const result = Object.entries(popularityByItem)
      .map(([item, count]) => ({
        item,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error("Item popularity error:", error);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
