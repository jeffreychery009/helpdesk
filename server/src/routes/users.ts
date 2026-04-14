import { Router, type IRouter } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { getUsers, createUser, updateUser, deleteUser } from "../controllers/users";

const router: IRouter = Router();

router.get("/", requireAuth, requireAdmin, getUsers);
router.post("/", requireAuth, requireAdmin, createUser);
router.put("/:id", requireAuth, requireAdmin, updateUser);
router.delete("/:id", requireAuth, requireAdmin, deleteUser);

export default router;
