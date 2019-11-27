import * as imagemin from 'imagemin';
import * as imageminMozjpeg from 'imagemin-mozjpeg';
import imageminPngquant from 'imagemin-pngquant';
import * as path from 'path';
import * as prettyBytes from 'pretty-bytes';

import { MOZJPEG_OPTIONS, PNGQUANT_OPTIONS } from './constants';

export function getDestPath(source: string, dest: string, filePath: string) {
  return path.join(dest, path.relative(source, filePath));
}

export function logFileEvent(
  event: string,
  detail: {
    from: string;
    to: string;
    origin?: number;
    output?: number;
    modifiedAt?: Date | string;
  },
) {
  const { origin, output, modifiedAt } = detail;

  console.info(`${event}: `, {
    ...detail,
    origin: origin && prettyBytes(origin),
    output: output && prettyBytes(output),
    modifiedAt: modifiedAt instanceof Date ? modifiedAt.toLocaleString() : modifiedAt,
  });
}

export async function runImagemin(fromPath: string, toPath: string) {
  return imagemin([fromPath], {
    destination: toPath,
    plugins: [imageminPngquant(PNGQUANT_OPTIONS), imageminMozjpeg(MOZJPEG_OPTIONS)],
  });
}
