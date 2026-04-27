import { config } from "dotenv";
import app from "./src/app.js";

config();

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Server running on localhost:${port}`);
});
