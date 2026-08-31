import { createUploadthing, type FileRouter, UploadThingError, UTFiles, UTApi } from 'uploadthing/server';
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
        previousFileKey: z.string().optional(),
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

      const pageKey = `${uid}/${input.pageId}`;
      assertKeyBelongsToUser(pageKey, uid);

      // Unique customId avoids Uploadthing 409 when replacing an existing page image.
      const customId = `${pageKey}/${Date.now()}`;

      if (input.previousFileKey) {
        try {
          const utapi = new UTApi();
          await utapi.deleteFiles(input.previousFileKey);
        } catch (error) {
          console.warn('[uploadthing] Failed to delete previous page image:', error);
        }
      }

      const fileOverrides = files.map(file => ({
        ...file,
        customId,
      }));

      return {
        uid,
        pageId: input.pageId,
        pageKey,
        customId,
        [UTFiles]: fileOverrides,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        url: file.ufsUrl ?? file.url,
        key: metadata.pageKey,
        fileKey: file.key,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
