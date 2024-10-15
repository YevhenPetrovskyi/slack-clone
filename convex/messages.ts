import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';

import { mutation, query, QueryCtx } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { Doc, Id } from './_generated/dataModel';

const populateThread = async (ctx: QueryCtx, messageId: Id<'messages'>) => {
  const messages = await ctx.db
    .query('messages')
    .withIndex('by_parent_message_id', (q) => q.eq('parentMessageId', messageId))
    .collect();

  if (messages.length === 0) {
    return {
      count: 0,
      image: undefined,
      timestamp: 0,
    };
  }

  const lastMessage = messages[messages.length - 1];
  const lastMessageMember = await populateMember(ctx, lastMessage.memberId);

  if (!lastMessageMember) {
    return {
      count: messages.length,
      image: undefined,
      timestamp: 0,
    };
  }

  const lastMessageUser = await populateUser(ctx, lastMessageMember.userId);

  return {
    count: messages.length,
    image: lastMessageUser?.image,
    timestamp: lastMessage._creationTime,
  };
};

const populateReactions = (ctx: QueryCtx, messageId: Id<'messages'>) => {
  return ctx.db
    .query('reactions')
    .withIndex('by_message_id', (q) => q.eq('messageId', messageId))
    .collect();
};

const populateUser = (ctx: QueryCtx, uerId: Id<'users'>) => {
  return ctx.db.get(uerId);
};

const populateMember = (ctx: QueryCtx, memberId: Id<'members'>) => {
  return ctx.db.get(memberId);
};
const getMember = (ctx: QueryCtx, workspaceId: Id<'workspaces'>, userId: Id<'users'>) => {
  return ctx.db
    .query('members')
    .withIndex('by_workspace_id_user_id', (q) =>
      q.eq('workspaceId', workspaceId).eq('userId', userId)
    )
    .unique();
};

export const getById = query({
  args: {
    id: v.id('messages'),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      return null;
    }

    const message = await ctx.db.get(args.id);

    if (!message) {
      return null;
    }

    const currentMemberPromise = getMember(ctx, message.workspaceId, userId);
    const memberPromise = populateMember(ctx, message.memberId);

    const [currentMember, member] = await Promise.all([
      currentMemberPromise,
      memberPromise,
    ]);

    if (!currentMember || !member) {
      return null;
    }

    const user = await populateUser(ctx, member.userId);

    if (!user) {
      return null;
    }

    const reactions = await populateReactions(ctx, args.id);

    const reactionsWithCounts = reactions.map((reaction) => {
      return {
        ...reaction,
        count: reactions.filter((r) => r.value === reaction.value).length,
      };
    });

    const dedupedReactions = reactionsWithCounts.reduce(
      (acc, reactions) => {
        const existingReaction = acc.find((r) => r.value === reactions.value);

        if (existingReaction) {
          existingReaction.memberIds = Array.from(
            new Set([...existingReaction.memberIds, reactions.memberId])
          );
        } else {
          acc.push({
            ...reactions,
            memberIds: [reactions.memberId],
          });
        }

        return acc;
      },
      [] as (Doc<'reactions'> & { count: number; memberIds: Id<'members'>[] })[]
    );

    const reactionsWithoutMemberIdProperty = dedupedReactions.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ memberId, ...rest }) => rest
    );

    return {
      ...message,
      image: message.image ? await ctx.storage.getUrl(message.image) : undefined,
      user,
      member,
      reactions: reactionsWithoutMemberIdProperty,
    };
  },
});

export const remove = mutation({
  args: {
    id: v.id('messages'),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error('Authenticated.');
    }

    const message = await ctx.db.get(args.id);

    if (!message) {
      throw new Error('Message not found.');
    }

    const member = await getMember(ctx, message.workspaceId, userId);

    if (!member || member._id !== message.memberId) {
      throw new Error('Unauthorized.');
    }

    if (message.image) {
      await ctx.storage.delete(message.image);
    }

    await ctx.db.delete(args.id);

    return args.id;
  },
});

