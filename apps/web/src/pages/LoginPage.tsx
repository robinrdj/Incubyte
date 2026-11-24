import {
  Alert,
  Box,
  Button,
  Code,
  CopyButton,
  Group,
  Paper,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconChartBar,
  IconCheck,
  IconCopy,
  IconFileSpreadsheet,
  IconScale,
  IconSparkles,
} from "@tabler/icons-react";
import { useState } from "react";
import { ApiError } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.js";
import { ColorSchemeToggle } from "../components/ColorSchemeToggle.js";
import { BrandMark } from "../layout/AppLayout.js";
import { demoAccount, type DemoAccount } from "../lib/demo.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HIGHLIGHTS = [
  { icon: IconChartBar, text: "Median pay by country, department, and level, in US dollars" },
  { icon: IconScale, text: "See who sits outside their pay band at a glance" },
  { icon: IconFileSpreadsheet, text: "Move off spreadsheets with a checked CSV import" },
] as const;

export function LoginPage({
  demo = demoAccount(),
}: {
  /** Overridable for tests; defaults to the build-time demo account. */
  demo?: DemoAccount | null;
}): React.JSX.Element {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    setError(null);
    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError("Enter your work email address.");
      return;
    }
    setEmailError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 401
          ? "Incorrect email or password."
          : "Could not reach the server. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0} mih="100vh">
      <Box
        visibleFrom="md"
        p={48}
        style={{
          background:
            "radial-gradient(circle at 15% 10%, rgb(255 255 255 / 0.14), transparent 45%), linear-gradient(145deg, var(--mantine-color-brand-7), var(--mantine-color-violet-9))",
          color: "var(--mantine-color-white)",
        }}
      >
        <Stack justify="center" h="100%" maw={460} mx="auto" gap="xl">
          <Title order={1} fz={38} lh={1.15} c="white">
            Pay decisions, without the spreadsheets.
          </Title>
          <Text size="lg" opacity={0.85}>
            One place for ACME&apos;s salaries, pay history, and pay bands across every country.
          </Text>
          <Stack gap="md">
            {HIGHLIGHTS.map((item) => (
              <Group key={item.text} gap="md" wrap="nowrap">
                <ThemeIcon size={36} radius="md" color="white" variant="light" aria-hidden="true">
                  <item.icon size={20} stroke={1.6} />
                </ThemeIcon>
                <Text opacity={0.92}>{item.text}</Text>
              </Group>
            ))}
          </Stack>
        </Stack>
      </Box>

      <Box p="md" style={{ background: "var(--app-page-bg)" }}>
        <Group justify="flex-end">
          <ColorSchemeToggle />
        </Group>
        <Stack justify="center" mih="calc(100vh - 80px)" maw={420} mx="auto" w="100%">
          <BrandMark />
          <Paper withBorder shadow="sm" p="xl">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
              aria-label="Sign in"
              noValidate
            >
              <Stack>
                <div>
                  <Title order={2}>Welcome back</Title>
                  <Text c="dimmed" size="sm">
                    Sign in with your HR account.
                  </Text>
                </div>
                {error !== null && (
                  <Alert
                    color="red"
                    role="alert"
                    variant="light"
                    icon={<IconAlertCircle size={18} />}
                  >
                    {error}
                  </Alert>
                )}
                <TextInput
                  label="Email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  value={email}
                  error={emailError}
                  onChange={(event) => {
                    setEmail(event.currentTarget.value);
                  }}
                />
                <PasswordInput
                  label="Password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.currentTarget.value);
                  }}
                />
                <Button type="submit" loading={submitting} fullWidth size="md">
                  Sign in
                </Button>
              </Stack>
            </form>
          </Paper>

          {demo !== null && (
            <Paper withBorder p="md" aria-label="Demo account">
              <Group gap="xs" mb="xs">
                <IconSparkles size={18} color="var(--mantine-color-brand-5)" aria-hidden="true" />
                <Text fw={600} size="sm">
                  Demo account
                </Text>
              </Group>
              <Text size="xs" c="dimmed" mb="sm">
                The data here is generated for the demo. Use this account to look around.
              </Text>
              <Stack gap={6}>
                <Credential label="Email" value={demo.email} />
                <Credential label="Password" value={demo.password} />
              </Stack>
              <Button
                variant="light"
                fullWidth
                mt="md"
                onClick={() => {
                  setEmail(demo.email);
                  setPassword(demo.password);
                  setEmailError(null);
                }}
              >
                Use demo account
              </Button>
            </Paper>
          )}
        </Stack>
      </Box>
    </SimpleGrid>
  );
}

function Credential({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <Text size="sm" c="dimmed" w={72}>
        {label}
      </Text>
      <Code style={{ flex: 1, overflowWrap: "anywhere" }}>{value}</Code>
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={copy}
            aria-label={`Copy ${label.toLowerCase()}`}
            leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        )}
      </CopyButton>
    </Group>
  );
}
