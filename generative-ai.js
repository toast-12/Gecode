'use strict';

var fs = require('fs');

/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Basic error type for this SDK.
 * @public
 */
class GoogleGenerativeAIError extends Error {
    constructor(message) {
        super(`[GoogleGenerativeAI Error]: ${message}`);
    }
}

/**
 * Error class covering HTTP errors when calling the server. Includes HTTP
 * status, statusText, and optional details, if provided in the server response.
 * @public
 */
class GoogleGenerativeAIFetchError extends GoogleGenerativeAIError {
    constructor(message, status, statusText, errorDetails) {
        super(message);
        this.status = status;
        this.statusText = statusText;
        this.errorDetails = errorDetails;
    }
}

/**
 * Errors in the contents of a request originating from user input.
 * @public
 */
class GoogleGenerativeAIRequestInputError extends GoogleGenerativeAIError { }

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
const DEFAULT_API_VERSION = "v1beta";

/**
 * We can't require package.json if this runs on the web. We will use rollup to
 * swap in the version number here at build time.
 */
const PACKAGE_VERSION = "0.12.0";
const PACKAGE_LOG_HEADER = "genai-js";

var Task;
(function (Task) {
    Task["GENERATE_CONTENT"] = "generateContent";
    Task["STREAM_GENERATE_CONTENT"] = "streamGenerateContent";
    Task["COUNT_TOKENS"] = "countTokens";
    Task["EMBED_CONTENT"] = "embedContent";
    Task["BATCH_EMBED_CONTENTS"] = "batchEmbedContents";
})(Task || (Task = {}));

function getClientHeaders(requestOptions) {
    const clientHeaders = [];
    if (requestOptions?.apiClient) {
        clientHeaders.push(requestOptions.apiClient);
    }
    clientHeaders.push(`${PACKAGE_LOG_HEADER}/${PACKAGE_VERSION}`);
    return clientHeaders.join(" ");
}

var FilesTask;
(function (FilesTask) {
    FilesTask["UPLOAD"] = "upload";
    FilesTask["LIST"] = "list";
    FilesTask["GET"] = "get";
    FilesTask["DELETE"] = "delete";
})(FilesTask || (FilesTask = {}));

const taskToMethod = {
    [FilesTask.UPLOAD]: "POST",
    [FilesTask.LIST]: "GET",
    [FilesTask.GET]: "GET",
    [FilesTask.DELETE]: "DELETE",
};

class FilesRequestUrl {
    constructor(task, apiKey, requestOptions) {
        this.task = task;
        this.apiKey = apiKey;
        this.requestOptions = requestOptions;
        const apiVersion = this.requestOptions?.apiVersion || DEFAULT_API_VERSION;
        const baseUrl = this.requestOptions?.baseUrl || DEFAULT_BASE_URL;
        let initialUrl = baseUrl;
        if (this.task === FilesTask.UPLOAD) {
            initialUrl += `/upload`;
        }
        initialUrl += `/${apiVersion}/files`;
        this._url = new URL(initialUrl);
    }

    appendPath(path) {
        this._url.pathname = this._url.pathname + `/${path}`;
    }

    appendParam(key, value) {
        this._url.searchParams.append(key, value);
    }

    toString() {
        return this._url.toString();
    }
}

function getHeaders(url) {
    const headers = new Headers();
    headers.append("x-goog-api-client", getClientHeaders(url.requestOptions));
    headers.append("x-goog-api-key", url.apiKey);
    return headers;
}

async function makeFilesRequest(url, headers, body, fetchFn = fetch) {
    const requestInit = {
        method: taskToMethod[url.task],
        headers,
    };
    if (body) {
        requestInit.body = body;
    }
    const signal = getSignal(url.requestOptions);
    if (signal) {
        requestInit.signal = signal;
    }
    try {
        const response = await fetchFn(url.toString(), requestInit);
        if (!response.ok) {
            let message = "";
            let errorDetails;
            try {
                const json = await response.json();
                message = json.error.message;
                if (json.error.details) {
                    message += ` ${JSON.stringify(json.error.details)}`;
                    errorDetails = json.error.details;
                }
            } catch (e) {
                // ignored
            }
            throw new GoogleGenerativeAIFetchError(`Error fetching from ${url.toString()}: [${response.status} ${response.statusText}] ${message}`, response.status, response.statusText, errorDetails);
        } else {
            return response;
        }
    } catch (e) {
        let err = e;
        if (!(e instanceof GoogleGenerativeAIFetchError)) {
            err = new GoogleGenerativeAIError(`Error fetching from ${url.toString()}: ${e.message}`);
            err.stack = e.stack;
        }
        throw err;
    }
}

function getSignal(requestOptions) {
    if (requestOptions?.timeout >= 0) {
        const abortController = new AbortController();
        const signal = abortController.signal;
        setTimeout(() => abortController.abort(), requestOptions.timeout);
        return signal;
    }
}

