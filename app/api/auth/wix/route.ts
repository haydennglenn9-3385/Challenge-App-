import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  const { wixId } = await req.json();

  if (!wixId) {
    return new Response(JSON.stringify({ error: "Missing wixId" }), { status: 400 });
  }

  const token = jwt.sign(
    { wixId },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );

  return new Response(JSON.stringify({ token }), {
    headers: { "Content-Type": "application/json" }
  });
}
