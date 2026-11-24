import type { GroupBy } from "@salary/shared";

export const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "country", label: "Country" },
  { value: "department", label: "Department" },
  { value: "level", label: "Level" },
];
