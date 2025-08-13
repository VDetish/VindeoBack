import { createApp } from "./src/app.js";

const port = process.env.PORT || 9002;

createApp().listen(port, (token) => {
  console.log(token ? `Listening on ${port}` : `Failed to listen on ${port}`);
});