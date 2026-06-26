import { Env, HttpError } from "./shared";
import { route } from './router';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (error) {
      if (error instanceof HttpError) {
        return jsonResponse(error, env);
      }
      const message = error instanceof Error ? error.message : 'Unexpected error.';
      return jsonError(500, 'internal_error', message, env);
    }
  }
};

function jsonResponse(err: HttpError, env: Env): Response {
  return json({ ok: false, code: err.code, error: err.message }, { status: err.status }, env);
}

function jsonError(status: number, code: string, message: string, env: Env): Response {
  return json({ ok: false, code, error: message }, { status }, env);
}

function json(data: unknown, init: ResponseInit = {}, env?: Env): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('access-control-allow-origin', env?.CORS_ORIGIN || '*');
  return new Response(JSON.stringify(data), { ...init, headers });
}
