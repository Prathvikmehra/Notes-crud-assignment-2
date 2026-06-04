const express = require("express");
const {
  createNote,
  createBulkNotes,
  getAllNotes,
  getNoteById,
  replaceNote,
  updateNote,
  deleteNote,
  deleteBulkNotes,
  getNotesByCategory,
  getNotesByStatus,
  getNoteSummary,
  filterNotes,
  getPinnedNotes,
  filterByCategory,
  filterByDateRange,
  paginateNotes,
  paginateByCategory,
  sortNotes,
  sortPinnedNotes,
} = require("../controllers/note.controller");

const router = express.Router();

router.post("/bulk", createBulkNotes);
router.delete("/bulk", deleteBulkNotes);
router.get("/category/:category", getNotesByCategory);
router.get("/status/:isPinned", getNotesByStatus);
router.get("/filter", filterNotes);
router.get("/filter/pinned", getPinnedNotes);
router.get("/filter/category", filterByCategory);
router.get("/filter/date-range", filterByDateRange);
router.get("/paginate", paginateNotes);
router.get("/paginate/category/:category", paginateByCategory);
router.get("/sort", sortNotes);
router.get("/sort/pinned", sortPinnedNotes);
router.post("/", createNote);
router.get("/", getAllNotes);
router.get("/:id/summary", getNoteSummary);
router.get("/:id", getNoteById);
router.put("/:id", replaceNote);
router.patch("/:id", updateNote);
router.delete("/:id", deleteNote);

module.exports = router;
