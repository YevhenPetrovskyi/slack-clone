'use client';

import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { useGetWorkspace } from '@/features/workspaces/api/use-get-workspace';

const WorkspacePage = () => {
  const workspaceId = useWorkspaceId();
  const { data } = useGetWorkspace({ id: workspaceId });

  return <div>Data: {JSON.stringify(data)}</div>;
};

export default WorkspacePage;