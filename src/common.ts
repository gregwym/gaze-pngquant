import * as path from 'path';
import * as imagemin from 'imagemin';
import imageminPngquant from 'imagemin-pngquant';

export function getDestPath(source: string, dest: string, filePath: string) {
  return path.join(dest, path.relative(source, filePath));
}

export async function runImagemin(fromPath: string, toPath: string) {
  return imagemin([fromPath], {
    destination: toPath,
    plugins: [
      imageminPngquant({
        speed: 1,
      }),
    ],
  });
}
