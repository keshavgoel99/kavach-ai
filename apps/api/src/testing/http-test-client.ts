export interface TestHttpResponse<
  Body,
> {
  status: number;

  body: Body;

  headers:
    Headers;
}

export async function requestJson<
  Body,
>(
  baseUrl: string,

  route: string,

  expectedStatus = 200,
): Promise<
  TestHttpResponse<Body>
> {
  const response =
    await fetch(
      `${baseUrl}${route}`,
      {
        headers: {
          accept:
            'application/json',
        },
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
