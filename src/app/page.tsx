'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { useCurrentUser } from '@/features/auth/api/use-current-user';
import { useGetWorkspaces } from '@/features/workspaces/api/use-get-workspaces';
import { useCreateWorkspaceModal } from '@/features/workspaces/store/use-create-workspace-modal';

import { UserButton } from '@/features/auth/components/user-button';

export default function Home() {
  const router = useRouter();
  const [open, setOpen] = useCreateWorkspaceModal();

  const { data, isLoading } = useGetWorkspaces();
  const { data: user, isLoading: userLoading } = useCurrentUser();

  const workSpaceId = useMemo(() => data?.[0]?._id, [data]);

  useEffect(() => {
    if (isLoading || userLoading) {
      return;
    }

    if (!user) {
      router.replace('/auth');
    } else if (workSpaceId) {
      router.replace(`/workspace/${workSpaceId}`);
    } else if (!open) {
      setOpen(true);
    }
  }, [workSpaceId, isLoading, open, setOpen, router, user, userLoading]);

  return (
    <div>
      <UserButton />
    </div>
  );
}
