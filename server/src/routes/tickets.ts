import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import { getTickets, getTicket, assignTicket, getAssignees } from "../controllers/tickets";

const router: IRouter = Router();

router.get("/", requireAuth, getTickets);
router.get("/assignees", requireAuth, getAssignees);
router.get("/:id", requireAuth, getTicket);
router.patch("/:id/assign", requireAuth, assignTicket);

export default router;
