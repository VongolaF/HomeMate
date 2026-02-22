import { NextResponse } from "next/server";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const parseIsoDate = (value: string) => {
  if (!DATE_REGEX.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
};

const addDays = (ymd: string, days: number) => {
  const parsed = parseIsoDate(ymd);
  if (!parsed) return null;
  const next = new Date(parsed.getTime() + days * 86400000);
  return next.toISOString().slice(0, 10);
};

const getLocalDateParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? null;

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const weekday = get("weekday");

  if (!year || !month || !day || !weekday) return null;

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const weekdayIndex = weekdayMap[weekday];
  if (weekdayIndex === undefined) return null;

  return {
    localDate: `${year}-${month}-${day}`,
    weekdayIndex,
  };
};

const computeNextMondayWeekStart = (now: Date, timeZone: string) => {
  const parts = getLocalDateParts(now, timeZone);
  if (!parts) return null;

  // Next Monday (strictly in the future).
  // weekdayIndex: Sun=0..Sat=6
  let daysUntilNextMonday = (1 - parts.weekdayIndex + 7) % 7;
  if (daysUntilNextMonday === 0) daysUntilNextMonday = 7;

  return addDays(parts.localDate, daysUntilNextMonday);
};

const isValidTimezone = (value: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

export async function GET(request: Request) {
  const expectedSecret = process.env.HEALTH_CRON_SECRET;
  const url = new URL(request.url);

  const providedSecret =
    url.searchParams.get("secret") || request.headers.get("x-cron-secret");

  if (expectedSecret) {
    if (!providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    // Fallback for local/dev if no secret is configured.
    const userAgent = request.headers.get("user-agent") ?? "";
    if (!userAgent.includes("vercel-cron/1.0")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "Missing HEALTH_CRON_SECRET configuration" },
      { status: 500 }
    );
  }

  const timezone = process.env.HEALTH_CRON_TIMEZONE ?? "Asia/Shanghai";
  if (!isValidTimezone(timezone)) {
    return NextResponse.json(
      { error: "Invalid HEALTH_CRON_TIMEZONE" },
      { status: 500 }
    );
  }

  const weekStart = computeNextMondayWeekStart(new Date(), timezone);
  if (!weekStart) {
    return NextResponse.json(
      { error: "Failed to compute weekStart" },
      { status: 500 }
    );
  }

  const weeklyGenerateUrl = new URL("/api/health/weekly-generate", request.url);

  const response = await fetch(weeklyGenerateUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret": expectedSecret,
    },
    body: JSON.stringify({ weekStart, timezone }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "Weekly generation failed",
        weekStart,
        timezone,
        details: payload,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, weekStart, timezone, result: payload });
}
