import setupLog from "./log";

const log = setupLog("lib/queues");

export const queues = {};

export async function setupQueues() {
  log.trace("setupQueues");
  return queues;
}

export const createQueue = (name, options = {}) => {
  queues[name] = new QueueRunner(options);
  return queues[name];
}

export const clearQueues = () =>
  Object.values(queues).forEach((queue) => queue.clear());

export const pauseQueues = () =>
  Object.values(queues).forEach((queue) => queue.pause());

export const startQueues = () =>
  Object.values(queues).forEach((queue) => queue.start());

export const queueStats = () =>
  Object.entries(queues).reduce(
    (acc, [name, queue]) => ({
      ...acc,
      [name]: {
        size: queue.size,
        pending: queue.pending,
        isRunning: queue.isRunning,
      },
    }),
    {}
  );

export class InMemorySource {
  constructor(data) {
    this.data = data || [];
  }
  push(task) {
    this.data.push(task);
  }
  pull() {
    return this.data.shift();
  }
  clear() {
    this.data.length = 0;
  }
  get size() {
    return this.data.length;
  }
  get empty() {
    return this.data.length === 0;
  }
}

const noop = () => {};

export class QueueRunner {
  constructor({
    concurrency = 1,
    autoStart = true,
    source = new InMemorySource(),
    onPush = noop,
    onTask = noop,
    onResolve = noop,
    onReject = noop,
    onEmpty = noop,
    onDone = noop,
  }) {
    Object.assign(this, {
      concurrency,
      autoStart,
      onPush,
      onTask,
      onResolve,
      onReject,
      onEmpty,
      onDone,
      source,
      nextTaskId: 0,
      isRunning: false,
      pendingTasks: {},
    });
  }

  async start() {
    log.trace("start");
    this.isRunning = true;
    setTimeout(() => this.next(), 0.1);
  }

  pause() {
    this.isRunning = false;
  }

  clear() {
    this.pause();
    this.source.clear();
  }

  async push(task) {
    log.trace("push", task);
    this.source.push(task);
    this.onPush(task);
    if (this.autoStart) {
      setTimeout(() => {
        if (!this.isRunning) {
          log.trace("autostart after push");
          this.start();
        }
      }, 0.1);
    }
  }

  get size() {
    return this.source.size;
  }

  get pending() {
    return Object.keys(this.pendingTasks).length;
  }

  next() {
    log.trace("next", this.pending, this.size);

    if (!this.isRunning) return;

    while (!this.source.empty && this.pending < this.concurrency) {
      const task = this.source.pull();
      if (!task) break;

      if (this.source.empty) {
        log.trace("empty");
        this.onEmpty();
      }

      const taskId = this.nextTaskId++;
      this.pendingTasks[taskId] = task;

      const complete = (cb) => (result) => {
        delete this.pendingTasks[taskId];
        setTimeout(() => this.next(), 0.1);
        cb(result, task, taskId);
      };

      this.onTask(task).then(complete(this.onResolve), complete(this.onReject));
    }

    if (this.pending === 0) {
      log.trace("done");
      this.isRunning = false;
      this.onDone();
    }
  }
}
