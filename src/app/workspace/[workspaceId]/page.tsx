'use client';

import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader, TriangleAlert } from 'lucide-react';

import { useCurrentMember } from '@/features/members/api/use-current-member';
import { useCreateWorkspaceModal } from '@/features/workspaces/store/use-create-workspace-modal';
import { useGetWorkspace } from '@/features/workspaces/api/use-get-workspace';
import { useGetChannels } from '@/features/channels/api/use-get-channels';

import { useWorkspaceId } from '@/hooks/use-workspace-id';

const WorkspacePage = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const [open, setOpen] = useCreateWorkspaceModal();

  const { data: member, isLoading: memberLoading } = useCurrentMember({
    workspaceId,
  });
  const { data: workspace, isLoading: workspaceLoading } = useGetWorkspace({
    id: workspaceId,
  });
  const { data: channels, isLoading: channelsLoading } = useGetChannels({
    workspaceId,
  });

  const channelId = useMemo(() => channels?.[0]?._id, [channels]);
  const isAdmin = useMemo(() => member?.role === 'admin', [member]);

  useEffect(() => {
    if (
      workspaceLoading ||
      channelsLoading ||
      !workspace ||
      !member ||
      memberLoading
    ) {
      return;
    }

    if (channelId) {
      router.replace(`/workspace/${workspaceId}/channel/${channelId}`);
    } else if (!open && !isAdmin) {
      setOpen(true);
    }
  }, [
    member,
    memberLoading,
    isAdmin,
    workspaceLoading,
    channelsLoading,
    workspace,
    channelId,
    open,
    setOpen,
    router,
    workspaceId,
  ]);

  if (workspaceLoading || channelsLoading) {
    return (
      <div className="h-full flex-1 flex items-center justify-center flex-col gap-2">
        <Loader className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="h-full flex-1 flex items-center justify-center flex-col gap-2">
        <TriangleAlert className="size-6 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Workspace not found
        </span>
      </div>
    );
  }

  return (
    <div className="h-full flex-1 flex items-center justify-center flex-col gap-2">
      <TriangleAlert className="size-6 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">No channel found</span>
    </div>
  );
};

export default WorkspacePage;
