const express = require("express");
const noteRoutes = require("./routes/note.routes");
const { notFound, errorHandler } = require("./middlewares/error.middleware");

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "Notes API is running",
    data: null,
  });
});

app.use("/api/notes", noteRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

