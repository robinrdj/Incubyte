import { Alert, Button, Group, PasswordInput, Stack, TextInput } from "@mantine/core";
import type { HrUserDto } from "@salary/shared";
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext.js";
import { errorMessage } from "../../lib/errors.js";
import { EMAIL_PATTERN } from "../../lib/validation.js";

const MIN_PASSWORD_LENGTH = 12;

export function AddUserForm({
  onAdded,
}: {
  onAdded: (user: HrUserDto) => void;
}): React.JSX.Element {
  const { api } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(): Promise<void> {
    const found = {
      ...(name.trim() === "" ? { name: "Enter their name." } : {}),
      ...(EMAIL_PATTERN.test(email.trim()) ? {} : { email: "Enter a valid email address." }),
      ...(password.length < MIN_PASSWORD_LENGTH
        ? { password: `Use at least ${String(MIN_PASSWORD_LENGTH)} characters.` }
        : {}),
    };
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setFailure(null);
    try {
      onAdded(await api.createUser({ name: name.trim(), email: email.trim(), password }));
    } catch (caught) {
      setFailure(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      noValidate
      aria-label="Add HR user"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <Stack>
        {failure !== null && (
          <Alert color="red" role="alert" variant="light">
            {failure}
          </Alert>
        )}
        <TextInput
          label="Name"
          required
          data-autofocus
          value={name}
          error={errors.name}
          onChange={(event) => {
            setName(event.currentTarget.value);
          }}
        />
        <TextInput
          label="Email"
          type="email"
          required
          value={email}
          error={errors.email}
          onChange={(event) => {
            setEmail(event.currentTarget.value);
          }}
        />
        <PasswordInput
          label="Initial password"
          description={`At least ${String(MIN_PASSWORD_LENGTH)} characters. Share it with them directly.`}
          required
          value={password}
          error={errors.password}
          onChange={(event) => {
            setPassword(event.currentTarget.value);
          }}
        />
        <Group justify="flex-end" mt="sm">
          <Button type="submit" loading={saving}>
            Add HR user
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
