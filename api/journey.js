export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  let body = req.body;
  if (typeof body === "string") {
    body = JSON.parse(body);
  }

  const response = await fetch(
    "https://api.entur.io/journey-planner/v3/graphql",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ET-Client-Name": "boligsjekk-privat",
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();
  res.status(200).json(data);
}
