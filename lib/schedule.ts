import { ItemType, Prisma, RoleType } from "@prisma/client";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { feeRates, itemOptions, roleOptions } from "@/lib/constants";
import { listMonthDays, parseDateKey, toDateKey } from "@/lib/date";

export async function ensureScheduleDay(dateKey: string) {
  const date = parseDateKey(dateKey);
  return prisma.scheduleDay.upsert({
    where: {
      targetDate: date
    },
    update: {},
    create: {
      targetDate: date,
      year: date.getFullYear(),
      month: date.getMonth() + 1
    }
  });
}

export async function getActiveMembers() {
  return prisma.member.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });
}

export async function getMonthSchedule(year: number, month: number) {
  const days = listMonthDays(year, month);
  const first = days[0];
  const last = days[days.length - 1];

  const scheduleDays = await prisma.scheduleDay.findMany({
    where: {
      targetDate: {
        gte: first,
        lte: last
      }
    },
    include: {
      assignments: {
        include: {
          member: true,
          updatedByUser: true
        }
      },
      lastUpdatedByUser: true
    }
  });

  const map = new Map(
    scheduleDays.map((day) => [
      toDateKey(day.targetDate),
      {
        id: day.id,
        date: toDateKey(day.targetDate),
        lastUpdatedAt: day.lastUpdatedAt?.toISOString() ?? null,
        lastUpdatedBy: day.lastUpdatedByUser?.displayName ?? null,
        assignments: day.assignments.map((assignment) => ({
          id: assignment.id,
          itemType: assignment.itemType,
          roleType: assignment.roleType,
          memberId: assignment.memberId,
          memberName: assignment.member?.name ?? null,
          updatedAt: assignment.updatedAt.toISOString(),
          updatedBy: assignment.updatedByUser?.displayName ?? null
        }))
      }
    ])
  );

  return days.map((day) => {
    const key = toDateKey(day);
    const existing = map.get(key);
    return (
      existing ?? {
        id: null,
        date: key,
        lastUpdatedAt: null,
        lastUpdatedBy: null,
        assignments: []
      }
    );
  });
}

export async function getDaySchedule(dateKey: string) {
  const date = parseDateKey(dateKey);
  const scheduleDay = await prisma.scheduleDay.findUnique({
    where: {
      targetDate: date
    },
    include: {
      assignments: {
        include: {
          member: true,
          updatedByUser: true
        }
      },
      lastUpdatedByUser: true
    }
  });

  return {
    date: dateKey,
    lastUpdatedAt: scheduleDay?.lastUpdatedAt?.toISOString() ?? null,
    lastUpdatedBy: scheduleDay?.lastUpdatedByUser?.displayName ?? null,
    assignments: scheduleDay?.assignments.map((assignment) => ({
      itemType: assignment.itemType,
      roleType: assignment.roleType,
      memberId: assignment.memberId,
      memberName: assignment.member?.name ?? null,
      updatedAt: assignment.updatedAt.toISOString(),
      updatedBy: assignment.updatedByUser?.displayName ?? null
    })) ?? []
  };
}

export async function updateAssignment(params: {
  dateKey: string;
  itemType: ItemType;
  roleType: RoleType;
  memberId: number | null;
  userId: number;
}) {
  if (params.memberId !== null) {
    const member = await prisma.member.findFirst({
      where: {
        id: params.memberId,
        isActive: true
      }
    });
    if (!member) {
      throw new Error("選択した部員は存在しないか、現在は無効です。");
    }
  }

  const scheduleDay = await ensureScheduleDay(params.dateKey);
  if (params.memberId === null) {
    await prisma.assignment.deleteMany({
      where: {
        scheduleDayId: scheduleDay.id,
        itemType: params.itemType,
        roleType: params.roleType
      }
    });
  } else {
    await prisma.assignment.upsert({
      where: {
        scheduleDayId_itemType_roleType: {
          scheduleDayId: scheduleDay.id,
          itemType: params.itemType,
          roleType: params.roleType
        }
      },
      update: {
        memberId: params.memberId,
        updatedByUserId: params.userId
      },
      create: {
        scheduleDayId: scheduleDay.id,
        itemType: params.itemType,
        roleType: params.roleType,
        memberId: params.memberId,
        updatedByUserId: params.userId
      }
    });
  }

  await prisma.scheduleDay.update({
    where: { id: scheduleDay.id },
    data: {
      lastUpdatedAt: new Date(),
      lastUpdatedByUserId: params.userId
    }
  });

  return getDaySchedule(params.dateKey);
}

