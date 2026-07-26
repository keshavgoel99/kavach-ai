export interface TestHttpResponse<
  Body,
> {
  status: number;

  body: Body;

  headers:
    Headers;
}

export interface TestHttpRequestOptions
  extends RequestInit {
  omitDefaultAuthorization?:
    boolean;
}

let defaultAccessToken:
  string | null = null;

export function setDefaultTestAccessToken(
  accessToken:
    string | null,
): void {
  defaultAccessToken =
    accessToken;
}

export async function requestJson<
  Body,
>(
  baseUrl: string,

  route: string,

  expectedStatus = 200,

  suppliedOptions:
    TestHttpRequestOptions = {},
): Promise<
  TestHttpResponse<Body>
> {
  const {
    omitDefaultAuthorization =
      false,

    ...requestOptions
  } =
    suppliedOptions;

  const headers =
    new Headers(
      requestOptions.headers,
    );

  headers.set(
    'accept',
    'application/json',
  );

  if (
    defaultAccessToken &&
    !omitDefaultAuthorization &&
    !headers.has(
      'authorization',
    )
  ) {
    headers.set(
      'authorization',
      `Bearer ${defaultAccessToken}`,
    );
  }

  const response =
    await fetch(
      `${baseUrl}${route}`,
      {
        ...requestOptions,
        headers,
      },
    );

  const responseText =
    await response.text();

  let body:
    unknown = null;

  if (
    responseText.trim()
  ) {
    try {
      body =
        JSON.parse(
          responseText,
        ) as unknown;
    } catch {
      throw new Error(
        [
          'API returned invalid JSON for',
          route,
          `with status ${response.status}.`,
          responseText.slice(
            0,
            500,
          ),
        ].join(' '),
      );
    }
  }

  if (
    response.status !==
    expectedStatus
  ) {
    throw new Error(
      [
        `Expected status ${expectedStatus}`,
        `for ${route},`,
        `received ${response.status}.`,
        JSON.stringify(body),
      ].join(' '),
    );
  }

  return {
    status:
      response.status,

    body:
      body as Body,

    headers:
      response.headers,
  };
}
