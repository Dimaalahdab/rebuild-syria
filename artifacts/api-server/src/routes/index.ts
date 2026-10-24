import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import usersRouter from "./users";
import reportsRouter from "./reports";
import projectsRouter from "./projects";
import adminRouter from "./admin";
import imagesRouter from "./images";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(usersRouter);
router.use(reportsRouter);
router.use(projectsRouter);
router.use(adminRouter);
router.use(imagesRouter);

export default router;
