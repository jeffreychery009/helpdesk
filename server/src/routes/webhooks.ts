import { Router, type IRouter } from "express";
import { inboundEmail } from "../controllers/webhooks";

const router: IRouter = Router();

router.post("/inbound-email", inboundEmail);

export default router;
