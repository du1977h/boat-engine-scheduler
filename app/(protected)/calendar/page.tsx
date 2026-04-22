import { CalendarClient } from "@/components/calendar-client";
import { getActiveMembers, getMonthSchedule } from "@/lib/schedule";

export default async function CalendarPage({
  searchParams
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const now = new Date();
  const params = await searchParams;
  const year = Number(params.year ?? now.getFullYear());
  const month = Number(params.month ?? now.getMonth() + 1);
  const [days, members] = await Promise.all([getMonthSchedule(year, month), getActiveMembers()]);

  return <CalendarClient key={`${year}-${month}`} year={year} month={month} initialDays={days} members={members} />;
}
