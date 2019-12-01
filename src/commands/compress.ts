import * as moment from 'moment';
import * as readdir from 'recursive-readdir';

import { compressToDest, isIgnoredPath, logFileEvent, safeFsStat } from '../common';
import { CompressCmdOptions } from '../types';

export async function startCompress(source: string, dest: string, options: CompressCmdOptions = {}) {
  const { after, before } = options;
  const afterMoment = after && moment(after);
  const beforeMoment = before && moment(before);

  const filePaths = await readdir(source, [isIgnoredPath]);

  for (const filePath of filePaths) {
    if (after || before) {
      const fileStat = await safeFsStat(filePath);
      if (
        !fileStat ||
        (afterMoment && afterMoment.isAfter(fileStat.ctime)) ||
        (beforeMoment && beforeMoment.isBefore(fileStat.ctime))
      ) {
        logFileEvent('skip', { from: filePath });
        continue;
      }
    }

    await compressToDest(source, dest, filePath);
  }
}
