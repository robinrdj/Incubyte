import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  PasswordInput,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { HrUserDto } from "@salary/shared";
import { IconUserPlus, IconUsersGroup } from "@tabler/icons-react";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext.js";
import { PageHeader } from "../components/PageHeader.js";
import { useAsync } from "../hooks/useAsync.js";
import { errorMessage } from "../lib/errors.js";
import { formatDate } from "../lib/format.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 12;

export function UsersPage(): React.JSX.Element {
  const { api, user } = useAuth();
  const users = useAsync(() => api.listUsers(), []);
  const [adding, { open, close }] = useDisclosure(false);
  const [added, setAdded] = useState<HrUserDto | null>(null);

  return (
    <Stack gap="lg">
      <PageHeader
        icon={IconUsersGroup}
        title="HR users"
        description="People who can sign in and manage salary data. Everyone here has the same access."
        actions={
          <Button leftSection={<IconUserPlus size={16} />} onClick={open}>
            Add HR user
          </Button>
        }
      />

      {added !== null && (
        <Alert
          color="teal"
          variant="light"
          role="status"
          withCloseButton
          onClose={() => {
            setAdded(null);
          }}
        >
          {added.name} can now sign in as {added.email}. Share the password with them directly.
        </Alert>
      )}

      <Card padding={0}>
        {users.error !== null && (
          <Alert color="red" role="alert" variant="light" m="md">
            {errorMessage(users.error)}
          </Alert>
        )}
        {users.data === undefined ? (
          users.loading && (
            <Stack gap="sm" p="md" aria-busy="true" aria-label="Loading HR users">
              {Array.from({ length: 3 }, (_, index) => (
                <Group key={index} gap="sm" wrap="nowrap">
                  <Skeleton circle height={32} />
                  <Skeleton height={12} width="30%" radius="sm" />
                  <Skeleton height={12} width="25%" radius="sm" />
                </Group>
              ))}
            </Stack>
          )
        ) : (
          <Table.ScrollContainer minWidth={640}>
            <Table aria-label="HR users" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Added by</Table.Th>
                  <Table.Th>Added on</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.data.items.map((member) => (
                  <Table.Tr key={member.id}>
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <Avatar size={32} radius="xl" color="initials" name={member.name} />
                        <div>
                          <Group gap={6}>
                            <Text size="sm" fw={600}>
                              {member.name}
                            </Text>
                            {member.id === user?.id && <Badge size="xs">You</Badge>}
                          </Group>
                          <Text size="xs" c="dimmed">
                            {member.email}
                          </Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={member.createdBy === null ? "dimmed" : "inherit"}>
                        {member.createdBy ?? "First account"}
                      </Text>
                    </Table.Td>
                    <Table.Td>{formatDate(member.createdAt.slice(0, 10))}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      <Modal opened={adding} onClose={close} title="Add HR user" centered radius="lg">
        <AddUserForm
          onAdded={(created) => {
            setAdded(created);
            close();
            users.reload();
          }}
        />
      </Modal>
    </Stack>
  );
}

function AddUserForm({ onAdded }: { onAdded: (user: HrUserDto) => void }): React.JSX.Element {
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
