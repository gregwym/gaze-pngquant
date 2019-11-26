import { Options as PngquantOptions } from 'imagemin-pngquant';

export const IMAGE_EXTENSIONS = new Set(['.png']);

export const PNGQUANT_OPTIONS: PngquantOptions = {
  speed: 1,
};
