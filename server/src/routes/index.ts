import { Router, type IRouter } from "express";
import usersRouter from "./users";
import ticketsRouter from "./tickets";
import webhooksRouter from "./webhooks";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use("/users", usersRouter);
router.use("/tickets", ticketsRouter);
router.use("/webhooks", webhooksRouter);
router.use("/dashboard", dashboardRouter);

export default router;
