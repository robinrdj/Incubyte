import { Alert, Button, Card, Modal, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { HrUserDto } from "@salary/shared";
import { IconUserPlus, IconUsersGroup } from "@tabler/icons-react";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext.js";
import { PageHeader } from "../components/PageHeader.js";
import { useAsync } from "../hooks/useAsync.js";
import { errorMessage } from "../lib/errors.js";
import { AddUserForm } from "../components/users/AddUserForm.js";
import { UsersSkeleton, UsersTable } from "../components/users/UsersTable.js";

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
          users.loading && <UsersSkeleton />
        ) : (
          <UsersTable users={users.data.items} currentUserId={user?.id} />
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
