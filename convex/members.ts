import { v } from 'convex/values';

import { query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';

export const current = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (userId === null) {
      return null;
    }

    const members = await ctx.db
      .query('members')
      .withIndex('by_workspace_id_user_id', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', userId)
      )
      .unique();

    if (!members) {
      return null;
    }

    return members;
  },
});
