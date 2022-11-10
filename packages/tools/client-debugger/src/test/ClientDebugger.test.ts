/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import { expect } from "chai";

import { SharedCounter } from "@fluidframework/counter";
import { ContainerSchema, IFluidContainer } from "@fluidframework/fluid-static";
import {
    TinyliciousClient,
    TinyliciousContainerServices,
} from "@fluidframework/tinylicious-client";

import { FluidClientDebuggerProps } from "../IFluidClientDebugger";
import {
    clearDebuggerRegistry,
    closeFluidClientDebugger,
    getDebuggerRegistry,
    initializeFluidClientDebugger,
} from "../Registry";

/* eslint-disable @typescript-eslint/no-non-null-assertion */

/**
 * Type returned from when creating / loading the Container.
 */
interface ContainerLoadResult {
    container: IFluidContainer;
    services: TinyliciousContainerServices;
}

/**
 * Schema used by the app.
 */
const containerSchema: ContainerSchema = {
    initialObjects: {
        counter: SharedCounter,
    },
};

describe("ClientDebugger unit tests", () => {
    let _debuggerProps: FluidClientDebuggerProps | undefined;

    beforeEach(async () => {
        const client = new TinyliciousClient();

        // Create the container
        console.log("Creating new container...");
        let createContainerResult: ContainerLoadResult;
        try {
            createContainerResult = await client.createContainer(containerSchema);
        } catch (error) {
            console.error(`Encountered error creating Fluid container: "${error}".`);
            throw error;
        }
        console.log("Container created!");

        const { container: tinyliciousContainer, services: tinyliciousServices } =
            createContainerResult;

        // Attach container
        let containerId: string;
        console.log("Awaiting container attach...");
        try {
            containerId = await tinyliciousContainer.attach();
        } catch (error) {
            console.error(`Encountered error attaching Fluid container: "${error}".`);
            throw error;
        }
        console.log("Fluid container attached!");

        _debuggerProps = {
            containerId,
            container: tinyliciousContainer._getInternalContainer!(),
            audience: tinyliciousServices.audience._getInternalAudience!(),
            containerData: tinyliciousContainer.initialObjects,
        };
    });

    afterEach(() => {
        clearDebuggerRegistry();
    });

    function getDebuggerProps(): FluidClientDebuggerProps {
        if (_debuggerProps === undefined) {
            expect.fail("Container initialization failed.");
        }
        return _debuggerProps;
    }

    it("Initializing debugger populates global (window) registry", () => {
        let debuggerRegistry = getDebuggerRegistry();
        expect(debuggerRegistry.size).to.equal(0); // There should be no registered debuggers yet.

        initializeFluidClientDebugger(getDebuggerProps());

        debuggerRegistry = getDebuggerRegistry();
        expect(debuggerRegistry.size).to.equal(1);
    });

    it("Closing debugger removes it from global (window) registry and disposes it.", () => {
        const debuggerProps = getDebuggerProps();
        const { containerId } = debuggerProps;

        const clientDebugger = initializeFluidClientDebugger(debuggerProps);

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(clientDebugger.disposed).to.be.false;

        let debuggerRegistry = getDebuggerRegistry();
        expect(debuggerRegistry.size).to.equal(1);

        closeFluidClientDebugger(containerId);

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(clientDebugger.disposed).to.be.true;

        debuggerRegistry = getDebuggerRegistry();
        expect(debuggerRegistry.size).to.equal(0);
    });
});

/* eslint-enable @typescript-eslint/no-non-null-assertion */
