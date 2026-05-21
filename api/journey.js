export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { fromLat, fromLon, toLat, toLon, dateTime } = req.body;

  const query = `{
    trip(
      from: { coordinates: { latitude: ${fromLat}, longitude: ${fromLon} } }
      to: { coordinates: { latitude: ${toLat}, longitude: ${toLon} } }
      dateTime: "${dateTime}"
      numTripPatterns: 3
      transportModes: [
        { transportMode: bus }
        { transportMode: rail }
        { transportMode: metro }
        { transportMode: tram }
      ]
    ) {
      tripPatterns { duration }
    }
  }`;

  const response = await fetch(
    "https://api.entur.io/journey-planner/v3/graphql",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ET-Client-Name": "bthansen-boligsjekk",
      },
      body: JSON.stringify({ query }),
    }
  );

  const data = await response.json();
  res.status(200).json(data);
}