class GenerativeModel {
    constructor(config) {
        // Initialize model with config
    }

    async generateContentStream({ contents }) {
        // Simulate generating content stream
        return {
            stream: this.mockStream(contents)
        };
    }

    async* mockStream(contents) {
        // Simulate a stream of responses
        for (const part of contents) {
            yield { text: () => `Generated response for: ${part.parts[1].text}` };
        }
    }
}

class GoogleGenerativeAI {
    constructor() {
        // Initialize with API key or other configurations
    }

    getGenerativeModel(config) {
        // Return an instance of the generative model
        return new GenerativeModel(config);
    }
}

class GoogleAIFileManager {
    constructor(apiKey, _requestOptions) {
        this.apiKey = apiKey;
        this._requestOptions = _requestOptions;
    }

    async uploadFile(filePath, fileMetadata) {
        const file = fs.readFileSync(filePath);
        const url = new FilesRequestUrl(FilesTask.UPLOAD, this.apiKey, this._requestOptions);
        const uploadHeaders = getHeaders(url);
        const boundary = generateBoundary();
        uploadHeaders.append("X-Goog-Upload-Protocol", "multipart");
        uploadHeaders.append("Content-Type", `multipart/related; boundary=${boundary}`);
        const uploadMetadata = getUploadMetadata(fileMetadata);
        // Multipart formatting code taken from @firebase/storage
        const metadataString = JSON.stringify({ file: uploadMetadata });
        const preBlobPart = "--" +
            boundary +
            "\r\n" +
            "Content-Type: application/json; charset=utf-8\r\n\r\n" +
            metadataString +
            "\r\n--" +
            boundary +
            "\r\n" +
            "Content-Type: " +
            fileMetadata.mimeType +
            "\r\n\r\n";
        const postBlobPart = "\r\n--" + boundary + "--";
        const blob = new Blob([preBlobPart, file, postBlobPart]);
        const response = await makeFilesRequest(url, uploadHeaders, blob);
        return response.json();
    }

    async listFiles(listParams) {
        const url = new FilesRequestUrl(FilesTask.LIST, this.apiKey, this._requestOptions);
        if (listParams?.pageSize) {
            url.appendParam("pageSize", listParams.pageSize.toString());
        }
        if (listParams?.pageToken) {
            url.appendParam("pageToken", listParams.pageToken);
        }
        const uploadHeaders = getHeaders(url);
        const response = await makeFilesRequest(url, uploadHeaders);
        return response.json();
    }

    async getFile(fileId) {
        const url = new FilesRequestUrl(FilesTask.GET, this.apiKey, this._requestOptions);
        url.appendPath(parseFileId(fileId));
        const uploadHeaders = getHeaders(url);
        const response = await makeFilesRequest(url, uploadHeaders);
        return response.json();
    }

    async deleteFile(fileId) {
        const url = new FilesRequestUrl(FilesTask.DELETE, this.apiKey, this._requestOptions);
        url.appendPath(parseFileId(fileId));
        const uploadHeaders = getHeaders(url);
        await makeFilesRequest(url, uploadHeaders);
    }
}

function parseFileId(fileId) {
    if (fileId.startsWith("files/")) {
        return fileId.split("files/")[1];
    }
    if (!fileId) {
        throw new GoogleGenerativeAIError(`Invalid fileId ${fileId}. Must be in the format "files/filename" or "filename"`);
    }
    return fileId;
}

function generateBoundary() {
    let str = "";
    for (let i = 0; i < 2; i++) {
         str = str + Math.random().toString().slice(2);  //???????????????
    }
    return str;
}

function getUploadMetadata(inputMetadata) {
    if (!inputMetadata.mimeType) {
        throw new GoogleGenerativeAIRequestInputError("Must provide a mimeType.");
    }
    const uploadMetadata = {
        mimeType: inputMetadata.mimeType,
        displayName: inputMetadata.displayName,
    };
    if (inputMetadata.name) {
        uploadMetadata.name = inputMetadata.name.includes("/")
            ? inputMetadata.name
            : `files/${inputMetadata.name}`;
    }
    return uploadMetadata;
}

/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Processing state of the File.
 * @public
 */
const FileState = {
    // The default value. This value is used if the state is omitted.
    STATE_UNSPECIFIED: "STATE_UNSPECIFIED",
    // File is being processed and cannot be used for inference yet.
    PROCESSING: "PROCESSING",
    // File is processed and available for inference.
    ACTIVE: "ACTIVE",
    // File failed processing.
    FAILED: "FAILED",
};

const HarmBlockThreshold = {
    BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH'
};

const HarmCategory = {
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT'
};

module.exports = {
    GoogleGenerativeAI,
    GoogleAIFileManager,
    FileState,
    HarmBlockThreshold,
    HarmCategory
};

