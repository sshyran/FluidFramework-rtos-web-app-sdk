/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { decompress } from "lz4js";
import { ISequencedDocumentMessage } from "@fluidframework/protocol-definitions";
import { assert, IsoBuffer, Uint8ArrayToString } from "@fluidframework/common-utils";
import { CompressionAlgorithms } from "../containerRuntime";
import { IMessageProcessingResult } from "./definitions";

/**
 * State machine that "unrolls" contents of compressed batches of ops after decompressing them.
 * This class relies on some implicit contracts defined below:
 * 1. A compressed batch will have its first message with batch metadata set to true and compressed set to true
 * 2. Messages in the middle of a compressed batch will have neither batch metadata nor the compression property set
 * 3. The final message of a batch will have batch metadata set to false
 * 4. An individually compressed op will have undefined batch metadata and compression set to true
 */
export class OpDecompressor {
    private activeBatch = false;
    private rootMessageContents: any | undefined;
    private processedCount = 0;

    public processMessage(message: ISequencedDocumentMessage): IMessageProcessingResult {
        // We're checking for compression = true or top level compression property so
        // that we can enable compression without waiting on all ordering services
        // to pick up protocol change. Eventually only the top level property should
        // be used.
        if (message.metadata?.batch === true
            && (message.metadata?.compressed || message.compression !== undefined)) {
            // Beginning of a compressed batch
            assert(this.activeBatch === false, 0x4b8 /* shouldn't have multiple active batches */);
            if (message.compression) {
                // lz4 is the only supported compression algorithm for now
                assert(message.compression === CompressionAlgorithms.lz4,
                    0x4b9 /* lz4 is currently the only supported compression algorithm */);
            }

            this.activeBatch = true;

            const contents = IsoBuffer.from(message.contents.packedContents, "base64");
            const decompressedMessage = decompress(contents);
            const intoString = Uint8ArrayToString(decompressedMessage);
            const asObj = JSON.parse(intoString);
            this.rootMessageContents = asObj;

            return {
                message: newMessage(message, this.rootMessageContents[this.processedCount++]),
                state: "Accepted",
            };
        }

        if (this.rootMessageContents !== undefined && message.metadata?.batch === undefined && this.activeBatch) {
            assert(message.contents === undefined, "Expecting empty message");

            // Continuation of compressed batch
            return {
                message: newMessage(message, this.rootMessageContents[this.processedCount++]),
                state: "Accepted",
            };
        }

        if (this.rootMessageContents !== undefined && message.metadata?.batch === false) {
            // End of compressed batch
            const returnMessage = newMessage(message, this.rootMessageContents[this.processedCount++]);

            this.activeBatch = false;
            this.rootMessageContents = undefined;
            this.processedCount = 0;

            return {
                message: returnMessage,
                state: "Processed",
            };
        }

        if (message.metadata?.batch === undefined &&
            (message.metadata?.compressed || message.compression === CompressionAlgorithms.lz4)) {
            // Single compressed message
            assert(this.activeBatch === false, 0x4ba /* shouldn't receive compressed message in middle of a batch */);

            const contents = IsoBuffer.from(message.contents.packedContents, "base64");
            const decompressedMessage = decompress(contents);
            const intoString = new TextDecoder().decode(decompressedMessage);
            const asObj = JSON.parse(intoString);

            return {
                message: newMessage(message, asObj[0]),
                state: "Processed",
            };
        }

        return {
            message,
            state: "Skipped",
        };
    }
}

// We should not be mutating the input message nor its metadata
const newMessage = (originalMessage: ISequencedDocumentMessage, contents: any): ISequencedDocumentMessage =>
    stripCompressionMarkers({
        ...originalMessage,
        contents,
        metadata: { ...originalMessage.metadata },
    });

// After compression, it is irrelevant to the other layers whether or not the
// original message was compressed, so in the interest of both correctness and safety
// we should remove all compression markers after we decompress.
const stripCompressionMarkers = (message: ISequencedDocumentMessage): ISequencedDocumentMessage => {
    message.compression = undefined;

    if (message.metadata?.compressed === true) {
        message.metadata.compressed = undefined;

        if (Object.keys(message.metadata).length === 0) {
            message.metadata = undefined;
        }
    }

    return message;
};
