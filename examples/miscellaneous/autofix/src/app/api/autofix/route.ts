import { AutofixError, requestAutofix } from "@/lib/autofix";
import { inputSchema } from "@/lib/contract";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a valid JSON request." }, { status: 400 });
  }

  const input = inputSchema.safeParse(body);
  if (!input.success)
    return Response.json({ error: input.error.issues[0].message }, { status: 400 });

  const apiKey = process.env.THESYS_API_KEY;
  if (!apiKey || apiKey === "sk-th-...") {
    return Response.json(
      { error: "Add THESYS_API_KEY to .env.local and restart the server to run Autofix." },
      { status: 503 },
    );
  }

  try {
    const completion = await requestAutofix(input.data, {
      apiKey,
      url: process.env.AUTOFIX_API_URL,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(90_000)]),
    });
    return Response.json(completion, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AutofixError)
      return Response.json({ error: error.message }, { status: error.status });
    const timedOut =
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return Response.json(
      {
        error: timedOut
          ? "The request timed out or was cancelled. You can try again."
          : "Could not reach Autofix. Check the server connection and try again.",
      },
      { status: timedOut ? 504 : 502 },
    );
  }
}
