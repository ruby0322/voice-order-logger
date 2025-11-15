import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

function getDateKey(dateStr: string, granularity: string): string {
  const date = new Date(dateStr);

  switch (granularity) {
    case "hour": {
      // Format: YYYY-MM-DD HH:00
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hour = String(date.getHours()).padStart(2, "0");
      return `${year}-${month}-${day} ${hour}:00`;
    }
    case "week": {
      // Get the Monday of the week
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      const year = monday.getFullYear();
      const month = String(monday.getMonth() + 1).padStart(2, "0");
      const day = String(monday.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    case "month": {
      // Format: YYYY-MM
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      return `${year}-${month}`;
    }
    case "day":
    default: {
      // Format: YYYY-MM-DD
      return dateStr.split("T")[0];
    }
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const granularity = searchParams.get("granularity") ?? "day";

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .select("created_at, quantity")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Time series query error:", error);
      return NextResponse.json(
        { data: [] },
        { status: 200 }
      );
    }

    // Group by granularity
    const countByPeriod = (data ?? []).reduce(
      (acc, order) => {
        const key = getDateKey(order.created_at, granularity);
        const quantity = order.quantity ?? 1;

        if (!acc[key]) {
          acc[key] = 0;
        }
        acc[key] += quantity;
        return acc;
      },
      {} as Record<string, number>
    );

    // Convert to array and sort
    const result = Object.entries(countByPeriod)
      .map(([period, count]) => ({
        period,
        count,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error("Time series error:", error);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
