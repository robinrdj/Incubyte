import { Router } from "express";
import type { SettingsService } from "../services/settings-service.js";
import { payBandKeySchema, saveFxRateSchema, savePayBandSchema } from "./schemas.js";

/** HR-maintained settings: dated FX rates and pay bands. */
export function createSettingsRouter(service: SettingsService): Router {
  const router = Router();

  router.get("/settings/fx-rates", async (_req, res) => {
    res.json(await service.listFxRates());
  });

  router.put("/settings/fx-rates", async (req, res) => {
    const input = saveFxRateSchema.parse(req.body);
    res.json(await service.saveFxRate(input));
  });

  router.get("/settings/pay-bands", async (_req, res) => {
    res.json({ items: await service.listPayBands() });
  });

  router.put("/settings/pay-bands/:countryCode/:levelCode", async (req, res) => {
    const key = payBandKeySchema.parse(req.params);
    const input = savePayBandSchema.parse(req.body);
    res.json(await service.savePayBand(key.countryCode, key.levelCode, input));
  });

  return router;
}
