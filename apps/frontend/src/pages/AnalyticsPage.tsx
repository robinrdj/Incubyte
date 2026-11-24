import { Alert, Button, Select, Stack, Tabs, TextInput } from "@mantine/core";
import type { GroupBy } from "@salary/shared";
import { IconChartBar, IconScale } from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader.js";
import { useCompensationReport } from "../hooks/useCompensationReport.js";
import { errorMessage } from "../lib/errors.js";
import { GROUP_OPTIONS } from "../components/analytics/group-options.js";
import { CompensationSkeleton } from "../components/analytics/CompensationSkeleton.js";
import { BandViolationsCard } from "../components/analytics/BandViolationsCard.js";
import { CompensationView } from "../components/analytics/CompensationView.js";

export function AnalyticsPage(): React.JSX.Element {
  const [groupBy, setGroupBy] = useState<GroupBy>("country");
  const [asOf, setAsOf] = useState("");
  const [tab, setTab] = useState<"pay" | "bands">("pay");

  const compensation = useCompensationReport(groupBy, asOf);

  return (
    <Stack gap="lg">
      <PageHeader
        icon={IconChartBar}
        title="Analytics"
        description="Active employees, in US dollars at the exchange rate in force on the chosen date."
        actions={
          <>
            {tab === "pay" && (
              <Select
                label="Group by"
                data={GROUP_OPTIONS}
                value={groupBy}
                onChange={(value) => {
                  setGroupBy(value ?? "country");
                }}
                allowDeselect={false}
                w={170}
              />
            )}
            <TextInput
              label="As of (optional)"
              type="date"
              value={asOf}
              onChange={(event) => {
                setAsOf(event.currentTarget.value);
              }}
              w={170}
            />
            {asOf !== "" && (
              <Button
                variant="subtle"
                onClick={() => {
                  setAsOf("");
                }}
              >
                Use today
              </Button>
            )}
          </>
        }
      />

      {/* Tabs stay mounted, so switching never reloads them. */}
      <Tabs
        value={tab}
        onChange={(value) => {
          setTab(value === "bands" ? "bands" : "pay");
        }}
        variant="pills"
        keepMountedMode="display-none"
      >
        <Tabs.List>
          <Tabs.Tab value="pay" leftSection={<IconChartBar size={16} />}>
            Pay by group
          </Tabs.Tab>
          <Tabs.Tab value="bands" leftSection={<IconScale size={16} />}>
            Pay bands
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="pay" pt="lg">
          <Stack gap="lg">
            {compensation.error !== null && (
              <Alert
                color="red"
                role="alert"
                variant="light"
                title="The analytics could not be calculated"
              >
                {errorMessage(compensation.error)}
              </Alert>
            )}
            {compensation.report === undefined ? (
              compensation.loading && <CompensationSkeleton />
            ) : (
              <CompensationView report={compensation.report} updating={compensation.updating} />
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="bands" pt="lg">
          {/* Keyed by date: a new date resets the page and filter. */}
          <BandViolationsCard key={asOf} asOf={asOf} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
