import uWS from "uWebSockets.js";
import mountFeed from "./routers/feed.router.js";
import mountListings from "./routers/listings.router.js";

export function createApp() {
  const app = uWS.App();

  // ws/… тут по желанию

  mountFeed(app);
  mountListings(app);

  // health-check
  app.get("/health", (res, req) => {
    res.writeStatus("200 OK").end("OK");
  });

  return app;
}