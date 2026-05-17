import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-face-grid",
  description: "Selfie mosaic of the room. Tap a tile to react.",
  accentHex: "#ffd96d",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
