import { Router, type IRouter } from "express";
import usersRouter from "./users";
import ticketsRouter from "./tickets";
import webhooksRouter from "./webhooks";

const router: IRouter = Router();

router.use("/users", usersRouter);
router.use("/tickets", ticketsRouter);
router.use("/webhooks", webhooksRouter);

export default router;
