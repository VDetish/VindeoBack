// src/controllers/listings.controller.js
import { getListingMedia } from "../repos/listings.repo.js";
import { sendJson } from "../utils/sendJson.js";

export async function getListingMediaController({ session, params }) {
  const id = Number(params[0] || 0);
  if (!id) return { status: 400, json: { ok: false, error: "bad listing id" } };

  const items = await getListingMedia(id);
  return { json: { ok: true, items } };
}