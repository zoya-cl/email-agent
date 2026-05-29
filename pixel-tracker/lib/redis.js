import { Redis } from "@upstash/redis";

const hasRedisCredentials = Boolean(
  process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
);

function createMemoryRedis() {
  const logs = [];
  const counts = new Map();
  const sets = new Map();

  const ensureSet = (key) => {
    if (!sets.has(key)) sets.set(key, new Set());
    return sets.get(key);
  };

  const getValue = (key) => {
    if (!counts.has(key)) return null;
    return String(counts.get(key));
  };

  const incrValue = (key) => {
    const next = Number(counts.get(key) ?? 0) + 1;
    counts.set(key, next);
    return next;
  };

  const trimLogs = (start, stop) => {
    const length = logs.length;
    const normalizedStart = start < 0 ? Math.max(0, length + start) : Math.max(0, start);
    const normalizedStop = stop < 0 ? length + stop : stop;
    const end = Math.min(length - 1, normalizedStop);

    if (normalizedStart > end) {
      logs.length = 0;
    } else {
      const slice = logs.slice(normalizedStart, end + 1);
      logs.length = 0;
      logs.push(...slice);
    }
  };

  const pipeline = () => {
    const commands = [];

    const addCommand = (fn) => {
      commands.push(fn);
      return pipelineApi;
    };

    const pipelineApi = {
      lpush: (key, value) => addCommand(() => {
        if (key === "logs") logs.unshift(value);
        return logs.length;
      }),
      ltrim: (key, start, stop) => addCommand(() => {
        if (key === "logs") trimLogs(start, stop);
        return "OK";
      }),
      incr: (key) => addCommand(() => incrValue(key)),
      sadd: (key, member) => addCommand(() => {
        ensureSet(key).add(member);
        return 1;
      }),
      get: (key) => addCommand(() => getValue(key)),
      smembers: (key) => addCommand(() => Array.from(ensureSet(key))),
      scard: (key) => addCommand(() => ensureSet(key).size),
      exec: async () => {
        const results = [];
        for (const command of commands) {
          results.push(await command());
        }
        return results;
      },
    };

    return pipelineApi;
  };

  return {
    lrange: async (key, start, stop) => {
      if (key !== "logs") return [];
      const normalizedStop = stop < 0 ? logs.length + stop : stop;
      return logs.slice(start, normalizedStop + 1);
    },
    lpush: async (key, value) => {
      if (key === "logs") logs.unshift(value);
      return logs.length;
    },
    ltrim: async (key, start, stop) => {
      if (key === "logs") trimLogs(start, stop);
      return "OK";
    },
    incr: async (key) => incrValue(key),
    sadd: async (key, member) => {
      ensureSet(key).add(member);
      return 1;
    },
    smembers: async (key) => Array.from(ensureSet(key)),
    scard: async (key) => ensureSet(key).size,
    get: async (key) => getValue(key),
    pipeline,
  };
}

if (!hasRedisCredentials) {
  console.warn(
    "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — using in-memory fallback. Stats and logs are not persisted across server restarts."
  );
}

export const redis = hasRedisCredentials
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : createMemoryRedis();
