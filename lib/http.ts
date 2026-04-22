import { NextResponse } from "next/server";

const NO_STORE_VALUE = "no-store, max-age=0";

function withNoStoreHeaders(headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Cache-Control", NO_STORE_VALUE);
  responseHeaders.set("Pragma", "no-cache");
  responseHeaders.set("Expires", "0");
  return responseHeaders;
}

export function jsonNoStore(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: withNoStoreHeaders(init?.headers)
  });
}

export function textNoStore(body: string, init?: ResponseInit) {
  return new Response(body, {
    ...init,
    headers: withNoStoreHeaders(init?.headers)
  });
}
