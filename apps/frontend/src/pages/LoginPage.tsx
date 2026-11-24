import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Code,
  CopyButton,
  Divider,
  Group,
  Paper,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconAt,
  IconCheck,
  IconCircleCheck,
  IconCopy,
  IconLock,
  IconSparkles,
} from "@tabler/icons-react";
import { useState } from "react";
import { ApiError } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.js";
import { demoAccount, type DemoAccount } from "../auth/demo-account.js";
import { BrandMark } from "../components/BrandMark.js";
import { ColorSchemeToggle } from "../components/ColorSchemeToggle.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HIGHLIGHTS = [
  "Median pay by country, department, and level, in US dollars",
  "Everyone outside their pay band, furthest first",
  "A checked CSV import to move off spreadsheets",
];

/** Illustrative figures for the preview card; not read from the database. */
const PREVIEW_BARS = [
  { label: "United States", value: 132, width: 100 },
  { label: "United Kingdom", value: 104, width: 79 },
  { label: "Germany", value: 98, width: 74 },
  { label: "India", value: 31, width: 24 },
];

export function LoginPage({
  demo = demoAccount(),
}: {
  demo?: DemoAccount | null;
}): React.JSX.Element {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(credentials: { email: string; password: string }): Promise<void> {
    setError(null);
    if (!EMAIL_PATTERN.test(credentials.email.trim())) {
      setEmailError("Enter your work email address.");
      return;
    }
    setEmailError(null);
    setSubmitting(true);
    try {
      await signIn(credentials.email, credentials.password);
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
    <Box className="auth-backdrop">
      <Group justify="space-between" p="lg" pos="relative">
        <BrandMark />
        <ColorSchemeToggle />
      </Group>

      <SimpleGrid
        cols={{ base: 1, md: 2 }}
        spacing={64}
        maw={1120}
        mx="auto"
        px="lg"
        py={{ base: "xl", md: 48 }}
        pos="relative"
        style={{ alignItems: "center" }}
      >
        <Stack gap="xl" visibleFrom="md">
          <Badge size="lg" leftSection={<IconSparkles size={14} />} w="fit-content">
            Built for HR teams
          </Badge>
          <Title order={1} fz={44} lh={1.1} style={{ letterSpacing: "-0.03em" }}>
            Every salary, every country,{" "}
            <Text
              span
              inherit
              variant="gradient"
              gradient={{ from: "brand.6", to: "violet.6", deg: 90 }}
            >
              one clear picture.
            </Text>
          </Title>
          <Text size="lg" c="dimmed" maw={480}>
            Keep ACME&apos;s pay history, pay bands, and exchange rates in one place, and answer how
            the company pays people in seconds.
          </Text>
          <Stack gap="xs">
            {HIGHLIGHTS.map((text) => (
              <Group key={text} gap="sm" wrap="nowrap">
                <IconCircleCheck
                  size={20}
                  color="var(--mantine-color-brand-6)"
                  aria-hidden="true"
                />
                <Text size="sm">{text}</Text>
              </Group>
            ))}
          </Stack>
          <ProductPreview />
        </Stack>

        <Stack gap="md" maw={440} w="100%" mx="auto">
          <Paper withBorder shadow="lg" radius="xl" p={{ base: "lg", sm: 36 }}>
            <form
              aria-label="Sign in"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void submit({ email, password });
              }}
            >
              <Stack gap="md">
                <div>
                  <Title order={2}>Sign in</Title>
                  <Text c="dimmed" size="sm" mt={4}>
                    Use your HR account to continue.
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
                  leftSection={<IconAt size={16} />}
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
                  leftSection={<IconLock size={16} />}
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.currentTarget.value);
                  }}
                />
                <Button type="submit" loading={submitting} fullWidth size="md" mt="xs">
                  Sign in
                </Button>
              </Stack>
            </form>

            {demo !== null && (
              <>
                <Divider label="or try the demo" labelPosition="center" my="lg" />
                <Box aria-label="Demo account">
                  <Stack gap={6}>
                    <Credential label="Email" value={demo.email} />
                    <Credential label="Password" value={demo.password} />
                  </Stack>
                  <Button
                    variant="light"
                    fullWidth
                    mt="md"
                    disabled={submitting}
                    onClick={() => {
                      setEmail(demo.email);
                      setPassword(demo.password);
                      void submit(demo);
                    }}
                  >
                    Sign in with the demo account
                  </Button>
                  <Text size="xs" c="dimmed" ta="center" mt="xs">
                    The demo data is generated, not real salaries.
                  </Text>
                </Box>
              </>
            )}
          </Paper>
          <Text size="xs" c="dimmed" ta="center">
            Need an account? Ask a colleague to add you under HR users.
          </Text>
        </Stack>
      </SimpleGrid>
    </Box>
  );
}

function ProductPreview(): React.JSX.Element {
  return (
    <Paper withBorder radius="lg" p="lg" shadow="md" maw={480} aria-hidden="true">
      <Group justify="space-between" mb="md">
        <Text size="sm" fw={600}>
          Median base pay by country
        </Text>
        <Badge color="gray">USD</Badge>
      </Group>
      <Stack gap={10}>
        {PREVIEW_BARS.map((bar) => (
          <Group key={bar.label} gap="sm" wrap="nowrap">
            <Text size="xs" c="dimmed" w={100}>
              {bar.label}
            </Text>
            <Box style={{ flex: 1 }}>
              <Box
                h={10}
                w={`${String(bar.width)}%`}
                style={{
                  borderRadius: 6,
                  background:
                    "linear-gradient(90deg, var(--mantine-color-brand-filled), var(--mantine-color-violet-filled))",
                }}
              />
            </Box>
            <Text size="xs" fw={600} w={44} ta="right" data-numeric>
              ${bar.value}k
            </Text>
          </Group>
        ))}
      </Stack>
      <SimpleGrid cols={3} mt="lg" spacing="sm">
        <PreviewStat label="Employees" value="10,000" />
        <PreviewStat label="Countries" value="10" />
        <PreviewStat label="Outside band" value="26%" />
      </SimpleGrid>
    </Paper>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} data-numeric>
        {value}
      </Text>
    </div>
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
