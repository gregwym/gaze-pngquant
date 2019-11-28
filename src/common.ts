import anymatch from 'anymatch';
import * as fs from 'fs';
import * as imagemin from 'imagemin';
import * as imageminMozjpeg from 'imagemin-mozjpeg';
import imageminPngquant from 'imagemin-pngquant';
import * as path from 'path';
import * as prettyBytes from 'pretty-bytes';

import { IGNORED_PATHS, IMAGE_EXTENSIONS, MOZJPEG_OPTIONS, PNGQUANT_OPTIONS } from './constants';

export function shouldIgnore(filePath: string) {
  return anymatch(IGNORED_PATHS, filePath) || !IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
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
    modifiedAt?: Date | string;
    error?: Error;
  },
) {
  const { from, to, origin, output, modifiedAt, error } = detail;

  console.info(
    `${event}: "${from}" -> "${to}"`,
    JSON.stringify({
      origin: origin && prettyBytes(origin),
      output: output && prettyBytes(output),
      modifiedAt: modifiedAt instanceof Date ? modifiedAt.toISOString() : modifiedAt,
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
