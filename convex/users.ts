import { getAuthUserId } from '@convex-dev/auth/server';
import { query } from './_generated/server';

export const current = query({
  args: {},
  handler: async (ctx) => {
    const useId = await getAuthUserId(ctx);

    if (useId === null) {
      return null;
    }

    return await ctx.db.get(useId);
  },
});
