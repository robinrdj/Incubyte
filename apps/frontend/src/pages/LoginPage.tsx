import { Box, Divider, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { ApiError } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.js";
import { demoAccount, type DemoAccount as DemoCredentials } from "../auth/demo-account.js";
import { BrandMark } from "../components/BrandMark.js";
import { ColorSchemeToggle } from "../components/ColorSchemeToggle.js";
import { DemoAccount } from "../components/login/DemoAccount.js";
import { ProductPitch } from "../components/login/ProductPitch.js";
import { SignInForm } from "../components/login/SignInForm.js";
import { EMAIL_PATTERN } from "../lib/validation.js";

export function LoginPage({
  demo = demoAccount(),
}: {
  demo?: DemoCredentials | null;
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
      <Group justify="space-between" px="lg" py="md" pos="relative">
        <BrandMark />
        <ColorSchemeToggle />
      </Group>

      <Box
        pos="relative"
        px="lg"
        pb="md"
        style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", overflowY: "auto" }}
      >
        <SimpleGrid
          cols={{ base: 1, md: 2 }}
          spacing={56}
          maw={1120}
          w="100%"
          mx="auto"
          style={{ alignItems: "center" }}
        >
          <ProductPitch />

          <Stack gap="md" maw={440} w="100%" mx="auto">
            <Paper withBorder shadow="lg" radius="md" p={{ base: "lg", sm: 32 }}>
              <SignInForm
                email={email}
                password={password}
                emailError={emailError}
                error={error}
                submitting={submitting}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onSubmit={() => void submit({ email, password })}
              />
              {demo !== null && (
                <>
                  <Divider label="or try the demo" labelPosition="center" my="md" />
                  <DemoAccount
                    account={demo}
                    disabled={submitting}
                    onUse={() => {
                      setEmail(demo.email);
                      setPassword(demo.password);
                      void submit(demo);
                    }}
                  />
                </>
              )}
            </Paper>
            <Text size="xs" c="dimmed" ta="center">
              Need an account? Ask a colleague to add you under HR users.
            </Text>
          </Stack>
        </SimpleGrid>
      </Box>
    </Box>
  );
}
