import { extractAssistantContentText, parseJsonFromModelText } from './json';

export class ChatCompletionsHttpError extends Error {
	status: number;
	statusText: string;
	bodyText: string;
	url: string;

	constructor(args: { status: number; statusText: string; bodyText: string; url: string }) {
		super(`HTTP ${args.status} ${args.statusText}`);
		this.name = 'ChatCompletionsHttpError';
		this.status = args.status;
		this.statusText = args.statusText;
		this.bodyText = args.bodyText;
		this.url = args.url;
	}
}

export type ChatMessageContentPart =
	| { type: 'text'; text: string }
	| { type: 'image_url'; image_url: { url: string } };

export type ChatCompletionMessage = {
	role: 'system' | 'user' | 'assistant';
	content: string | ChatMessageContentPart[];
};

export type ChatCompletionRequest = {
	model: string;
	messages: ChatCompletionMessage[];
	temperature?: number;
	max_tokens?: number;
	stream?: boolean;
	// OpenAI-compatible JSON modes (provider-dependent)
	response_format?: unknown;
};

export type ModelEndpointConfig = {
	baseUrl: string;
	apiKey: string;
	model: string;
};

const ensureTrailingSlash = (url: string) => {
	return url.endsWith('/') ? url : `${url}/`;
};

export const buildChatCompletionsUrl = (baseUrlRaw: string) => {
	const baseUrl = baseUrlRaw.trim().replace(/\/+$/, '');
	if (!baseUrl) {
		throw new Error('Base URL 不能为空');
	}

	// If the user already pasted the full endpoint, use it as-is.
	if (/\/v1\/chat\/completions$/i.test(baseUrl) || /\/chat\/completions$/i.test(baseUrl)) {
		return baseUrl;
	}

	// Allow users to input either:
	// - https://host
	// - https://host/openai
	// - https://host/v1
	const hasV1 = /\/v1$/i.test(baseUrl);
	const finalBase = ensureTrailingSlash(baseUrl);
	return new URL(hasV1 ? 'chat/completions' : 'v1/chat/completions', finalBase).toString();
};

export const callChatCompletions = async (
	config: ModelEndpointConfig,
	payload: Omit<ChatCompletionRequest, 'model'> & { model?: string }
): Promise<unknown> => {
	const url = buildChatCompletionsUrl(config.baseUrl);
	const model = payload.model ?? config.model;
	if (!model) {
		throw new Error('Model name 不能为空');
	}

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};
	if (config.apiKey.trim()) {
		headers.Authorization = `Bearer ${config.apiKey.trim()}`;
	}

	const res = await fetch(url, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			...payload,
			model,
		} satisfies ChatCompletionRequest),
	});

	const text = await res.text();
	if (!res.ok) {
		throw new ChatCompletionsHttpError({
			status: res.status,
			statusText: res.statusText,
			bodyText: text,
			url,
		});
	}

	const contentType = res.headers.get('content-type') ?? '';
	const looksLikeSse =
		contentType.includes('text/event-stream') || text.trimStart().startsWith('data:');

	const sseToChatCompletion = (sseText: string): unknown => {
		// Convert OpenAI-style SSE chunks into a single ChatCompletion-like object.
		// Input example:
		// data: {"object":"chat.completion.chunk","choices":[{"delta":{"content":"..."}}]}
		// ...
		// data: [DONE]

		type ChunkChoice = {
			index?: number;
			delta?: { role?: string; content?: string };
			finish_reason?: string;
		};
		type Chunk = {
			id?: string;
			object?: string;
			created?: number;
			model?: string;
			choices?: ChunkChoice[];
			usage?: unknown;
		};

		let id: string | undefined;
		let modelName: string | undefined;
		let created: number | undefined;
		let usage: unknown;

		const contentByIndex = new Map<number, string>();
		const roleByIndex = new Map<number, string>();
		const finishReasonByIndex = new Map<number, string>();

		const lines = sseText.split(/\r?\n/);
		for (const lineRaw of lines) {
			const line = lineRaw.trim();
			if (!line.startsWith('data:')) {
				continue;
			}
			const data = line.slice('data:'.length).trim();
			if (!data || data === '[DONE]') {
				continue;
			}

			let chunk: Chunk;
			try {
				chunk = JSON.parse(data) as Chunk;
			} catch {
				continue;
			}

			id = chunk.id ?? id;
			modelName = chunk.model ?? modelName;
			created = chunk.created ?? created;
			usage = chunk.usage ?? usage;

			if (!Array.isArray(chunk.choices)) {
				continue;
			}

			for (const c of chunk.choices) {
				const index = typeof c.index === 'number' ? c.index : 0;
				const delta = c.delta;
				if (delta?.role) {
					roleByIndex.set(index, delta.role);
				}
				if (typeof delta?.content === 'string' && delta.content.length > 0) {
					contentByIndex.set(index, (contentByIndex.get(index) ?? '') + delta.content);
				}
				if (typeof c.finish_reason === 'string' && c.finish_reason) {
					finishReasonByIndex.set(index, c.finish_reason);
				}
			}
		}

		const indices = [...contentByIndex.keys()];
		if (indices.length === 0) {
			indices.push(0);
		}
		indices.sort((a, b) => a - b);

		return {
			id: id ?? 'chatcmpl-stream',
			object: 'chat.completion',
			created: created ?? Math.floor(Date.now() / 1000),
			model: modelName ?? model,
			choices: indices.map((i) => ({
				index: i,
				message: {
					role: roleByIndex.get(i) ?? 'assistant',
					content: contentByIndex.get(i) ?? '',
				},
				finish_reason: finishReasonByIndex.get(i) ?? 'stop',
			})),
			usage,
		};
	};

	if (looksLikeSse) {
		return sseToChatCompletion(text);
	}

	try {
		return JSON.parse(text) as unknown;
	} catch (err) {
		// Some providers stream chunks but forget to set content-type.
		if (text.trimStart().startsWith('data:')) {
			return sseToChatCompletion(text);
		}
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`模型响应不是合法 JSON: ${message}`);
	}
};

export const callChatCompletionsForText = async (
	config: ModelEndpointConfig,
	payload: Omit<ChatCompletionRequest, 'model'> & { model?: string }
): Promise<{ rawResponse: unknown; contentText: string }> => {
	const rawResponse = await callChatCompletions(config, payload);
	const contentText = extractAssistantContentText(rawResponse);
	return { rawResponse, contentText };
};

export const callChatCompletionsForJson = async (
	config: ModelEndpointConfig,
	payload: Omit<ChatCompletionRequest, 'model'> & { model?: string }
): Promise<{
	rawResponse: unknown;
	contentText: string;
	json: unknown;
}> => {
	const run = async (p: Omit<ChatCompletionRequest, 'model'> & { model?: string }) => {
		const rawResponse = await callChatCompletions(config, p);
		const contentText = extractAssistantContentText(rawResponse);
		const json = parseJsonFromModelText(contentText);
		return { rawResponse, contentText, json };
	};

	try {
		return await run(payload);
	} catch (err) {
		// Avoid double-requests on output/parse errors.
		// Only retry when the server rejects response_format (common 400/422).
		if (payload.response_format !== undefined && err instanceof ChatCompletionsHttpError) {
			const body = (err.bodyText ?? '').toLowerCase();
			const mentionsResponseFormat = body.includes('response_format') || body.includes('json_object');
			const retryableStatus = err.status === 400 || err.status === 422;
			if (retryableStatus && mentionsResponseFormat) {
				return await run({ ...payload, response_format: undefined });
			}
		}
		throw err;
	}
};
