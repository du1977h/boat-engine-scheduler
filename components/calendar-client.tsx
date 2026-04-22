"use client";

import { useEffect, useMemo, useState } from "react";
import { isHoliday } from "@holiday-jp/holiday_jp";
import Link from "next/link";
import { dayNumber, monthLabel, monthNavigation, parseDateKey, weekdayIndex, weekdayLabel } from "@/lib/date";
import { itemOptions, itemTypeLabels, roleOptions, roleTypeLabels } from "@/lib/constants";

type MemberOption = {
  id: number;
  name: string;
};

type AssignmentData = {
  itemType: "BOAT" | "ENGINE";
  roleType: "STORAGE" | "GO" | "RETURN";
  memberId: number | null;
  memberName: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

type DayData = {
  date: string;
  lastUpdatedAt: string | null;
  lastUpdatedBy: string | null;
  assignments: AssignmentData[];
};

function getAssignment(day: DayData, itemType: AssignmentData["itemType"], roleType: AssignmentData["roleType"]) {
  return day.assignments.find((entry) => entry.itemType === itemType && entry.roleType === roleType);
}

function compactMemberName(name: string | null | undefined) {
  if (!name) {
    return "";
  }

  const trimmed = name.trim();
  return trimmed.length <= 3 ? trimmed : trimmed.slice(0, 3);
}

function toCalendarWeeks(days: DayData[]) {
  if (days.length === 0) {
    return [];
  }

  const firstOffset = weekdayIndex(parseDateKey(days[0].date));
  const cells: Array<DayData | null> = [...Array.from({ length: firstOffset }, () => null), ...days];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: Array<Array<DayData | null>> = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

export function CalendarClient({
  year,
  month,
  initialDays,
  members
}: {
  year: number;
  month: number;
  initialDays: DayData[];
  members: MemberOption[];
}) {
  const [days, setDays] = useState(initialDays);
  const [activeItemType, setActiveItemType] = useState<"BOAT" | "ENGINE">("BOAT");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [flashError, setFlashError] = useState<string | null>(null);
  const nav = monthNavigation(year, month);
  const selectedDay = days.find((day) => day.date === selectedDate) ?? null;
  const weeks = useMemo(() => toCalendarWeeks(days), [days]);
  const calendarThemeClass = activeItemType === "BOAT" ? "theme-boat" : "theme-engine";

  useEffect(() => {
    setDays(initialDays);
    setSelectedDate(null);
    setSavingKey(null);
    setFlashError(null);
  }, [initialDays, year, month]);

  async function update(date: string, itemType: "BOAT" | "ENGINE", roleType: "STORAGE" | "GO" | "RETURN", memberId: string) {
    const key = `${date}-${itemType}-${roleType}`;
    setSavingKey(key);
    setFlashError(null);

    const response = await fetch("/api/schedule/day", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        date,
        itemType,
        roleType,
        memberId: memberId ? Number(memberId) : null
      })
    });

    const data = await response.json();
    if (!response.ok) {
      setFlashError(data.message ?? "保存に失敗しました。");
      setSavingKey(null);
      return;
    }

    setDays((current) => current.map((day) => (day.date === date ? data.day : day)));
    setSavingKey(null);
  }

  function getItemAssignments(day: DayData, itemType: "BOAT" | "ENGINE") {
    return roleOptions.map((roleType) => ({
      roleType,
      assignment: getAssignment(day, itemType, roleType)
    }));
  }

  function isRoleDisabled(day: DayData, itemType: "BOAT" | "ENGINE", roleType: "STORAGE" | "GO" | "RETURN") {
    const storageAssignment = getAssignment(day, itemType, "STORAGE");
    const goAssignment = getAssignment(day, itemType, "GO");
    const returnAssignment = getAssignment(day, itemType, "RETURN");

    const hasStorage = Boolean(storageAssignment?.memberId);
    const hasGoOrReturn = Boolean(goAssignment?.memberId || returnAssignment?.memberId);

    if (roleType === "STORAGE") {
      return hasGoOrReturn;
    }

    return hasStorage;
  }

  function isHolidayCell(date: Date) {
    const weekday = weekdayIndex(date);
    return weekday === 0 || weekday === 6 || isHoliday(date);
  }

  function formatLastUpdatedDate(day: DayData) {
    return day.lastUpdatedAt ? new Date(day.lastUpdatedAt).toLocaleDateString("ja-JP") : "未更新";
  }

  function formatLastUpdatedBy(day: DayData) {
    return day.lastUpdatedBy?.trim() || "未更新";
  }

  return (
    <div className="calendar-page">
      <section className="panel month-header">
        <div className="month-actions month-actions-inline">
          <Link className="secondary-button" href={`/calendar?year=${nav.prev.year}&month=${nav.prev.month}`}>
            前月
          </Link>
          <h2>{monthLabel(year, month)}</h2>
          <Link className="secondary-button" href={`/calendar?year=${nav.next.year}&month=${nav.next.month}`}>
            翌月
          </Link>
        </div>
      </section>

      <section className={`panel item-switcher ${calendarThemeClass}`}>
        <div className="item-toggle-group" role="tablist" aria-label="対象物切り替え">
          {itemOptions.map((itemType) => (
            <button
              key={itemType}
              type="button"
              className={`item-toggle ${activeItemType === itemType ? "active" : ""}`}
              onClick={() => setActiveItemType(itemType)}
              aria-pressed={activeItemType === itemType}
            >
              {itemTypeLabels[itemType]}
            </button>
          ))}
        </div>
      </section>

      <section className={`calendar-board ${calendarThemeClass}`}>
        <div className="calendar-weeks">
          {weeks.map((week, weekIndex) => (
            <div key={`${year}-${month}-${weekIndex}`} className="calendar-week">
              {week.map((day, dayIndex) => {
                if (!day) {
                  return <div key={`empty-${weekIndex}-${dayIndex}`} className="calendar-day empty-slot" aria-hidden="true" />;
                }

                const date = parseDateKey(day.date);
                const itemAssignments = getItemAssignments(day, activeItemType);
                const filledAssignments = itemAssignments.filter((entry) => entry.assignment?.memberName);
                const isHolidayOrWeekend = isHolidayCell(date);
                return (
                  <button
                    key={day.date}
                    className={`calendar-day ${isHolidayOrWeekend ? "holiday-cell" : ""}`}
                    onClick={() => setSelectedDate(day.date)}
                    type="button"
                  >
                    <div className="calendar-day-head">
                      <strong>{dayNumber(date)}</strong>
                      <span>{weekdayLabel(date)}</span>
                    </div>
                    {filledAssignments.length > 0 ? (
                      <div className="role-summary">
                        {filledAssignments.map(({ roleType, assignment }) => (
                          <div
                            key={roleType}
                            className="role-summary-row"
                            title={`${roleTypeLabels[roleType]}: ${assignment?.memberName ?? ""}`}
                          >
                            <span className="role-summary-label">{roleTypeLabels[roleType]}</span>
                            <span className="role-summary-value">
                              <span className="role-summary-value-full">{assignment?.memberName}</span>
                              <span className="role-summary-value-compact">{compactMemberName(assignment?.memberName)}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="role-summary role-summary-empty" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {selectedDay ? (
        <div className="sheet-backdrop" onClick={() => setSelectedDate(null)}>
          <section className="sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header">
              <div>
                <h3>{selectedDay.date}</h3>
                <p className="subtitle">最終更新: {formatLastUpdatedDate(selectedDay)}</p>
                <p className="subtitle">ユーザー: {formatLastUpdatedBy(selectedDay)}</p>
              </div>
              <button className="ghost-button" onClick={() => setSelectedDate(null)} type="button">
                閉じる
              </button>
            </div>

            {flashError ? <p className="message error">{flashError}</p> : null}

            <div className="item-card">
              <div className="role-grid">
                {roleOptions.map((roleType) => {
                  const assignment = getAssignment(selectedDay, activeItemType, roleType);
                  const fieldKey = `${selectedDay.date}-${activeItemType}-${roleType}`;
                  const disabledByRule = isRoleDisabled(selectedDay, activeItemType, roleType) && !assignment?.memberId;
                  return (
                    <label key={roleType}>
                      {roleTypeLabels[roleType]}
                      <select
                        value={assignment?.memberId ?? ""}
                        onChange={(event) => update(selectedDay.date, activeItemType, roleType, event.target.value)}
                        disabled={savingKey === fieldKey || disabledByRule}
                      >
                        <option value="">未選択</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
