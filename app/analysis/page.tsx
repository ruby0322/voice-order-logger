"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ArrowLeft, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";

type RevenueSourceData = {
  item: string;
  revenue: number;
};

type ItemPopularityData = {
  item: string;
  count: number;
};

type TimeSeriesData = {
  period: string;
  count: number;
};

type CumulativeRevenueData = {
  date: string;
  cumulative: number;
};

type Granularity = "hour" | "day" | "week" | "month";
type ChartType = "bar" | "pie";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function AnalysisPage() {
  const [revenueSource, setRevenueSource] = useState<RevenueSourceData[]>([]);
  const [itemPopularity, setItemPopularity] = useState<ItemPopularityData[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([]);
  const [cumulativeRevenue, setCumulativeRevenue] = useState<CumulativeRevenueData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Chart type toggles
  const [revenueChartType, setRevenueChartType] = useState<ChartType>("bar");
  const [popularityChartType, setPopularityChartType] = useState<ChartType>("bar");

  // Time series granularity
  const [granularity, setGranularity] = useState<Granularity>("day");

  const loadAnalytics = useCallback(async (timeGranularity: Granularity) => {
    setIsLoading(true);
    try {
      const [revenueRes, popularityRes, timeSeriesRes, cumulativeRes] = await Promise.all([
        fetch("/api/analytics/revenue-source"),
        fetch("/api/analytics/item-popularity"),
        fetch(`/api/analytics/time-series?granularity=${timeGranularity}`),
        fetch("/api/analytics/cumulative-revenue"),
      ]);

      const [revenueData, popularityData, timeSeriesData, cumulativeData] = await Promise.all([
        revenueRes.json(),
        popularityRes.json(),
        timeSeriesRes.json(),
        cumulativeRes.json(),
      ]);

      setRevenueSource(revenueData.data ?? []);
      setItemPopularity(popularityData.data ?? []);
      setTimeSeries(timeSeriesData.data ?? []);
      setCumulativeRevenue(cumulativeData.data ?? []);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics(granularity);
  }, [loadAnalytics, granularity]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <header className="mb-16">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-light tracking-tight text-gray-900 mb-2">
                  分析
                </h1>
                <p className="text-gray-500 text-sm">訂單數據分析與統計</p>
              </div>
              <Link href="/">
                <Button variant="outline" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  返回主頁
                </Button>
              </Link>
            </div>
          </header>
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">載入中...</p>
          </div>
        </div>
      </main>
    );
  }

  const hasData = revenueSource.length > 0 || itemPopularity.length > 0 || timeSeries.length > 0 || cumulativeRevenue.length > 0;

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <header className="mb-16">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-light tracking-tight text-gray-900 mb-2">
                分析
              </h1>
              <p className="text-gray-500 text-sm">訂單數據分析與統計</p>
            </div>
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                返回主頁
              </Button>
            </Link>
          </div>
        </header>

        {!hasData ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">目前沒有數據可供分析</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            {/* Revenue Source Analysis */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>收入來源分析</CardTitle>
                    <CardDescription>各品項收入貢獻</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant={revenueChartType === "bar" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRevenueChartType("bar")}
                      className="h-8 w-8 p-0"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={revenueChartType === "pie" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRevenueChartType("pie")}
                      className="h-8 w-8 p-0"
                    >
                      <PieChartIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {revenueSource.length === 0 ? (
                  <p className="text-sm text-gray-500">暫無數據</p>
                ) : revenueChartType === "bar" ? (
                  <ChartContainer
                    config={{
                      revenue: {
                        label: "收入",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                    className="h-[300px] w-full"
                  >
                    <BarChart data={revenueSource.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="item"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <ChartContainer
                    config={{
                      revenue: {
                        label: "收入",
                      },
                    }}
                    className="h-[300px] w-full"
                  >
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={revenueSource.slice(0, 10)}
                        dataKey="revenue"
                        nameKey="item"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => entry.item}
                      >
                        {revenueSource.slice(0, 10).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Item Popularity Analysis */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>品項熱度分析</CardTitle>
                    <CardDescription>各品項訂購次數</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant={popularityChartType === "bar" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPopularityChartType("bar")}
                      className="h-8 w-8 p-0"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={popularityChartType === "pie" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPopularityChartType("pie")}
                      className="h-8 w-8 p-0"
                    >
                      <PieChartIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {itemPopularity.length === 0 ? (
                  <p className="text-sm text-gray-500">暫無數據</p>
                ) : popularityChartType === "bar" ? (
                  <ChartContainer
                    config={{
                      count: {
                        label: "數量",
                        color: "hsl(var(--chart-2))",
                      },
                    }}
                    className="h-[300px] w-full"
                  >
                    <BarChart data={itemPopularity.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="item"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <ChartContainer
                    config={{
                      count: {
                        label: "數量",
                      },
                    }}
                    className="h-[300px] w-full"
                  >
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={itemPopularity.slice(0, 10)}
                        dataKey="count"
                        nameKey="item"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => entry.item}
                      >
                        {itemPopularity.slice(0, 10).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Time Series Analysis */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>時序熱度分析</CardTitle>
                    <CardDescription>訂單數量趨勢</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant={granularity === "hour" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGranularity("hour")}
                    >
                      小時
                    </Button>
                    <Button
                      variant={granularity === "day" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGranularity("day")}
                    >
                      日
                    </Button>
                    <Button
                      variant={granularity === "week" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGranularity("week")}
                    >
                      週
                    </Button>
                    <Button
                      variant={granularity === "month" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGranularity("month")}
                    >
                      月
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {timeSeries.length === 0 ? (
                  <p className="text-sm text-gray-500">暫無數據</p>
                ) : (
                  <ChartContainer
                    config={{
                      count: {
                        label: "數量",
                        color: "hsl(var(--chart-3))",
                      },
                    }}
                    className="h-[300px] w-full"
                  >
                    <LineChart data={timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="period"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="var(--color-count)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Cumulative Revenue */}
            <Card>
              <CardHeader>
                <CardTitle>累計總金額折線圖</CardTitle>
                <CardDescription>收入累積趨勢</CardDescription>
              </CardHeader>
              <CardContent>
                {cumulativeRevenue.length === 0 ? (
                  <p className="text-sm text-gray-500">暫無數據</p>
                ) : (
                  <ChartContainer
                    config={{
                      cumulative: {
                        label: "累計金額",
                        color: "hsl(var(--chart-4))",
                      },
                    }}
                    className="h-[300px] w-full"
                  >
                    <LineChart data={cumulativeRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="cumulative"
                        stroke="var(--color-cumulative)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
