type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => {
	return typeof value === 'object' && value !== null;
};

const isString = (value: unknown): value is string => {
	return typeof value === 'string';
};

const stripCodeFences = (text: string) => {
	const trimmed = text.trim();
	if (!trimmed.startsWith('```')) {
		return trimmed;
	}

	// Common model behavior: wrap JSON in ```json ... ```
	const lines = trimmed.split(/\r?\n/);
	if (lines.length < 2) {
		return trimmed;
	}

	// Remove first line (``` or ```json)
	const withoutFirst = lines.slice(1);
	// Remove last line if it's ```
	const last = withoutFirst[withoutFirst.length - 1]?.trim();
	const withoutLast = last === '```' ? withoutFirst.slice(0, -1) : withoutFirst;
	return withoutLast.join('\n').trim();
};

export const extractAssistantContentText = (response: unknown): string => {
	if (!isRecord(response)) {
		throw new Error('模型响应不是对象');
	}

	const choices = response.choices;
	if (!Array.isArray(choices) || choices.length === 0) {
		throw new Error('模型响应缺少 choices');
	}

	const choice0 = choices[0];
	if (!isRecord(choice0)) {
		throw new Error('choices[0] 不是对象');
	}

	const message = choice0.message;
	if (!isRecord(message)) {
		throw new Error('choices[0].message 不是对象');
	}

	const content = message.content;
	if (isString(content)) {
		return content;
	}

	// Some providers may return structured content; fall back to JSON string.
	return JSON.stringify(content);
};

export const parseJsonFromModelText = (text: string): unknown => {
	const cleaned = stripCodeFences(text);
	try {
		return JSON.parse(cleaned) as unknown;
	} catch (err) {
		const excerpt = cleaned.length > 800 ? `${cleaned.slice(0, 800)}...` : cleaned;
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`无法解析模型输出为 JSON: ${message}\n\n原文片段:\n${excerpt}`);
	}
};
