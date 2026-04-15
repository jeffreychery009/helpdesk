import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import { getTickets, getTicket, updateTicket, assignTicket, getAssignees, createReply, polishReply, summarizeTicket } from "../controllers/tickets";

const router: IRouter = Router();

router.get("/", requireAuth, getTickets);
router.get("/assignees", requireAuth, getAssignees);
router.get("/:id", requireAuth, getTicket);
router.patch("/:id", requireAuth, updateTicket);
router.patch("/:id/assign", requireAuth, assignTicket);
router.post("/:id/replies", requireAuth, createReply);
router.post("/:id/polish-reply", requireAuth, polishReply);
router.post("/:id/summarize", requireAuth, summarizeTicket);

export default router;
