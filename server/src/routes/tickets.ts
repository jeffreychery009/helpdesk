import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import { getTickets, getTicket, updateTicket, assignTicket, getAssignees, createReply } from "../controllers/tickets";

const router: IRouter = Router();

router.get("/", requireAuth, getTickets);
router.get("/assignees", requireAuth, getAssignees);
router.get("/:id", requireAuth, getTicket);
router.patch("/:id", requireAuth, updateTicket);
router.patch("/:id/assign", requireAuth, assignTicket);
router.post("/:id/replies", requireAuth, createReply);

export default router;
