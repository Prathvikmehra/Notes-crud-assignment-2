const express = require("express");
const { createNote } = require("../controllers/note.controller");

const router = express.Router();

router.post("/", createNote);

module.exports = router;
