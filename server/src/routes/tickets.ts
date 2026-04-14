import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import { getTickets, getTicket } from "../controllers/tickets";

const router: IRouter = Router();

router.get("/", requireAuth, getTickets);
router.get("/:id", requireAuth, getTicket);

export default router;
