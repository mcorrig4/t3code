export function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function expectNoBlockedHost(bodyText) {
  if (bodyText.includes("Blocked request. This host")) {
    throw new Error("Vite blocked the dev hostname.");
  }
}

export async function expectJsonResponse(response, label) {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${label} failed with status ${response.status}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(
      `${label} was not valid JSON: ${error instanceof Error ? error.message : "unknown error"}`,
      { cause: error },
    );
  }
}
