import {
  Alert,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { ApiError } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.js";

export function LoginPage(): React.JSX.Element {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(username.trim(), password);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 401
          ? "Incorrect username or password."
          : "Could not reach the server. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Center mih="100vh" px="md">
      <Paper withBorder shadow="sm" p="xl" radius="md" w="100%" maw={420}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
          aria-label="Sign in"
        >
          <Stack>
            <div>
              <Title order={2}>Salary Management</Title>
              <Text c="dimmed" size="sm">
                Sign in with your HR account.
              </Text>
            </div>
            {error !== null && (
              <Alert color="red" role="alert" variant="light">
                {error}
              </Alert>
            )}
            <TextInput
              label="Username"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => {
                setUsername(event.currentTarget.value);
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
            <Button type="submit" loading={submitting} fullWidth>
              Sign in
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
