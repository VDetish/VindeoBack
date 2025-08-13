// src/routers/feed.router.js
import { route } from "../utils/wrap.js";
import { getFeedController, postFeedEventController } from "../controllers/feed.controller.js";

export default function mountFeed(app) {
  app.get("/feed",
    route({ needSession: true }, getFeedController)
  );

  app.post("/feed/event",
    route({ needSession: true, parseJson: true }, postFeedEventController)
  );
}