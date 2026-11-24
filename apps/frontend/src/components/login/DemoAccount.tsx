import {
  ActionIcon,
  Box,
  Button,
  Code,
  CopyButton,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import type { DemoAccount as DemoCredentials } from "../../auth/demo-account.js";

function Credential({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <Text size="sm" c="dimmed" w={72}>
        {label}
      </Text>
      <Code style={{ flex: 1, overflowWrap: "anywhere" }}>{value}</Code>
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? "Copied" : `Copy ${label.toLowerCase()}`}>
            <ActionIcon
              variant="subtle"
              color={copied ? "teal" : "gray"}
              onClick={copy}
              aria-label={`Copy ${label.toLowerCase()}`}
            >
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}

export function DemoAccount({
  account,
  disabled,
  onUse,
}: {
  account: DemoCredentials;
  disabled: boolean;
  onUse: () => void;
}): React.JSX.Element {
  return (
    <Box aria-label="Demo account">
      <Stack gap={6}>
        <Credential label="Email" value={account.email} />
        <Credential label="Password" value={account.password} />
      </Stack>
      <Button variant="light" fullWidth mt="md" disabled={disabled} onClick={onUse}>
        Sign in with the demo account
      </Button>
      <Text size="xs" c="dimmed" ta="center" mt="xs">
        The demo data is generated, not real salaries.
      </Text>
    </Box>
  );
}
