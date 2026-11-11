import express from "express";
import Hello from "./Hello";
import Lab5 from "./Lab5/index";
import cors from "cors";
const app = express();
app.use(cors());
app.use(express.json())
Lab5(app);
Hello(app);
app.listen(4000);
