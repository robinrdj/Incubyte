import { describe, expect, it } from "vitest";
import { APP_NAME } from "./index.js";

describe("@salary/shared", () => {
  it("exposes the application name", () => {
    expect(APP_NAME).toBe("salary-management");
  });
});
