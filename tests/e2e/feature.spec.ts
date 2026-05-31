import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("stub face on A → B sees tile with alice's name", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");
    await a.waitForTimeout(500);

    await a.getByRole("button", { name: "use stub face", exact: true }).click();
    await b.waitForTimeout(400);

    await expect(b.locator('.face-tile[data-peer-name="alice"]')).toBeVisible();
  } finally {
    await cleanup();
  }
});

/**
 * The other half of the advertised claim — "Tap a tile to react." A reaction is
 * the cross-peer promise: when peer B taps a reaction on peer A's tile, the
 * count must propagate through the shared `useReactions` Y.Map so peer A sees
 * it on A's own tile. The selfie image itself is camera hardware (we use the
 * stub-face fallback), but grid membership AND reaction propagation are the
 * testable peer→peer interactions.
 *
 * This drives the reaction on B and reads the resulting count back on A — the
 * opposite peer — proving the reaction genuinely crossed the mesh, not just
 * that B updated its own local React state.
 */
test("reaction tapped on A's tile by B is visible to A", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");
    await a.waitForTimeout(500);

    // A joins the mosaic with a tile (stub face stands in for the camera selfie).
    await a.getByRole("button", { name: "use stub face", exact: true }).click();

    // B must see alice's tile before it can react to it.
    const aliceTileOnB = b.locator('.face-tile[data-peer-name="alice"]');
    await expect(aliceTileOnB).toBeVisible({ timeout: 4000 });

    // B opens alice's tile and taps the 👍 reaction.
    await aliceTileOnB.locator(".face-tile-btn").click();
    await aliceTileOnB.getByRole("button", { name: "👍" }).click();

    // The load-bearing cross-peer assertion: A opens its OWN tile and the 👍
    // reaction count B published shows up — the reaction crossed the mesh.
    const aliceTileOnA = a.locator('.face-tile[data-peer-name="alice"]');
    await aliceTileOnA.locator(".face-tile-btn").click();
    await expect(aliceTileOnA.locator(".face-react", { hasText: "👍" }).locator("em")).toHaveText(
      "1",
      { timeout: 4000 },
    );
  } finally {
    await cleanup();
  }
});
