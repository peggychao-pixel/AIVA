import { Router, type IRouter } from "express";
import healthRouter from "./health";
import untangleRouter from "./untangle";
import analyzerRouter from "./analyzer";

const router: IRouter = Router();

router.use(healthRouter);
router.use(untangleRouter);
router.use(analyzerRouter);

export default router;
