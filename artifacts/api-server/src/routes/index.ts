import { Router, type IRouter } from "express";
import healthRouter from "./health";
import untangleRouter from "./untangle";

const router: IRouter = Router();

router.use(healthRouter);
router.use(untangleRouter);

export default router;
