import client from "./client";


export async function calculateCo2({ distances }) {
  const res = await client.post("/maps/calculate-co2", { distances });
  return res.data;
}
