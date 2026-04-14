import { Router, type IRouter } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { getUsers, createUser } from "../controllers/users";

const router: IRouter = Router();

router.get("/", requireAuth, requireAdmin, getUsers);
router.post("/", requireAuth, requireAdmin, createUser);

export default router;
