import { createApp } from "./app";

const port = Number(Bun.env.PORT ?? 3001);

createApp().listen(port, ({ hostname, port: actualPort }) => {
  console.log(`agent-worth api listening at http://${hostname}:${actualPort}`);
});

