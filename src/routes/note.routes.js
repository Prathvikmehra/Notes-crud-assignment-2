const express = require("express");
const {
  createNote,
  createBulkNotes,
  getAllNotes,
  getNoteById,
  replaceNote,
} = require("../controllers/note.controller");

const router = express.Router();

router.post("/bulk", createBulkNotes);
router.post("/", createNote);
router.get("/", getAllNotes);
router.get("/:id", getNoteById);
router.put("/:id", replaceNote);

module.exports = router;
