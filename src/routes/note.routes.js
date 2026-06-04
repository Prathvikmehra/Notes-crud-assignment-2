const express = require("express");
const {
  createNote,
  createBulkNotes,
  getAllNotes,
} = require("../controllers/note.controller");

const router = express.Router();

router.post("/bulk", createBulkNotes);
router.post("/", createNote);
router.get("/", getAllNotes);

module.exports = router;
