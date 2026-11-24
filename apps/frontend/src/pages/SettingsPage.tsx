import { Stack, Tabs } from "@mantine/core";
import { IconCurrencyDollar, IconScale, IconSettings } from "@tabler/icons-react";
import { PageHeader } from "../components/PageHeader.js";
import { PayBandsPanel } from "../components/settings/PayBandsPanel.js";
import { FxRatesPanel } from "../components/settings/FxRatesPanel.js";

export function SettingsPage(): React.JSX.Element {
  return (
    <Stack gap="lg">
      <PageHeader
        icon={IconSettings}
        title="Settings"
        description="Exchange rates turn local salaries into US dollars for the analytics. Pay bands decide who is flagged as below or above their band."
      />
      {/* Tabs stay mounted, so switching never reloads them. */}
      <Tabs defaultValue="fx" variant="pills" keepMountedMode="display-none">
        <Tabs.List>
          <Tabs.Tab value="fx" leftSection={<IconCurrencyDollar size={16} />}>
            Exchange rates
          </Tabs.Tab>
          <Tabs.Tab value="bands" leftSection={<IconScale size={16} />}>
            Pay bands
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="fx" pt="md">
          <FxRatesPanel />
        </Tabs.Panel>
        <Tabs.Panel value="bands" pt="md">
          <PayBandsPanel />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
