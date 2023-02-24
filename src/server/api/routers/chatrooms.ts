import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const chatroomRouter = createTRPCRouter({
  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.chatroom.findMany();
  }),
  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.chatroom.create({
        data: {
          name: input.name,
          creatorId: ctx.session.user.id,
        },
      });
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.chatroom.delete({
        where: {
          id: input.id,
        },
      });
    }),
});

/*
//for reference
model Chatroom {
  id           String    @id @default(cuid())
  name         String
  description  String?
  creatorId    String
  createdAt    DateTime  @default(now())
//   members      User[]    @relation("ChatroomMembers")
  messages     Message[] @relation("ChatroomMessages")
}
*/
