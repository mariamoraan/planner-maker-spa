import { createUploadthing, type FileRouter, UploadThingError, UTFiles, UTApi } from 'uploadthing/server';
import { z } from 'zod';
import {
  assertKeyBelongsToUser,
  countTemplatePages,
  countUserFonts,
  getUserPlanLimits,
  templatePageExists,
  userFontExists,
  verifyFirebaseIdToken,
  verifyFirebaseToken,
} from '../firebase-admin.js';
import { maxFileSizeLabel } from '../plan-limits.js';

const f = createUploadthing();

// Route max sizes follow free-tier defaults; middleware still enforces per-plan bytes.
const DEFAULT_IMAGE_MAX = maxFileSizeLabel(8 * 1024 * 1024);
const DEFAULT_FONT_MAX = maxFileSizeLabel(8 * 1024 * 1024);

async function resolveUid(req: Request, idToken: string): Promise<string> {
  try {
    return await verifyFirebaseIdToken(idToken);
  } catch (primaryError) {
    try {
      return await verifyFirebaseToken(req.headers.get('Authorization'));
    } catch {
      const message = primaryError instanceof Error ? primaryError.message : 'Unauthorized';
      throw new UploadThingError(message);
    }
  }
}

export const uploadRouter = {
  plannerImage: f(
    {
      image: {
        maxFileSize: DEFAULT_IMAGE_MAX,
        maxFileCount: 1,
      },
    },
    { awaitServerData: true }
  )
    .input(
      z.object({
        pageId: z.string().min(1),
        templateId: z.string().min(1),
        idToken: z.string().min(1),
        previousFileKey: z.string().optional(),
      })
    )
    .middleware(async ({ req, input, files }) => {
      let uid: string;
      try {
        uid = await resolveUid(req, input.idToken);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized';
        console.error('[uploadthing] auth failed:', message);
        throw new UploadThingError(message);
      }

      const pageKey = `${uid}/${input.pageId}`;
      assertKeyBelongsToUser(pageKey, uid);

      const limits = await getUserPlanLimits(uid);
      const file = files[0];
      if (file && file.size > limits.maxImageBytes) {
        throw new UploadThingError(
          `Image exceeds the ${Math.round(limits.maxImageBytes / (1024 * 1024))} MB plan limit`,
        );
      }

      const isReplace =
        Boolean(input.previousFileKey) ||
        (await templatePageExists(uid, input.templateId, input.pageId));

      if (!isReplace) {
        const pageCount = await countTemplatePages(uid, input.templateId);
        if (pageCount >= limits.maxImagesPerPlanner) {
          throw new UploadThingError(
            `Free plan allows up to ${limits.maxImagesPerPlanner} pages per planner`,
          );
        }
      }

      const customId = `${pageKey}/${Date.now()}`;

      if (input.previousFileKey) {
        try {
          const utapi = new UTApi();
          await utapi.deleteFiles(input.previousFileKey);
        } catch (error) {
          console.warn('[uploadthing] Failed to delete previous page image:', error);
        }
      }

      const fileOverrides = files.map(entry => ({
        ...entry,
        customId,
      }));

      return {
        uid,
        pageId: input.pageId,
        templateId: input.templateId,
        pageKey,
        customId,
        [UTFiles]: fileOverrides,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const url =
        file.ufsUrl && !file.ufsUrl.includes('utfs.io')
          ? file.ufsUrl
          : file.url && !file.url.includes('utfs.io')
            ? file.url
            : file.ufsUrl ?? file.url;
      return {
        url,
        key: metadata.pageKey,
        fileKey: file.key,
      };
    }),

  plannerFont: f(
    {
      blob: {
        maxFileSize: DEFAULT_FONT_MAX,
        maxFileCount: 1,
      },
    },
    { awaitServerData: true }
  )
    .input(
      z.object({
        fontId: z.string().min(1),
        faceKey: z.string().min(1),
        idToken: z.string().min(1),
        previousFileKey: z.string().optional(),
      })
    )
    .middleware(async ({ req, input, files }) => {
      let uid: string;
      try {
        uid = await resolveUid(req, input.idToken);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unauthorized';
        console.error('[uploadthing] font auth failed:', message);
        throw new UploadThingError(message);
      }

      const fontKey = `${uid}/fonts/${input.fontId}/${input.faceKey}`;
      assertKeyBelongsToUser(fontKey, uid);

      const limits = await getUserPlanLimits(uid);
      const file = files[0];
      if (file && file.size > limits.maxFontBytes) {
        throw new UploadThingError(
          `Font exceeds the ${Math.round(limits.maxFontBytes / (1024 * 1024))} MB plan limit`,
        );
      }

      const fontExists = await userFontExists(uid, input.fontId);
      const isReplace = Boolean(input.previousFileKey) || fontExists;

      if (!isReplace) {
        const fontCount = await countUserFonts(uid);
        if (fontCount >= limits.maxFontFamilies) {
          throw new UploadThingError(
            `Free plan allows up to ${limits.maxFontFamilies} custom fonts`,
          );
        }
      }

      const customId = `${fontKey}/${Date.now()}`;

      if (input.previousFileKey) {
        try {
          const utapi = new UTApi();
          await utapi.deleteFiles(input.previousFileKey);
        } catch (error) {
          console.warn('[uploadthing] Failed to delete previous font file:', error);
        }
      }

      const fileOverrides = files.map(entry => ({
        ...entry,
        customId,
      }));

      return {
        uid,
        fontId: input.fontId,
        faceKey: input.faceKey,
        fontKey,
        customId,
        [UTFiles]: fileOverrides,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const url =
        file.ufsUrl && !file.ufsUrl.includes('utfs.io')
          ? file.ufsUrl
          : file.url && !file.url.includes('utfs.io')
            ? file.url
            : file.ufsUrl ?? file.url;
      return {
        url,
        key: metadata.fontKey,
        fileKey: file.key,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
