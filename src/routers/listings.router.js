// src/routers/listings.router.js
import { route } from "../utils/wrap.js";
import { getListingMediaController } from "../controllers/listings.controller.js";

export default function mountListings(app) {
  app.get("/listing/media/:id",
    route({ needSession: true }, getListingMediaController)
  );
}