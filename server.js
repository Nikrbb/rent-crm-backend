const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const authRouter = require("./routes/auth");
const usersRouter = require("./routes/users");
const spotsRouter = require("./routes/spots");
const reservationsRouter = require("./routes/reservations");

app.use(cors());
app.use(express.json());

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/spots", spotsRouter);
app.use("/reservations", reservationsRouter);

app.get("/", (req, res) => {
  res.send("🚗 Parking backend работает!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
