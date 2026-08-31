import { Router } from "express";
import { txRoutePublic } from "../../../http/tx-route.js";
import { submitLeadController } from "./lead.controller.js";

export const leadRouter = Router();

// Public: no tenant/identity context exists for a prospective establishment
// (spec: marketing/lead-capture - leads are not tenant-scoped).
leadRouter.post("/leads", txRoutePublic(submitLeadController));
