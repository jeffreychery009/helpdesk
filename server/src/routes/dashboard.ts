import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import { getStats } from "../controllers/dashboard";

const router: IRouter = Router();

router.get("/stats", requireAuth, getStats);

export default router;
