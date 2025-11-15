import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .select("created_at, price, quantity")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Cumulative revenue query error:", error);
      return NextResponse.json(
        { data: [] },
        { status: 200 }
      );
    }

    // Group by date and calculate daily revenue
    const revenueByDate = (data ?? []).reduce(
      (acc, order) => {
        const date = order.created_at.split("T")[0]; // Extract date part
        const quantity = order.quantity ?? 1;
        const price = order.price ?? 0;
        const revenue = price * quantity;

        if (!acc[date]) {
          acc[date] = 0;
        }
        acc[date] += revenue;
        return acc;
      },
      {} as Record<string, number>
    );

    // Convert to array, sort by date, and calculate cumulative
    const sortedDates = Object.entries(revenueByDate)
      .sort((a, b) => a[0].localeCompare(b[0]));

    let cumulative = 0;
    const result = sortedDates.map(([date, revenue]) => {
      cumulative += revenue;
      return {
        date,
        cumulative: Math.round(cumulative * 100) / 100,
      };
    });

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error("Cumulative revenue error:", error);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
