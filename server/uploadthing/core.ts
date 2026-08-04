import { createUploadthing, type FileRouter, UploadThingError, UTFiles } from 'uploadthing/server';
import { z } from 'zod';
import { assertKeyBelongsToUser, verifyFirebaseIdToken, verifyFirebaseToken } from '../firebase-admin';

const f = createUploadthing();

export const uploadRouter = {
  plannerImage: f(
    {
      image: {
        maxFileSize: '10MB',
        maxFileCount: 1,
      },
    },
    { awaitServerData: true }
  )
    .input(
      z.object({
        pageId: z.string().min(1),
        idToken: z.string().min(1),
      })
    )
    .middleware(async ({ req, input, files }) => {
      let uid: string;
      try {
        uid = await verifyFirebaseIdToken(input.idToken);
      } catch (primaryError) {
        try {
          uid = await verifyFirebaseToken(req.headers.get('Authorization'));
        } catch {
          const message =
            primaryError instanceof Error ? primaryError.message : 'Unauthorized';
          console.error('[uploadthing] auth failed:', message);
          throw new UploadThingError(message);
        }
      }

      const customId = `${uid}/${input.pageId}`;
      assertKeyBelongsToUser(customId, uid);

      const fileOverrides = files.map(file => ({
        ...file,
        customId,
      }));

      return {
        uid,
        pageId: input.pageId,
        customId,
        [UTFiles]: fileOverrides,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        url: file.ufsUrl ?? file.url,
        key: metadata.customId,
        fileKey: file.key,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
