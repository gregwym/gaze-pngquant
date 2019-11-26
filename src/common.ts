import * as imagemin from 'imagemin';
import * as imageminMozjpeg from 'imagemin-mozjpeg';
import imageminPngquant from 'imagemin-pngquant';
import * as path from 'path';

import { MOZJPEG_OPTIONS, PNGQUANT_OPTIONS } from './constants';

export function getDestPath(source: string, dest: string, filePath: string) {
  return path.join(dest, path.relative(source, filePath));
}

export async function runImagemin(fromPath: string, toPath: string) {
  return imagemin([fromPath], {
    destination: toPath,
    plugins: [imageminPngquant(PNGQUANT_OPTIONS), imageminMozjpeg(MOZJPEG_OPTIONS)],
  });
}
