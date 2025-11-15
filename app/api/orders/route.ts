import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") ?? "1", 10),
    );
    const requestedPageSize = Math.max(
      1,
      Number.parseInt(searchParams.get("pageSize") ?? "20", 10),
    );
    const pageSize = Math.min(MAX_PAGE_SIZE, requestedPageSize);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = await createServerSupabaseClient();
    const { data, error, count } = await supabase
      .from("orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        {
          status: 500,
        },
      );
    }
    return NextResponse.json(
      {
        orders: data ?? [],
        page,
        pageSize,
        total: count ?? 0,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Orders fetch error:", error);
    return NextResponse.json(
      { error: "Unexpected error" },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  try {
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
          : 1;

    if (!item || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { error: "Invalid payload" },
        {
          status: 400,
        },
      );
    }

    const supabase = await createServerSupabaseClient();

    const insertOrder = async () =>
      supabase
        .from("orders")
        .insert({
          item,
          price,
          quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        })
        .select()
        .single();

    let result = await insertOrder();
    if (result.error) {
      result = await insertOrder();
    }

    if (result.error || !result.data) {
      return NextResponse.json(
        { error: result.error?.message ?? "Insert failed" },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      { success: true, order: result.data },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Orders insert error:", error);
    return NextResponse.json(
      { error: "Unexpected error" },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();
    const { error, count } = await supabase
      .from("orders")
      .delete({ count: "exact" })
      .neq("id", "");

    if (error) {
      return NextResponse.json(
        { error: error.message },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      { success: true, deleted: count ?? 0 },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Orders delete error:", error);
    return NextResponse.json(
      { error: "Unexpected error" },
      {
        status: 500,
      },
    );
  }
}

