type Task<T> = () => Promise<T>;
type CancellableTaskOptions = {
  repeatEvery: number;
  abort: AbortController;
  repeatFailureOnly?: boolean;
};
export class CancellableTask<T> {
  private period?: number;
  private controller: AbortController;
  private cancellationToken: Promise<T>;
  private timer?: any;

  constructor(task: Task<T>, options: CancellableTaskOptions) {
    const { abort, repeatEvery } = options;
    this.controller = abort;
    this.cancellationToken = new Promise<T>((resolve, reject) => {
      const onAbort = () => {
        console.log("Aborting task");
        this.controller.signal.removeEventListener("abort", onAbort);
        reject(new Error("Task was cancelled"));
      };
      this.controller.signal.addEventListener("abort", onAbort);
      if (repeatEvery !== undefined) {
        this.period = Math.max(repeatEvery, 10);
        this.loopOnTaskEvery(task, resolve, reject, options.repeatFailureOnly);
      } else {
        task().then(resolve).catch(reject);
      }
    });
  }

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private loopOnTaskEvery(
    task: Task<T>,
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: Error) => void,
    repeatFailureOnly = false
  ) {
    if (!this.controller.signal.aborted) {
      if (!repeatFailureOnly) {
        task()
          .then(() => {
            this.clearTimer();
            this.timer = setTimeout(() => {
              this.loopOnTaskEvery(task, resolve, reject, repeatFailureOnly);
            }, this.period);
          })
          .catch(reject);
      } else {
        task()
          .then(resolve)
          .catch(() => {
            this.clearTimer();
            this.timer = setTimeout(() => {
              this.loopOnTaskEvery(task, resolve, reject, repeatFailureOnly);
            }, this.period);
          });
      }
    }
  }

  cancel() {
    this.clearTimer();
    this.controller.abort();
  }

  async then(): Promise<T> {
    return this.cancellationToken;
  }

  callback(fn: (response: T) => void) {
    if (this.period) {
      throw new Error("Can't call callback on non periodic cancellable task");
    }
    return this.cancellationToken.then((value) => fn(value));
  }
}
