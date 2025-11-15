import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .select("price, quantity");

    if (error) {
      console.error("Orders stats query error:", error);
      return NextResponse.json(
        { totalItems: 0, totalAmount: 0 },
        {
          status: 200,
        },
      );
    }

    const totals = (data ?? []).reduce(
      (acc, order) => {
        const quantityValue =
          typeof order.quantity === "string"
            ? Number.parseFloat(order.quantity)
            : Number(order.quantity ?? 1);
        const priceValue =
          typeof order.price === "string"
            ? Number.parseFloat(order.price)
            : Number(order.price ?? 0);
        const safeQuantity = Number.isFinite(quantityValue)
          ? Math.max(1, quantityValue)
          : 1;
        const safePrice = Number.isFinite(priceValue) ? priceValue : 0;
        return {
          totalItems: acc.totalItems + safeQuantity,
          totalAmount: acc.totalAmount + safePrice * safeQuantity,
        };
      },
      { totalItems: 0, totalAmount: 0 },
    );

    return NextResponse.json(totals, {
      status: 200,
    });
  } catch (error) {
    console.error("Orders stats error:", error);
    return NextResponse.json(
      { totalItems: 0, totalAmount: 0 },
      {
        status: 200,
      },
    );
  }
}



