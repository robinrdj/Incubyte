import { describe, expect, it } from "vitest";
import { getServiceName } from "./index.js";

describe("@salary/api", () => {
  it("reports its service name using the shared app name", () => {
    expect(getServiceName()).toBe("salary-management-api");
  });
});
