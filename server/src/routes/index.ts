import { Router, type IRouter } from "express";
import usersRouter from "./users";

const router: IRouter = Router();

router.use("/users", usersRouter);

export default router;
