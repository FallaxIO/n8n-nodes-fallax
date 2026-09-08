import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * The one place this package talks HTTP.
 *
 * Everything the Fallax API does that a node has to care about lives here: the
 * origin off the credential with the API version appended to it, the error shape
 * unwrapped into something an n8n user can read, and cursor paging turned into a
 * plain array. The nodes themselves then contain no transport at all, which is
 * what keeps the trigger and the action node from drifting apart on details like
 * how `since` is spelled.
 */

type Context = IExecuteFunctions | IPollFunctions | ILoadOptionsFunctions;

export type PagedResponse<T> = {
	data: T[];
	nextCursor: string | null;
	hasMore: boolean;
};

export async function fallaxApiRequest(
	this: Context,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('fallaxApi');
	const baseUrl = String(credentials.baseUrl ?? 'https://api.fallax.io').replace(/\/+$/, '');

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(this, 'fallaxApi', {
			method,
			url: `${baseUrl}/v1${endpoint}`,
			body: Object.keys(body).length > 0 ? body : undefined,
			qs,
			json: true,
		})) as IDataObject;
	} catch (error) {
		// The API answers `{ error: { code, message } }`, and the message is
		// written for whoever is reading it. Surfacing that beats n8n's generic
		// "The service was not able to process your request".
		const responseBody = (error as { response?: { body?: { error?: { message?: string } } } })
			.response?.body;
		const message = responseBody?.error?.message;
		throw new NodeApiError(this.getNode(), error as never, message ? { message } : undefined);
	}
}

/**
 * Follow `nextCursor` until the API stops offering one, or until `limit` rows
 * have been collected.
 *
 * The cap is not optional: a workflow that asks for every event in a two-year
 * programme and gets it will run n8n out of memory, and the person who wrote it
 * will blame the node. `returnAll` raises the cap rather than removing it.
 */
export async function fallaxApiRequestAllItems(
	this: Context,
	endpoint: string,
	qs: IDataObject = {},
	limit = Number.POSITIVE_INFINITY,
): Promise<IDataObject[]> {
	const items: IDataObject[] = [];
	let cursor: string | null = null;

	do {
		const perPage = Math.min(200, limit - items.length);
		const response = (await fallaxApiRequest.call(this, 'GET', endpoint, {}, {
			...qs,
			limit: Number.isFinite(perPage) ? perPage : 200,
			...(cursor ? { cursor } : {}),
		})) as unknown as PagedResponse<IDataObject>;

		items.push(...response.data);
		cursor = response.nextCursor;
	} while (cursor && items.length < limit);

	return items.length > limit ? items.slice(0, limit) : items;
}
