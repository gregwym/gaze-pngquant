/**
 * 任务调度器
 *
 * @example
```
import { TaskScheduler } from './scheduler';

const taskScheduler = new TaskScheduler<number>(async (nums: number[]) => {
  console.log(`numbers: ${JSON.stringify(nums)}`);

  await flow.delay(this.node, 3);
  return [];
});

taskScheduler.push(1)
taskScheduler.push(2)
taskScheduler.push(3)
```
 */
export class TaskScheduler<T> {
  private static DEFAULT_OPTIONS = {
    batchSize: 1,
  };

  private tasks: T[] = [];
  private isRunning = false;

  /**
   * @param handler 处理函数
   * @param options {
   *    batchSize: 单次处理函数处理的数组上限，默认为1
   * }
   */
  constructor(
    private readonly handler: (todo: T[]) => Promise<T[]>,
    private readonly options?: { batchSize?: number },
  ) {
    this.options = {
      ...TaskScheduler.DEFAULT_OPTIONS,
      ...this.options,
    };
  }

  public push(task: T) {
    this.tasks.push(task);

    if (!this.isRunning) {
      this.isRunning = true;
      this.run(this.handler)
        .catch(err => {
          this.isRunning = false;
          console.error(err.message || err);
        })
        .then(() => {
          this.isRunning = false;
        });
    }
  }

  private async run(handler: (todo: T[]) => Promise<T[]>) {
    while (this.tasks.length) {
      const tasks = this.tasks.splice(0, this.options?.batchSize);

      const left = await handler(tasks);
      if (left.length > 0) {
        this.tasks.unshift(...left);
      }
    }
  }
}
