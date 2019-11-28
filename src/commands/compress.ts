import * as moment from 'moment';
import * as readdir from 'recursive-readdir';

import { compressToDest, logFileEvent, safeFsStat, shouldIgnorePath } from '../common';
import { CompressCmdOptions } from '../types';

export async function startCompress(source: string, dest: string, options: CompressCmdOptions = {}) {
  const { after, before } = options;
  const afterMoment = after && moment(after);
  const beforeMoment = before && moment(before);

  const filePaths = await readdir(source, [shouldIgnorePath]);

  for (const filePath of filePaths) {
    if (after || before) {
      const fileStat = await safeFsStat(filePath);
      if (
        !fileStat ||
        (afterMoment && afterMoment.isAfter(fileStat.mtime)) ||
        (beforeMoment && beforeMoment.isBefore(fileStat.mtime))
      ) {
        logFileEvent('skip', { from: filePath });
        continue;
      }
    }

    await compressToDest(source, dest, filePath);
  }
}