export const update = mutation({
  args: {
    body: v.string(),
    id: v.id('messages'),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error('Authenticated.');
    }

    const message = await ctx.db.get(args.id);

    if (!message) {
      throw new Error('Message not found.');
    }

    const member = await getMember(ctx, message.workspaceId, userId);

    if (!member || member._id !== message.memberId) {
      throw new Error('Unauthorized.');
    }

    await ctx.db.patch(args.id, {
      body: args.body,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const get = query({
  args: {
    channelId: v.optional(v.id('channels')),
    conversationId: v.optional(v.id('conversations')),
    parentMessageId: v.optional(v.id('messages')),
    paginationOpts: paginationOptsValidator,
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error('Authenticated.');
    }

    let _conversationId = args.conversationId;

    if (!args.conversationId && !args.channelId && args.parentMessageId) {
      const parentMessage = await ctx.db.get(args.parentMessageId);

      if (!parentMessage) {
        throw new Error('Parent message not found.');
      }

      _conversationId = parentMessage.conversationId;
    }

    const result = await ctx.db
      .query('messages')
      .withIndex('by_channel_id_parent_message_id_conversation_id', (q) =>
        q
          .eq('channelId', args.channelId)
          .eq('parentMessageId', args.parentMessageId)
          .eq('conversationId', _conversationId)
      )
      .order('desc')
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: (
        await Promise.all(
          result.page.map(async (message) => {
            const member = await populateMember(ctx, message.memberId);
            const user = member ? await populateUser(ctx, member.userId) : null;

            if (!member || !user) {
              return null;
            }

            const reactions = await populateReactions(ctx, message._id);
            const thread = await populateThread(ctx, message._id);
            const image = message.image
              ? await ctx.storage.getUrl(message.image)
              : undefined;

            const reactionsWithCounts = reactions.map((reaction) => {
              return {
                ...reaction,
                count: reactions.filter((r) => r.value === reaction.value).length,
              };
            });

            const dedupedReactions = reactionsWithCounts.reduce(
              (acc, reactions) => {
                const existingReaction = acc.find((r) => r.value === reactions.value);

                if (existingReaction) {
                  existingReaction.memberIds = Array.from(
                    new Set([...existingReaction.memberIds, reactions.memberId])
                  );
                } else {
                  acc.push({
                    ...reactions,
                    memberIds: [reactions.memberId],
                  });
                }

                return acc;
              },
              [] as (Doc<'reactions'> & { count: number; memberIds: Id<'members'>[] })[]
            );

            const reactionsWithoutMemberIdProperty = dedupedReactions.map(
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              ({ memberId, ...rest }) => rest
            );

            return {
              ...message,
              image,
              member,
              user,
              reactions: reactionsWithoutMemberIdProperty,
              threadCount: thread.count,
              threadImage: thread.image,
              threadTimestamp: thread.timestamp,
            };
          })
        )
      ).filter((message): message is NonNullable<typeof message> => message !== null),
    };
  },
});

export const create = mutation({
  args: {
    body: v.string(),
    image: v.optional(v.id('_storage')),
    workspaceId: v.id('workspaces'),
    channelId: v.optional(v.id('channels')),
    conversationId: v.optional(v.id('conversations')),
    parentMessageId: v.optional(v.id('messages')),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      console.log('User not authenticated.');
      throw new Error('Authenticated.');
    }

    const member = await getMember(ctx, args.workspaceId, userId);

    if (!member) {
      console.log('User not authorized.');
      throw new Error('Authorized.');
    }

    let _conversationId = args.conversationId;

    if (!args.conversationId && args.channelId && args.parentMessageId) {
      const parentMessage = await ctx.db.get(args.parentMessageId);

      if (!parentMessage) {
        throw new Error('Parent message not found.');
      }

      _conversationId = parentMessage.conversationId;
    }

    const messageId = await ctx.db.insert('messages', {
      memberId: member._id,
      body: args.body,
      image: args.image,
      workspaceId: args.workspaceId,
      conversationId: _conversationId,
      channelId: args.channelId,
      parentMessageId: args.parentMessageId,
    });

    return messageId;
  },
});
