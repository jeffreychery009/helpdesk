import { Router, type IRouter } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { getUsers, createUser, updateUser } from "../controllers/users";

const router: IRouter = Router();

router.get("/", requireAuth, requireAdmin, getUsers);
router.post("/", requireAuth, requireAdmin, createUser);
router.put("/:id", requireAuth, requireAdmin, updateUser);

export default router;
