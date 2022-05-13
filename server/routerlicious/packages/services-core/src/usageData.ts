/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

export enum MeterType {
    OpsIn,
    OpsOut,
    ClientConnectivityMinutes,
    StorageSpaceUsedInGB,
}

export interface IUsageData {
    type: MeterType,
    value: number,
    tenantId: string,
    documentId: string,
    clientId: string
}
