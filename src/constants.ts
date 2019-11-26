import { Options as PngquantOptions } from 'imagemin-pngquant';
import { Options as MozjpegOptions } from 'imagemin-mozjpeg';

export const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

export const PNGQUANT_OPTIONS: PngquantOptions = {
  speed: 1,
};

export const MOZJPEG_OPTIONS: MozjpegOptions = {
  progressive: false,
};
