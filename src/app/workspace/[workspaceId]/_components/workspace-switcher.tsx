import { Loader, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { useGetWorkspace } from '@/features/workspaces/api/use-get-workspace';
import { useGetWorkspaces } from '@/features/workspaces/api/use-get-workspaces';
import { useCreateWorkspaceModal } from '@/features/workspaces/store/use-create-workspace-modal';

// import { CreateWorkspaceModal } from '@/features/workspaces/components/create-workspace-modal';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

export const WorkspaceSwitcher = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_open, setOpen] = useCreateWorkspaceModal();

  const { data: workspaces } = useGetWorkspaces();
  const { data: workspace, isLoading: workspaceLoading } = useGetWorkspace({
    id: workspaceId,
  });

  const filterWorkspaces = workspaces?.filter((w) => w._id !== workspaceId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button className="size-9 relative overflow-hidden bg-[#ABABAD] hover:bg-[#ABABAD]/80 text-slate-800 font-semibold text-xl">
          {workspaceLoading ? (
            <Loader className="size-5 animate-spin shrink-0" />
          ) : (
            workspace?.name.charAt(0).toUpperCase()
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" className="w-64">
        <DropdownMenuItem
          onClick={() => router.push(`/workspace/${workspaceId}`)}
          className="cursor-pointer flex-col justify-start items-start capitalize"
        >
          {workspace?.name}
          <span className="text-muted-foreground text-xm">
            Active workspace
          </span>
        </DropdownMenuItem>
        {filterWorkspaces?.map((w) => (
          <DropdownMenuItem
            key={w._id}
            onClick={() => router.push(`/workspace/${w._id}`)}
            className="cursor-pointer capitalize overflow-hidden"
          >
            <div
              className="shrink-0 size-9 relative overflow-hidden bg-[#616061] text-white
             font-semibold text-lg rounded-md flex items-center justify-center mr-2"
            >
              {w.name.charAt(0).toUpperCase()}
            </div>
            <p className="truncate">{w.name}</p>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => setOpen(true)}
        >
          <div
            className="size-9 relative overflow-hidden bg-[#F2F2F2] text-slate-800
             font-semibold text-lg rounded-md flex items-center justify-center mr-2"
          >
            <Plus />
          </div>
          Create a new workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
