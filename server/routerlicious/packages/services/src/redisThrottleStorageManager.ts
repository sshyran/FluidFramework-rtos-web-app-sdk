/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    IThrottleStorageManager,
    IThrottlingMetrics,
    IUsageData,
} from "@fluidframework/server-services-core";
import { executeRedisMultiWithHmsetExpire,
         executeRedisMultiWithHmsetLpushExpire,
         executeRedisMultiWithLpushExpire,
         IRedisParameters } from "@fluidframework/server-services-utils";
import { Redis } from "ioredis";
import * as winston from "winston";
import { CommonProperties, Lumberjack } from "@fluidframework/server-services-telemetry";

/**
 * Manages storage of throttling metrics in redis hashes with an expiry of 'expireAfterSeconds'.
 */
export class RedisThrottleStorageManager implements IThrottleStorageManager {
    private readonly expireAfterSeconds: number = 60 * 60 * 24;
    private readonly throttlingPrefix: string = "throttle";
    private readonly usagePrefix: string = "usage";

    constructor(
        private readonly client: Redis,
        parameters?: IRedisParameters) {
        if (parameters?.expireAfterSeconds) {
            this.expireAfterSeconds = parameters.expireAfterSeconds;
        }

        if (parameters?.prefix) {
            this.throttlingPrefix = parameters.prefix;
        }

        client.on("error", (error) => {
            winston.error("Throttle Manager Redis Error:", error);
            Lumberjack.error(
                "Throttle Manager Redis Error",
                { [CommonProperties.telemetryGroupName]: "throttling" },
                error);
        });
    }

    public async setThrottlingMetric(
        id: string,
        throttlingMetric: IThrottlingMetrics,
    ): Promise<void> {
        const throttlingKey = this.getThrottlingKey(id);

        return executeRedisMultiWithHmsetExpire(
            this.client,
            throttlingKey,
            throttlingMetric as { [key: string]: any; },
            this.expireAfterSeconds);
    }

    public async setThrottlingMetricAndUsageData(
        id: string,
        throttlingMetric: IThrottlingMetrics,
        usageData: IUsageData,
    ): Promise<void> {
        const throttlingKey = this.getThrottlingKey(id);
        const usageKey = this.getUsageKey(id);
        const usageDataString = JSON.stringify(usageData);

        return executeRedisMultiWithHmsetLpushExpire(
            this.client,
            throttlingKey,
            throttlingMetric as { [key: string]: any; },
            usageKey,
            usageDataString,
            this.expireAfterSeconds);
    }

    public async setUsageData(
        id: string,
        usageData: IUsageData,
    ): Promise<void> {
        const usageKey = this.getUsageKey(id);
        const usageDataString = JSON.stringify(usageData);

        return executeRedisMultiWithLpushExpire(
            this.client,
            usageKey,
            usageDataString,
            this.expireAfterSeconds);
    }

    public async getUsageData(id: string): Promise<IUsageData> {
        const usageKey = this.getUsageKey(id);
        const usageDataString = await this.client.rpop(usageKey);
        const usageData = JSON.parse(usageDataString) as IUsageData;
        return usageData;
    }

    public async getThrottlingMetric(id: string): Promise<IThrottlingMetrics | undefined> {
        const throttlingMetricRedis = await this.client.hgetall(this.getThrottlingKey(id));
        if (Object.keys(throttlingMetricRedis).length === 0) {
            return undefined;
        }

        // All values retrieved from Redis are strings, so they must be parsed
        const throttlingMetric = {
            count: Number.parseInt(throttlingMetricRedis.count, 10),
            lastCoolDownAt: Number.parseInt(throttlingMetricRedis.lastCoolDownAt, 10),
            throttleStatus: throttlingMetricRedis.throttleStatus === "true",
            throttleReason: throttlingMetricRedis.throttleReason,
            retryAfterInMs: Number.parseInt(throttlingMetricRedis.retryAfterInMs, 10),
        };

        return throttlingMetric;
    }

    private getThrottlingKey(id: string): string {
        return `${this.throttlingPrefix}:${id}`;
    }

    private getUsageKey(id: string): string {
        return `${this.usagePrefix}:${id}`;
    }
}
