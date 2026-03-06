"use client";

import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/lib/supabase/client";
import { CHART_COLORS } from "@/lib/theme/chartPalette";

const COLORS = CHART_COLORS.pie;

type ExpenseCategoryRow = {
  amount_base: number | null;
  category?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

export default function CategoryPieChart() {
  const [selectedMonth, setSelectedMonth] = useState(() => dayjs().format("YYYY-MM"));
  const [data, setData] = useState<Array<{ name: string; value: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const month = dayjs(`${selectedMonth}-01`);
      const start = month.startOf("month").format("YYYY-MM-DD");
      const end = month.endOf("month").format("YYYY-MM-DD");

      const { data: rows, error: fetchError } = await supabase
        .from("transactions")
        .select("amount_base, category:categories(name)")
        .eq("type", "expense")
        .gte("occurred_at", start)
        .lte("occurred_at", end);

      if (!isMounted) return;
      if (fetchError || !rows) {
        setData([]);
        setError("加载没成功");
        setLoading(false);
        return;
      }

      const map = new Map<string, number>();
      (rows as ExpenseCategoryRow[]).forEach((row) => {
        const categoryName = Array.isArray(row.category)
          ? row.category[0]?.name
          : row.category?.name;
        const name = categoryName || "未分类";
        const amount = Number(row.amount_base ?? 0);
        map.set(name, (map.get(name) || 0) + amount);
      });

      setData(Array.from(map.entries()).map(([name, value]) => ({ name, value })));
      setLoading(false);
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [selectedMonth]);

  const hasData = useMemo(() => data.some((item) => item.value > 0), [data]);

  return (
    <section className="rounded-2xl border-2 border-line bg-panel p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-ink">分类占比</h3>
        <input
          type="month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
        />
      </div>

      {loading ? <p className="text-sm text-muted">加载中...</p> : null}
      {!loading && error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : null}
      {!loading && !error && !hasData ? (
        <div className="rounded-xl border border-dashed border-line bg-sky-50/60 p-6 text-center text-sm text-muted">
          还没有数据
        </div>
      ) : null}
      {!loading && !error && hasData ? (
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" outerRadius={80}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend align="center" verticalAlign="top" wrapperStyle={{ paddingBottom: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </section>
  );
}
