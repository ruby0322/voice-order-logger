import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { error: "Missing order id" },
        {
          status: 400,
        },
      );
    }

    const body = (await request.json()) as {
      item?: string;
      price?: number;
      quantity?: number;
    };

    const item = body.item?.trim();
    const price =
      typeof body.price === "number"
        ? body.price
        : Number.parseFloat(String(body.price));
    const quantity =
      typeof body.quantity === "number"
        ? body.quantity
        : body.quantity != null
          ? Number.parseInt(String(body.quantity), 10)
          : undefined;

    if (!item || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { error: "Invalid payload" },
        {
          status: 400,
        },
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("orders")
      .update({
        item,
        price,
        quantity: Number.isFinite(quantity) && quantity && quantity > 0 ? quantity : 1,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      { success: true, order: data },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Orders update error:", error);
    return NextResponse.json(
      { error: "Unexpected error" },
      {
        status: 500,
      },
    );
  }
}


