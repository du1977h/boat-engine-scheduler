import { describe, expect, test } from "vitest";
import { normalizeUserRole } from "../lib/validations";

describe("normalizeUserRole", () => {
  test("管理者をADMINへ変換する", () => {
    expect(normalizeUserRole("管理者")).toBe("ADMIN");
  });

  test("一般をGENERALへ変換する", () => {
    expect(normalizeUserRole("一般")).toBe("GENERAL");
  });
});
