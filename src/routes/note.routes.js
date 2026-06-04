const express = require("express");
const { createNote, createBulkNotes } = require("../controllers/note.controller");

const router = express.Router();

router.post("/bulk", createBulkNotes);
router.post("/", createNote);

module.exports = router;
