import anymatch from 'anymatch';
import * as debugLogger from 'debug';
import * as fs from 'fs';
import * as imagemin from 'imagemin';
import * as imageminMozjpeg from 'imagemin-mozjpeg';
import imageminPngquant from 'imagemin-pngquant';
import * as path from 'path';
import * as prettyBytes from 'pretty-bytes';

import { IGNORED_PATHS, IMAGE_EXTENSIONS, IMAGE_PATHS, MOZJPEG_OPTIONS, PNGQUANT_OPTIONS } from './constants';
import { TaskScheduler } from './scheduler';

const debugCompress = debugLogger('compress');
const debugDelete = debugLogger('delete');

export function isIgnoredPath(filePath: string) {
  return anymatch(IGNORED_PATHS, filePath);
}

export function isImagePath(filePath: string) {
  return anymatch(IMAGE_PATHS, filePath);
}

export function isImageExtname(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  return !!extension && !IMAGE_EXTENSIONS.has(extension);
}

export function getDestPath(source: string, dest: string, filePath: string) {
  return path.join(dest, path.relative(source, filePath));
}

export function logFileEvent(
  event: string,
  detail: {
    from: string;
    to?: string;
    origin?: number;
    output?: number;
    error?: Error;
  },
) {
  const { from, to, origin, output, error } = detail;

  console.info(
    `${event}: "${from}" -> "${to}"`,
    JSON.stringify({
      origin: origin && prettyBytes(origin),
      output: output && prettyBytes(output),
    }),
  );

  if (error) {
    console.error(error);
  }
}

export async function runImagemin(fromPath: string, toPath: string) {
  return imagemin([fromPath], {
    destination: toPath,
    plugins: [imageminPngquant(PNGQUANT_OPTIONS), imageminMozjpeg(MOZJPEG_OPTIONS)],
  });
}

/**
 * Wrapper of fs.stat.
 * Returns null when file does not exists.
 *
 * @param p file path
 * @returns fs.Stats | null
 */
export async function safeFsStat(p: string) {
  return fs.promises.stat(p).catch(err => {
    if (err.code === 'ENOENT') return null;
    throw err;
  });
}

interface CompressRequest {
  sourcePath: string;
  destPath: string;
}

const taskScheduler = new TaskScheduler<CompressRequest>(async (requests: CompressRequest[]) => {
  await Promise.all(
    requests.map(async ({ sourcePath, destPath }) => {
      try {
        const sourceStats = await safeFsStat(sourcePath);
        if (!sourceStats) {
          debugCompress('compress-not-found', {
            from: sourcePath,
            to: destPath,
          });
          return null;
        }

        await runImagemin(sourcePath, path.dirname(destPath));

        const destStats = await safeFsStat(destPath);

        logFileEvent('compressed', {
          from: sourcePath,
          to: destPath,
          origin: sourceStats?.size,
          output: destStats?.size,
        });
        return destStats;
      } catch (e) {
        logFileEvent('compress-failed', {
          from: sourcePath,
          to: destPath,
          error: e,
        });
        return null;
      }
    }),
  );
  return [];
});

export async function compressToDest(source: string, dest: string, filePath: string) {
  const destPath = getDestPath(source, dest, filePath);
  const fileStat = await safeFsStat(filePath);
  if (!fileStat) {
    debugCompress('not-found', filePath);
    return false;
  }

  if (fileStat.isDirectory()) {
    debugCompress('dir', filePath);
    return false;
  }

  if (!fileStat.size) {
    debugCompress('skip-zero', filePath);
    return false;
  }

  if (!isImagePath(filePath)) {
    debugCompress('not-image', filePath);
    return false;
  }

  const destStat = await safeFsStat(destPath);
  if (destStat && destStat.mtime >= fileStat.mtime) {
    debugCompress(
      `not-modified: ${filePath}@${fileStat.mtime.toISOString()} ${destPath}@${destStat.mtime.toISOString()}`,
    );
    return false;
  }

  debugCompress(`modified: ${filePath}@${fileStat.mtime.toISOString()} ${destPath}@${destStat?.mtime.toISOString()}`);
  taskScheduler.push({
    sourcePath: filePath,
    destPath: destPath,
  });
  return true;
}

export async function removeDestFile(source: string, dest: string, filePath: string) {
  const destPath = getDestPath(source, dest, filePath);

  // Make sure have write permission
  const destStat = await safeFsStat(destPath);
  if (!destStat) {
    debugDelete('skip-delete', filePath);
    return;
  }

  logFileEvent('deleted', { from: filePath, to: destPath });
  if (destStat.isDirectory()) {
    await fs.promises.rmdir(destPath, { recursive: true });
  } else {
    await fs.promises.unlink(destPath);
  }
}
