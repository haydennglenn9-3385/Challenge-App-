import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  // Allow Wix domain
  const allowedOrigins = [
    "https://www.queersandalliesfitness.com",
    "https://queersandalliesfitness.com"
  ];

  if (!allowedOrigins.includes(origin || "")) {
    return new Response("Not allowed", { status: 403 });
  }

  const { wixId } = await req.json();

  if (!wixId) {
    return new Response(JSON.stringify({ error: "Missing wixId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const token = jwt.sign(
    { wixId },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );

  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin
    }
  });
}

// Handle preflight
export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");

  const allowedOrigins = [
    "https://www.queersandalliesfitness.com",
    "https://queersandalliesfitness.com"
  ];

  if (!allowedOrigins.includes(origin || "")) {
    return new Response("Not allowed", { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
