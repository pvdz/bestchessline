import { createPracticeAiServer } from "./practice-ai-server.js";
export function startServer(port = 8787) {
  const srv = createPracticeAiServer(port);
  srv.listen(port, () => {
    console.log(
      `[server] Practice AI server listening on http://localhost:${port}`,
    );
  });
  return srv;
}
//# sourceMappingURL=server.js.map
