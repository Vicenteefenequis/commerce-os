import { Router } from "express";
import { txRoute } from "../../../http/tx-route.js";
import { requireAuth } from "../../../http/middleware/require-auth.js";
import { requirePermission } from "../../authorization/infrastructure/require-permission.middleware.js";
import {
  createProductController,
  getProductController,
  listProductsController,
  setVariantPriceController,
  updateProductController,
} from "./product.controller.js";

export const productRouter = Router();

productRouter.post(
  "/products",
  requireAuth,
  requirePermission("product:manage"),
  txRoute(createProductController),
);

productRouter.get(
  "/products",
  requireAuth,
  requirePermission("product:read"),
  txRoute(listProductsController),
);

productRouter.get(
  "/products/:id",
  requireAuth,
  requirePermission("product:read"),
  txRoute(getProductController),
);

productRouter.patch(
  "/products/:id",
  requireAuth,
  requirePermission("product:manage"),
  txRoute(updateProductController),
);

productRouter.put(
  "/products/:id/variants/:variantId/price",
  requireAuth,
  requirePermission("product:manage"),
  txRoute(setVariantPriceController),
);