export async function getMonthlyReport(year: number, month: number) {
  const monthSchedule = await getMonthSchedule(year, month);
  const table = new Map<
    number,
    {
      memberId: number;
      memberName: string;
      boatStorageCount: number;
      boatGoCount: number;
      boatReturnCount: number;
      engineStorageCount: number;
      engineGoCount: number;
      engineReturnCount: number;
      grandTotalCount: number;
    }
  >();

  for (const day of monthSchedule) {
    for (const assignment of day.assignments) {
      if (!assignment.memberId || !assignment.memberName) {
        continue;
      }
      const existing =
        table.get(assignment.memberId) ??
        {
          memberId: assignment.memberId,
          memberName: assignment.memberName,
          boatStorageCount: 0,
          boatGoCount: 0,
          boatReturnCount: 0,
          engineStorageCount: 0,
          engineGoCount: 0,
          engineReturnCount: 0,
          grandTotalCount: 0
        };

      if (assignment.itemType === "BOAT" && assignment.roleType === "STORAGE") existing.boatStorageCount += 1;
      if (assignment.itemType === "BOAT" && assignment.roleType === "GO") existing.boatGoCount += 1;
      if (assignment.itemType === "BOAT" && assignment.roleType === "RETURN") existing.boatReturnCount += 1;
      if (assignment.itemType === "ENGINE" && assignment.roleType === "STORAGE") existing.engineStorageCount += 1;
      if (assignment.itemType === "ENGINE" && assignment.roleType === "GO") existing.engineGoCount += 1;
      if (assignment.itemType === "ENGINE" && assignment.roleType === "RETURN") existing.engineReturnCount += 1;
      existing.grandTotalCount += 1;

      table.set(assignment.memberId, existing);
    }
  }

  return [...table.values()].sort((a, b) => {
    if (b.grandTotalCount !== a.grandTotalCount) {
      return b.grandTotalCount - a.grandTotalCount;
    }
    return a.memberName.localeCompare(b.memberName, "ja");
  });
}

export async function getMonthlyFeeReport(year: number, month: number) {
  const report = await getMonthlyReport(year, month);

  return report.map((row) => {
    const boatStorageAmount = row.boatStorageCount * feeRates.boatStorage;
    const boatGoAmount = row.boatGoCount * feeRates.boatGo;
    const boatReturnAmount = row.boatReturnCount * feeRates.boatReturn;
    const engineStorageAmount = row.engineStorageCount * feeRates.engineStorage;
    const engineGoAmount = row.engineGoCount * feeRates.engineGo;
    const engineReturnAmount = row.engineReturnCount * feeRates.engineReturn;

    return {
      memberId: row.memberId,
      memberName: row.memberName,
      boatStorageAmount,
      boatGoAmount,
      boatReturnAmount,
      engineStorageAmount,
      engineGoAmount,
      engineReturnAmount,
      grandTotalAmount:
        boatStorageAmount +
        boatGoAmount +
        boatReturnAmount +
        engineStorageAmount +
        engineGoAmount +
        engineReturnAmount
    };
  });
}

export function buildDuplicateWarnings(assignments: Array<{ memberId: number | null; memberName: string | null }>) {
  const counts = new Map<string, number>();
  for (const assignment of assignments) {
    if (!assignment.memberId || !assignment.memberName) continue;
    counts.set(assignment.memberName, (counts.get(assignment.memberName) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([name, count]) => `${name} さんが同日に ${count} 役割を兼任しています。`);
}

export function scheduleCsvRow(params: {
  year: number;
  month: number;
  targetDate: string;
  itemType: ItemType;
  roleType: RoleType;
  memberName: string;
  updatedBy: string | null;
  updatedAt: string | null;
}) {
  return [
    params.year,
    params.month,
    params.targetDate,
    params.itemType.toLowerCase(),
    params.roleType.toLowerCase(),
    params.memberName,
    params.updatedBy ?? "",
    params.updatedAt ?? ""
  ].join(",");
}
