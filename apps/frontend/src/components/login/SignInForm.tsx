import { Alert, Button, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconAlertCircle, IconAt, IconLock } from "@tabler/icons-react";

export function SignInForm({
  email,
  password,
  emailError,
  error,
  submitting,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  email: string;
  password: string;
  emailError: string | null;
  error: string | null;
  submitting: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}): React.JSX.Element {
  return (
    <form
      aria-label="Sign in"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
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
          <Alert color="red" role="alert" variant="light" icon={<IconAlertCircle size={18} />}>
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
            onEmailChange(event.currentTarget.value);
          }}
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          leftSection={<IconLock size={16} />}
          required
          value={password}
          onChange={(event) => {
            onPasswordChange(event.currentTarget.value);
          }}
        />
        <Button type="submit" loading={submitting} fullWidth size="md" mt="xs">
          Sign in
        </Button>
      </Stack>
    </form>
  );
}
