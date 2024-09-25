import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const useId = await getAuthUserId(ctx);

    if (!useId) {
      throw new Error('Unauthorized');
    }

    //TODO: Create a proper method later
    const joinCode = '12345678';

    const workspaceId = await ctx.db.insert('workspaces', {
      name: args.name,
      userId: useId,
      joinCode,
    });

    return workspaceId;
  },
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('workspaces').collect();
  },
});
